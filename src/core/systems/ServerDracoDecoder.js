import { Worker } from 'node:worker_threads'
import { readFile } from 'node:fs/promises'

const NH = `
const { parentPort } = require('worker_threads');
const self = globalThis;
var onmessage;
self.postMessage = function(data, transferList) {
  parentPort.postMessage(data, transferList);
};
parentPort.on('message', function(data) {
  if (typeof onmessage === 'function') {
    onmessage({ data: data });
  }
});
`

const WB = `
let decoderConfig, decoderPending;
onmessage = function(e) {
  const message = e.data;
  switch (message.type) {
    case 'init':
      decoderConfig = message.decoderConfig;
      decoderPending = new Promise(function(resolve) {
        decoderConfig.onModuleLoaded = function(draco) {
          resolve({ draco: draco });
        };
        DracoDecoderModule(decoderConfig);
      });
      break;
    case 'decode': {
      const buffer = message.buffer;
      const taskConfig = message.taskConfig;
      decoderPending.then(function(module) {
        const draco = module.draco;
        const decoder = new draco.Decoder();
        try {
          const geometry = decodeGeometry(draco, decoder, new Int8Array(buffer), taskConfig);
          const buffers = Object.values(geometry.attributes).map(function(attr) { return attr.array.buffer; });
          if (geometry.index) buffers.push(geometry.index.array.buffer);
          self.postMessage({ type: 'decode', id: message.id, geometry }, buffers);
        } catch (error) {
          console.error(error);
          self.postMessage({ type: 'error', id: message.id, error: error.message });
        } finally {
          draco.destroy(decoder);
        }
      });
      break;
    }
  }
};
function decodeGeometry(draco, decoder, array, taskConfig) {
  const aI = taskConfig.attributeIDs;
  const aT = taskConfig.attributeTypes;
  let dracoGeometry, decodingStatus;
  const gt = decoder.GetEncodedGeometryType(array);
  if (gt === draco.TRIANGULAR_MESH) {
    dracoGeometry = new draco.Mesh();
    decodingStatus = decoder.DecodeArrayToMesh(array, array.byteLength, dracoGeometry);
  } else if (gt === draco.POINT_CLOUD) {
    dracoGeometry = new draco.PointCloud();
    decodingStatus = decoder.DecodeArrayToPointCloud(array, array.byteLength, dracoGeometry);
  } else {
    throw new Error('THREE.DRACOLoader: Unexpected geometry type.');
  }
  if (!decodingStatus.ok() || dracoGeometry.ptr === 0) {
    throw new Error('THREE.DRACOLoader: Decoding failed: ' + decodingStatus.error_msg());
  }
  const geometry = { index: null, attributes: {} };
  for (const name in aI) {
    const attrType = self[aT[name]];
    let attribute, attributeID;
    if (taskConfig.useUniqueIDs) {
      attributeID = aI[name];
      attribute = decoder.GetAttributeByUniqueId(dracoGeometry, attributeID);
    } else {
      attributeID = decoder.GetAttributeId(dracoGeometry, draco[aI[name]]);
      if (attributeID === -1) continue;
      attribute = decoder.GetAttribute(dracoGeometry, attributeID);
    }
    const result = decodeAttribute(draco, decoder, dracoGeometry, name, attrType, attribute);
    if (name === 'color') result.vertexColorSpace = taskConfig.vertexColorSpace;
    geometry.attributes[name] = result;
  }
  if (gt === draco.TRIANGULAR_MESH) {
    geometry.index = decodeIndex(draco, decoder, dracoGeometry);
  }
  draco.destroy(dracoGeometry);
  return geometry;
}
function decodeIndex(draco, decoder, dracoGeometry) {
  const numFaces = dracoGeometry.num_faces();
  const numIndices = numFaces * 3;
  const byteLength = numIndices * 4;
  const ptr = draco._malloc(byteLength);
  decoder.GetTrianglesUInt32Array(dracoGeometry, byteLength, ptr);
  const index = new Uint32Array(draco.HEAPF32.buffer, ptr, numIndices).slice();
  draco._free(ptr);
  return { array: index, itemSize: 1 };
}
function decodeAttribute(draco, decoder, dracoGeometry, attributeName, attributeType, attribute) {
  const nc = attribute.num_components();
  const np = dracoGeometry.num_points();
  const nv = np * nc;
  const bl = nv * attributeType.BYTES_PER_ELEMENT;
  const dt = getDracoDataType(draco, attributeType);
  const ptr = draco._malloc(bl);
  decoder.GetAttributeDataArrayForAllPoints(dracoGeometry, attribute, dt, bl, ptr);
  const array = new attributeType(draco.HEAPF32.buffer, ptr, nv).slice();
  draco._free(ptr);
  return { name: attributeName, array: array, itemSize: nc };
}
function getDracoDataType(draco, attributeType) {
  switch (attributeType) {
    case Float32Array: return draco.DT_FLOAT32;
    case Int8Array: return draco.DT_INT8;
    case Int16Array: return draco.DT_INT16;
    case Int32Array: return draco.DT_INT32;
    case Uint8Array: return draco.DT_UINT8;
    case Uint16Array: return draco.DT_UINT16;
    case Uint32Array: return draco.DT_UINT32;
  }
}
`

export class ServerDracoDecoder {
  constructor() {
    this.decoderPath = ''
    this._worker = null
    this._taskId = 0
    this._callbacks = {}
    this._ready = null
  }

  setDecoderPath(path) {
    this.decoderPath = path
  }

  async _getWorker() {
    if (this._worker) return this._worker
    const [wrapperText, wasmBinary] = await Promise.all([
      this._load(this.decoderPath + 'draco_wasm_wrapper.js', 'text'),
      this._load(this.decoderPath + 'draco_decoder.wasm', 'arraybuffer'),
    ])
    const code = NH + '\n/* draco decoder */\n' + wrapperText + '\n\n/* worker */\n' + WB
    const worker = new Worker(code, { eval: true })
    worker.on('message', (message) => {
      const cb = this._callbacks[message.id]
      if (!cb) return
      if (message.type === 'decode') cb.resolve(message.geometry)
      else if (message.type === 'error') cb.reject(new Error(message.error))
    })
    worker.on('error', (error) => console.error('ServerDracoDecoder error:', error))
    worker.postMessage({ type: 'init', decoderConfig: { wasmBinary } })
    this._worker = worker
    return worker
  }

  preload() {
    if (!this._ready) this._ready = this._getWorker()
    return this._ready
  }

  async _load(url, type) {
    const buf = await readFile(new URL(url))
    if (type === 'text') return buf.toString()
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  }

  decodeDracoFile(buffer, callback, attributeIDs, attributeTypes, useUniqueIDs, reject) {
    const taskConfig = { attributeIDs, attributeTypes, useUniqueIDs }
    const taskId = ++this._taskId
    this._getWorker().then((worker) => {
      this._callbacks[taskId] = {
        resolve: (geometry) => {
          geometry.setAttribute = (name, accessor) => { geometry.attributes[name] = accessor }
          geometry.morphAttributes = geometry.morphAttributes || {}
          callback(geometry)
        },
        reject: reject || ((error) => {
          console.error('ServerDracoDecoder decode error:', error)
          callback({ index: null, attributes: [] })
        }),
      }
      worker.postMessage({ type: 'decode', id: taskId, taskConfig, buffer }, [buffer])
    })
  }
}
