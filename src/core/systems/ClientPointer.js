import * as THREE from '../extras/three'
import { ControlPriorities } from '../extras/ControlPriorities'

import { System } from './System'

const v1 = new THREE.Vector3()

/**
 *
 * This system handles pointer events.
 * It handles pointer events while the pointer is locked via reticle raycasting.
 * It handles pointer events while the cursor is being used, via world UI.
 *
 */

export class ClientPointer extends System {
  constructor(world) {
    super(world)
    this.pointerState = new PointerState()
  }

  init({ ui }) {
    this.ui = ui
  }

  start() {
    this.control = this.world.controls.bind({
      priority: ControlPriorities.POINTER,
    })
    // Track mouse/touch position globally for manual raycasting when canvas pointer-events are disabled
    this.mousePosition = { x: 0, y: 0 }
    this.onMouseMove = (e) => {
      this.mousePosition.x = e.clientX
      this.mousePosition.y = e.clientY
    }
    this.onTouchMove = (e) => {
      if (e.touches.length > 0) {
        this.mousePosition.x = e.touches[0].clientX
        this.mousePosition.y = e.touches[0].clientY
      }
    }
    window.addEventListener('mousemove', this.onMouseMove)
    window.addEventListener('touchmove', this.onTouchMove)
  }

  update(delta) {
    let hit
    let pressed
    let released
    if (this.control.xrLeftTrigger.value || this.control.xrRightTrigger.value) {
      const ray = this.control.xrLeftTrigger.value ? this.control.xrLeftRayPose : this.control.xrRightRayPose
      const dir = v1.set(0, 0, -1).applyQuaternion(ray.quaternion)
      hit = this.world.stage.raycast(ray.position, dir)[0]
      const trigger = this.control.xrLeftTrigger.value ? this.control.xrLeftTrigger : this.control.xrRightTrigger
      pressed = trigger.pressed
      released = trigger.released
    } else if (this.control.pointer.locked) {
      hit = this.world.stage.raycastReticle()[0]
      pressed = this.control.mouseLeft.pressed
      released = this.control.mouseLeft.released
    } else {
      hit = this.screenHit
      pressed = this.control.mouseLeft.pressed
      released = this.control.mouseLeft.released
    }
    this.pointerState.update(hit, pressed, released)

    // Handle WebView interaction (DOM behind Canvas)
    const renderer = this.world.graphics.renderer
    if (renderer && renderer.domElement) {
      let isWebView = false

      if (this.control.pointer.locked || this.control.xrLeftTrigger.value || this.control.xrRightTrigger.value) {
        // Locked or XR mode: use the hit detected by the input system (reticle or controller ray)
        // In these modes, we generally want the canvas to capture events (for reticle/controller logic),
        // but we might want to visualize hover. However, for actual interaction (clicking iframe),
        // the user typically needs to unlock the cursor.
        // Per user request: "webview should only be useable when the pointer is not locked"
        isWebView = false // Force false to ensure pointerEvents stays 'auto'
      } else {
        // Unlocked / Cursor mode (Desktop or Mobile Touch)
        // Always manually raycast to detect WebView, as screenHit is only for screen-space UI
        const hits = this.world.stage.raycastPointer(this.mousePosition)
        const hit = hits[0]
        isWebView = hit && hit.node && hit.node.name === 'webview'
      }

      if (isWebView) {
        if (renderer.domElement.style.pointerEvents !== 'none') {

          renderer.domElement.style.pointerEvents = 'none'
        }
      } else {
        if (renderer.domElement.style.pointerEvents !== 'auto') {

          renderer.domElement.style.pointerEvents = 'auto'
        }
      }


    }
  }

  setScreenHit(screenHit) {
    this.screenHit = screenHit
    // capture all mouse click events if our pointer is interacting with world UI
    this.control.mouseLeft.capture = !!screenHit
  }

  destroy() {
    if (this.onMouseMove) {
      window.removeEventListener('mousemove', this.onMouseMove)
    }
    if (this.onTouchMove) {
      window.removeEventListener('touchmove', this.onTouchMove)
    }
    this.control?.release()
    this.control = null
  }
}

const PointerEvents = {
  ENTER: 'pointerenter',
  LEAVE: 'pointerleave',
  DOWN: 'pointerdown',
  UP: 'pointerup',
}

const CURSOR_DEFAULT = 'default'

class PointerEvent {
  constructor() {
    this.type = null
    this._propagationStopped = false
  }

  set(type) {
    this.type = type
    this._propagationStopped = false
  }

  stopPropagation() {
    this._propagationStopped = true
  }
}

class PointerState {
  constructor() {
    this.activePath = new Set()
    this.event = new PointerEvent()
    this.cursor = CURSOR_DEFAULT
    this.pressedNodes = new Set()
  }

  update(hit, pointerPressed, pointerReleased) {
    const newPath = hit ? this.getAncestorPath(hit) : []
    const oldPath = Array.from(this.activePath)

    // find divergence point
    let i = 0
    while (i < newPath.length && i < oldPath.length && newPath[i] === oldPath[i]) i++

    // pointer leave events bubble up from leaf
    for (let j = oldPath.length - 1; j >= i; j--) {
      if (oldPath[j].onPointerLeave) {
        this.event.set(PointerEvents.LEAVE)
        try {
          oldPath[j].onPointerLeave?.(this.event)
        } catch (err) {
          console.error(err)
        }
        // if (this.event._propagationStopped) break
      }
      this.activePath.delete(oldPath[j])
    }

    // pointer enter events bubble down from divergence
    for (let j = i; j < newPath.length; j++) {
      if (newPath[j].onPointerEnter) {
        this.event.set(PointerEvents.ENTER)
        try {
          newPath[j].onPointerEnter?.(this.event)
        } catch (err) {
          console.error(err)
        }
        if (this.event._propagationStopped) break
      }
      this.activePath.add(newPath[j])
    }

    // set cursor - check from leaf to root for first defined cursor
    let cursor = CURSOR_DEFAULT
    if (newPath.length > 0) {
      for (let i = newPath.length - 1; i >= 0; i--) {
        if (newPath[i].cursor) {
          cursor = newPath[i].cursor
          break
        }
      }
    }
    if (cursor !== this.cursor) {
      document.body.style.cursor = cursor
      this.cursor = cursor
    }

    // handle pointer down events
    if (pointerPressed) {
      for (let i = newPath.length - 1; i >= 0; i--) {
        const node = newPath[i]
        if (node.onPointerDown) {
          this.event.set(PointerEvents.DOWN)
          try {
            node.onPointerDown(this.event)
          } catch (err) {
            // console.error(err)
          }
          this.pressedNodes.add(node)
          if (this.event._propagationStopped) break
        }
      }
    }

    // handle pointer up events
    if (pointerReleased) {
      for (const node of this.pressedNodes) {
        if (node.onPointerUp) {
          this.event.set(PointerEvents.UP)
          try {
            node.onPointerUp(this.event)
          } catch (err) {
            console.error(err)
          }
          if (this.event._propagationStopped) break
        }
      }
      this.pressedNodes.clear()
    }
  }

  getAncestorPath(hit) {
    const path = []
    let node = hit.node?.resolveHit?.(hit) || hit.node
    while (node) {
      path.unshift(node)
      node = node.parent
    }
    return path
  }
}
