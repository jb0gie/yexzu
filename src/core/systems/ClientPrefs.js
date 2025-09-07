import { isBoolean, isNumber } from 'lodash-es'

import { System } from './System'
import { storage } from '../storage'
import { isTouch } from '../../client/utils'

/**
 * Client Prefs System
 *
 */
export class ClientPrefs extends System {
  constructor(world) {
    super(world)

    const isQuest = /OculusBrowser/.test(navigator.userAgent)

    const data = storage.get('prefs', {})

    // v2: reset ui scale for new mobile default (0.9)
    if (!data.v) {
      data.v = 2
      data.ui = null
    }
    // v3: reset shadows for new mobile default (med)
    if (data.v < 3) {
      data.v = 3
      data.shadows = null
    }
    // v4: reset shadows for new defaults (low or med)
    if (data.v < 4) {
      data.v = 4
      data.shadows = null
    }

    this.ui = isNumber(data.ui) ? data.ui : isTouch ? 0.9 : 1
    this.actions = isBoolean(data.actions) ? data.actions : true
    this.stats = isBoolean(data.stats) ? data.stats : false
    this.dpr = isNumber(data.dpr) ? data.dpr : 1
    this.shadows = data.shadows ? data.shadows : isTouch ? 'low' : 'med' // none, low=1, med=2048cascade, high=4096cascade
    this.postprocessing = isBoolean(data.postprocessing) ? data.postprocessing : true
    this.bloom = isBoolean(data.bloom) ? data.bloom : true
    this.ao = isBoolean(data.ao) ? data.ao : true
    this.music = isNumber(data.music) ? data.music : 1
    this.sfx = isNumber(data.sfx) ? data.sfx : 1
    this.voice = isNumber(data.voice) ? data.voice : 1
    // Camera settings
    this.dofEnabled = isBoolean(data.dofEnabled) ? data.dofEnabled : false
    this.dofFocusDistance = isNumber(data.dofFocusDistance) ? data.dofFocusDistance : 10
    this.dofAperture = isNumber(data.dofAperture) ? data.dofAperture : 5.6  // F-stop value (1.4 = shallow DOF, 22 = deep DOF)
    this.dofFocusRange = isNumber(data.dofFocusRange) ? data.dofFocusRange : 5
    this.dofBokehScale = isNumber(data.dofBokehScale) ? data.dofBokehScale : 1
    this.focalLength = isNumber(data.focalLength) ? data.focalLength : 24 // Wide landscape preset default (73° FOV)
    this.showHelpers = isBoolean(data.showHelpers) ? data.showHelpers : false
    // Autofocus settings
    this.reticleAutofocus = isBoolean(data.reticleAutofocus) ? data.reticleAutofocus : false
    this.playerAutofocus = isBoolean(data.playerAutofocus) ? data.playerAutofocus : false
    this.focusSmoothing = isBoolean(data.focusSmoothing) ? data.focusSmoothing : true
    this.focusSpeed = isNumber(data.focusSpeed) ? data.focusSpeed : 0.1
    this.reticleFocusDelay = isNumber(data.reticleFocusDelay) ? data.reticleFocusDelay : 0.5
    this.scrollZoomEnabled = isBoolean(data.scrollZoomEnabled) ? data.scrollZoomEnabled : false
    this.zoomSpeed = isNumber(data.zoomSpeed) ? data.zoomSpeed : 5
    // Mobile/touch controls
    this.touchLookSensitivity = isNumber(data.touchLookSensitivity) ? data.touchLookSensitivity : (isTouch ? 1.2 : 1)
    this.touchInvertY = isBoolean(data.touchInvertY) ? data.touchInvertY : false
    this.autoSprintThreshold = isNumber(data.autoSprintThreshold) ? data.autoSprintThreshold : 0.9
    this.v = data.v

    this.changes = null
  }

  preFixedUpdate() {
    if (!this.changes) return
    this.emit('change', this.changes)
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

  async persist() {
    // a small delay to ensure prefs that crash dont persist (eg old iOS with UHD shadows etc)
    await new Promise(resolve => setTimeout(resolve, 2000))
    storage.set('prefs', {
      ui: this.ui,
      actions: this.actions,
      stats: this.stats,
      dpr: this.dpr,
      shadows: this.shadows,
      postprocessing: this.postprocessing,
      bloom: this.bloom,
      ao: this.ao,
      music: this.music,
      sfx: this.sfx,
      voice: this.voice,
      dofEnabled: this.dofEnabled,
      dofFocusDistance: this.dofFocusDistance,
      dofFocusRange: this.dofFocusRange,
      dofBokehScale: this.dofBokehScale,
      focalLength: this.focalLength,
      showHelpers: this.showHelpers,
      reticleAutofocus: this.reticleAutofocus,
      playerAutofocus: this.playerAutofocus,
      focusSmoothing: this.focusSmoothing,
      focusSpeed: this.focusSpeed,
      reticleFocusDelay: this.reticleFocusDelay,
      scrollZoomEnabled: this.scrollZoomEnabled,
      zoomSpeed: this.zoomSpeed,
      touchLookSensitivity: this.touchLookSensitivity,
      touchInvertY: this.touchInvertY,
      autoSprintThreshold: this.autoSprintThreshold,
      v: this.v,
    })
  }

  setUI(value) {
    this.modify('ui', value)
  }

  setActions(value) {
    this.modify('actions', value)
  }

  setStats(value) {
    this.modify('stats', value)
  }

  setDPR(value) {
    this.modify('dpr', value)
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

  setAO(value) {
    this.modify('ao', value)
  }

  setMusic(value) {
    this.modify('music', value)
  }

  setSFX(value) {
    this.modify('sfx', value)
  }

  setVoice(value) {
    this.modify('voice', value)
  }

  setDOFEnabled(value) {
    this.modify('dofEnabled', value)
  }

  setDOFFocusDistance(value) {
    this.modify('dofFocusDistance', value)
  }

  setDOFFocusRange(value) {
    this.modify('dofFocusRange', value)
  }

  setDOFBokehScale(value) {
    this.modify('dofBokehScale', value)
  }

  setFocalLength(value) {
    this.modify('focalLength', value)
  }

  setShowHelpers(value) {
    this.modify('showHelpers', value)
  }
  
  // Autofocus setters
  setReticleAutofocus(value) {
    this.modify('reticleAutofocus', value)
  }
  
  setPlayerAutofocus(value) {
    this.modify('playerAutofocus', value)
  }
  
  setFocusSmoothing(value) {
    this.modify('focusSmoothing', value)
  }
  
  setFocusSpeed(value) {
    this.modify('focusSpeed', value)
  }
  
  setReticleFocusDelay(value) {
    this.modify('reticleFocusDelay', value)
  }
  
  setScrollZoomEnabled(value) {
    this.modify('scrollZoomEnabled', value)
  }
  
  setZoomSpeed(value) {
    this.modify('zoomSpeed', value)
  }

  // Touch/mobile controls
  setTouchLookSensitivity(value) {
    this.modify('touchLookSensitivity', value)
  }

  setTouchInvertY(value) {
    this.modify('touchInvertY', value)
  }

  setAutoSprintThreshold(value) {
    this.modify('autoSprintThreshold', value)
  }

  destroy() {
    // ...
  }
}
