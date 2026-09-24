import { System } from './System'
import * as THREE from '../extras/three'

/**
 * XR System
 *
 * - Runs on the client.
 * - Keeps track of XR sessions
 *
 */
export class XR extends System {
  constructor(world) {
    super(world)
    this.session = null
    this.camera = null
    this.supportsVR = false
    this.supportsAR = false
  }

  async init() {
    this.supportsVR = await navigator.xr?.isSessionSupported('immersive-vr')
    this.supportsAR = await navigator.xr?.isSessionSupported('immersive-ar')
  }

  async enter() {
    this.world.graphics.renderer.xr.setReferenceSpaceType('local-floor')
    this.world.graphics.renderer.xr.setFoveation(1)
    // `dom-overlay` is what makes the ENTIRE React UI visible in a headset.
    // Without it the UI is not merely hard to read, it is absent: an
    // immersive-vr session composites the WebGL layer and nothing else, so every
    // pane, button and the sidebar simply do not exist for the wearer.
    //
    // Optional, never required: a headset/browser that refuses the grant must
    // still get a session (you lose the UI, not VR). `root` is the element WebXR
    // paints into the overlay — CoreUI's host, so its theme and pointer events
    // come along.
    const overlayRoot = document.getElementById('root')
    const session = await navigator.xr?.requestSession('immersive-vr', {
      requiredFeatures: ['local-floor'],
      optionalFeatures: ['dom-overlay'],
      domOverlay: overlayRoot ? { root: overlayRoot } : undefined,
    })
    try {
      session.updateTargetFrameRate(72)
    } catch (err) {
      console.error(err)
      console.error('xr session.updateTargetFrameRate(72) failed')
    }
    this.world.graphics.renderer.xr.setSession(session)
    session.addEventListener('end', this.onSessionEnd)
    this.camera = this.world.graphics.renderer.xr.getCamera()
    this.session = session
    this.world.emit('xrSession', session)
  }

  onSessionEnd = () => {
    this.session = null
    this.world.emit('xrSession', null)
  }
}
