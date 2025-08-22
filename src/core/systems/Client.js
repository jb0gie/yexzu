import EventEmitter from 'eventemitter3'
import { isBoolean, isNumber } from 'lodash-es'

import { System } from './System'
import { storage } from '../storage'

import * as THREE from '../extras/three'
import { initYoga } from '../extras/yoga'

/**
 * Client System
 *
 * - Runs on the client
 * - Connects to the server
 * - Receives snapshots and spawns entities
 * - Sends and receives events and state updates
 *
 */
export class Client extends System {
  constructor(world) {
    super(world)
    this.storage = storage
    this.settings = new Settings(this)
    window.world = world
    window.THREE = THREE
  }

  async init({ loadYoga }) {
    await loadYoga
    initYoga()
  }

  start() {
    this.world.graphics.renderer.setAnimationLoop(this.world.tick)
    document.addEventListener('visibilitychange', this.onVisibilityChange)
  }

  preFixedUpdate() {
    this.settings.update()
  }

  onVisibilityChange = () => {
    // if the tab is no longer active, browsers stop triggering requestAnimationFrame.
    // this is obviously bad because physics stop running and we stop processing websocket messages etc.
    // instead, we stop using requestAnimationFrame and get a worker to tick at a slower rate using setInterval
    // and notify us.
    // this allows us to keep everything running smoothly.
    // See: https://gamedev.stackexchange.com/a/200503 (kinda fucking genius)
    if (document.hidden) {
      // spawn worker if we haven't yet
      if (!this.worker) {
        const script = `
          const rate = 1000 / 5 // 5 FPS
          let intervalId = null;
          self.onmessage = e => {
            if (e.data === 'start' && !intervalId) {
              intervalId = setInterval(() => {
                self.postMessage(1);
              }, rate);
              console.log('[worker] tick started')
            }
            if (e.data === 'stop' && intervalId) {
              clearInterval(intervalId);
              intervalId = null;
              console.log('[worker] tick stopped')
            }
          }
        `
        const blob = new Blob([script], { type: 'application/javascript' })
        this.worker = new Worker(URL.createObjectURL(blob))
        this.worker.onmessage = () => {
          const time = performance.now()
          this.world.tick(time)
        }
      }
      // stop rAF
      this.world.graphics.renderer.setAnimationLoop(null)
      // tell the worker to start
      this.worker.postMessage('start')
    } else {
      // tell the worker to stop
      this.worker.postMessage('stop')
      // resume rAF
      this.world.graphics.renderer.setAnimationLoop(this.world.tick)
    }
  }
}

class Settings extends EventEmitter {
  constructor(client) {
    super()
    this.client = client

    const data = this.client.storage.get('settings', {})
    const isQuest = /OculusBrowser/.test(navigator.userAgent)
    const isTouch = navigator.userAgent.match(/OculusBrowser|iPhone|iPad|iPod|Android/i)

    this.pixelRatio = isNumber(data.pixelRatio) ? data.pixelRatio : isTouch ? 1.5 : 1 // 0 will use window.devicePixelRatio
    this.shadows = data.shadows ? data.shadows : isQuest ? 'low' : 'high' // none, low=1, med=2048cascade, high=4096cascade
    this.postprocessing = isBoolean(data.postprocessing) ? data.postprocessing : true
    this.bloom = isBoolean(data.bloom) ? data.bloom : true

    this.changes = null
  }

  modify(key, value) {
    if (this[key] === value) return
    const prev = this[key]
    this[key] = value
    if (!this.changes) this.changes = {}
    if (!this.changes[key]) this.changes[key] = { prev, value: null }
    this.changes[key].value = value
    this.persist()
  }

  persist() {
    this.client.storage.set('settings', {
      pixelRatio: this.pixelRatio,
      shadows: this.shadows,
      postprocessing: this.postprocessing,
      bloom: this.bloom,
    })
  }

  setPixelRatio(value) {
    this.modify('pixelRatio', value)
  }

  setShadows(value) {
    this.modify('shadows', value)
  }

  setPostprocessing(value) {
    this.modify('postprocessing', value)
  }

  setBloom(value) {
    this.modify('bloom', value)
  }

  update() {
    if (!this.changes) return
    this.emit('change', this.changes)
    this.changes = null
  }
}
