import { isBoolean, isNumber } from 'lodash-es'

import { System } from './System'
import { EffectRegistry } from './EffectRegistry'
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
    this.v = data.v

    // DOF preferences - DISABLED BY DEFAULT due to excessive blur issues
    this.dofEnabled = isBoolean(data.dofEnabled) ? data.dofEnabled : true
    this.dofFocusDistance = isNumber(data.dofFocusDistance) ? data.dofFocusDistance : 50
    this.dofFocalLength = isNumber(data.dofFocalLength) ? data.dofFocalLength : 24
    this.dofBokehScale = isNumber(data.dofBokehScale) ? data.dofBokehScale : 0.01 // Minimal blur
    this.dofFocusRange = isNumber(data.dofFocusRange) ? data.dofFocusRange : 30 // Wider in-focus area
    this.dofFStop = isNumber(data.dofFStop) ? data.dofFStop : 4.0  // Wider aperture for visible DOF
    this.dofMaxBlur = isNumber(data.dofMaxBlur) ? data.dofMaxBlur : 0.01 // Match minimal bokeh
    this.dofLuminanceThreshold = isNumber(data.dofLuminanceThreshold) ? data.dofLuminanceThreshold : 0.6
    this.dofLuminanceGain = isNumber(data.dofLuminanceGain) ? data.dofLuminanceGain : 2.5
    this.dofBias = isNumber(data.dofBias) ? data.dofBias : 0.08
    this.dofFringe = isNumber(data.dofFringe) ? data.dofFringe : 0.8

    // Additional DOF preferences
    this.focusSmoothing = isNumber(data.focusSmoothing) ? data.focusSmoothing : 0  // 0 = instant response
    this.focusSpeed = isNumber(data.focusSpeed) ? data.focusSpeed : 8
    this.playerAutofocus = isBoolean(data.playerAutofocus) ? data.playerAutofocus : true
    this.reticleAutofocus = isBoolean(data.reticleAutofocus) ? data.reticleAutofocus : true
    this.scrollZoomEnabled = isBoolean(data.scrollZoomEnabled) ? data.scrollZoomEnabled : true
    this.showHelpers = isBoolean(data.showHelpers) ? data.showHelpers : false
    this.zoomSpeed = isNumber(data.zoomSpeed) ? data.zoomSpeed : 1

    // Bloom preferences
    this.bloomIntensity = isNumber(data.bloomIntensity) ? data.bloomIntensity : 0.5
    this.bloomRadius = isNumber(data.bloomRadius) ? data.bloomRadius : 0.8
    this.bloomLuminanceThreshold = isNumber(data.bloomLuminanceThreshold) ? data.bloomLuminanceThreshold : 1
    this.bloomLuminanceSmoothing = isNumber(data.bloomLuminanceSmoothing) ? data.bloomLuminanceSmoothing : 0.3

    // AO preferences
    this.aoRadius = isNumber(data.aoRadius) ? data.aoRadius : 64
    this.aoDistanceFalloff = isNumber(data.aoDistanceFalloff) ? data.aoDistanceFalloff : 0.3
    this.aoIntensity = isNumber(data.aoIntensity) ? data.aoIntensity : 1
    this.aoHalfRes = isBoolean(data.aoHalfRes) ? data.aoHalfRes : true
    this.aoScreenSpaceRadius = isBoolean(data.aoScreenSpaceRadius) ? data.aoScreenSpaceRadius : true

    // Tone mapping preferences
    this.toneMapAdaptationRate = isNumber(data.toneMapAdaptationRate) ? data.toneMapAdaptationRate : 0.5
    this.toneMapWhitePoint = isNumber(data.toneMapWhitePoint) ? data.toneMapWhitePoint : 1
    this.toneMapMiddleGrey = isNumber(data.toneMapMiddleGrey) ? data.toneMapMiddleGrey : 0.6
    this.toneMapMinLuminance = isNumber(data.toneMapMinLuminance) ? data.toneMapMinLuminance : 0.01

    this.changes = null

    // Initialize EffectRegistry for dynamic setter generation
    this.effectRegistry = new EffectRegistry(world)

    // Auto-generate setters for all effect parameters
    this.generateEffectSetters()
  }

  /**
   * Auto-generate setter methods from EffectRegistry configurations
   */
  generateEffectSetters() {
    const effects = this.effectRegistry.getAllEffects()
    const allPrefKeys = new Set()

    // Collect all preference keys from effect uniforms
    Object.keys(effects).forEach(name => {
      const config = this.effectRegistry.getEffectConfig(name)
      if (config.uniforms) {
        Object.values(config.uniforms).forEach(prefKey => {
          allPrefKeys.add(prefKey)
        })
      }
    })

    // Also add basic preference keys not in effects
    const basicPrefs = [
      'ui', 'actions', 'stats', 'dpr', 'shadows',
      'postprocessing', 'bloom', 'ao', 'music', 'sfx', 'voice',
      'dofEnabled', 'focusSmoothing', 'focusSpeed', 'playerAutofocus',
      'reticleAutofocus', 'scrollZoomEnabled', 'showHelpers', 'zoomSpeed',
      'focalLength', 'fStop', 'maxBlur', 'luminanceThreshold',
      'luminanceGain', 'bias', 'fringe', 'focusRange'
    ]
    basicPrefs.forEach(pref => allPrefKeys.add(pref))

    // Generate setters for all preference keys
    allPrefKeys.forEach(prefKey => {
      // Handle DOF acronym properly (dofEnabled -> setDOFEnabled, not setDofEnabled)
      let processedKey = prefKey
      if (prefKey.startsWith('dof')) {
        processedKey = 'DOF' + prefKey.slice(3)
      } else if (prefKey.startsWith('focus')) {
        // Do nothing, will become setFocusSmoothing etc.
      }
      const setterName = `set${processedKey.charAt(0).toUpperCase() + processedKey.slice(1)}`

      // Skip if it's one of the special DOF methods that have custom logic
      if (['setFocalLength', 'setDOFFocusDistance', 'setDOFFocusRange'].includes(setterName)) {
        return
      }

      this[setterName] = value => {
        this.modify(prefKey, value)
      }
    })
  }

  init() {
    this.world.chat.bindCommand('stats', () => {
      this.setStats(!this.stats)
    })
    this.world.chat.bindCommand('dof', () => {
      this.setDOFEnabled(!this.dofEnabled)
    })
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
      v: this.v,
      // DOF preferences
      dofEnabled: this.dofEnabled,
      dofFocusDistance: this.dofFocusDistance,
      dofFocalLength: this.dofFocalLength,
      dofBokehScale: this.dofBokehScale,
      dofFocusRange: this.dofFocusRange,
      dofFStop: this.dofFStop,
      dofMaxBlur: this.dofMaxBlur,
      dofLuminanceThreshold: this.dofLuminanceThreshold,
      dofLuminanceGain: this.dofLuminanceGain,
      dofBias: this.dofBias,
      dofFringe: this.dofFringe,
      // Additional DOF preferences
      focusSmoothing: this.focusSmoothing,
      focusSpeed: this.focusSpeed,
      playerAutofocus: this.playerAutofocus,
      reticleAutofocus: this.reticleAutofocus,
      scrollZoomEnabled: this.scrollZoomEnabled,
      showHelpers: this.showHelpers,
      zoomSpeed: this.zoomSpeed,
      // Bloom preferences
      bloomIntensity: this.bloomIntensity,
      bloomRadius: this.bloomRadius,
      bloomLuminanceThreshold: this.bloomLuminanceThreshold,
      bloomLuminanceSmoothing: this.bloomLuminanceSmoothing,
      // AO preferences
      aoRadius: this.aoRadius,
      aoDistanceFalloff: this.aoDistanceFalloff,
      aoIntensity: this.aoIntensity,
      aoHalfRes: this.aoHalfRes,
      aoScreenSpaceRadius: this.aoScreenSpaceRadius,
      // Tone mapping preferences
      toneMapAdaptationRate: this.toneMapAdaptationRate,
      toneMapWhitePoint: this.toneMapWhitePoint,
      toneMapMiddleGrey: this.toneMapMiddleGrey,
      toneMapMinLuminance: this.toneMapMinLuminance,
    })
  }

  // Basic setters are now auto-generated in generateEffectSetters()

  // Special DOF methods that have custom logic
  setFocalLength(value) {
    this.modify('focalLength', value)
  }

  setDOFBokehScale(value) {
    this.modify('dofBokehScale', value)
  }

  setDOFFocusDistance(value) {
    this.modify('dofFocusDistance', value)
  }

  setDOFFocusRange(value) {
    this.modify('dofFocusRange', value)
  }

  // All other setters are auto-generated in generateEffectSetters()

  destroy() {
    // ...
  }
}
