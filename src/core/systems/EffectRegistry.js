import * as THREE from '../extras/three'
import { N8AOPostPass } from 'n8ao'
import {
  EffectComposer,
  EffectPass,
  RenderPass,
  SMAAPreset,
  SMAAEffect,
  ToneMappingEffect,
  ToneMappingMode,
  SelectiveBloomEffect,
  BlendFunction,
  Selection,
  BloomEffect,
  KernelSize,
  DepthPass,
  Pass,
  DepthEffect,
  DepthOfFieldEffect,
} from 'postprocessing'

/**
 * EffectRegistry - Config-driven Postprocessing Effect Management
 *
 * Provides a centralized, modular system for managing postprocessing effects
 * with preference-driven configuration and uniform updates.
 *
 * @example
 * const registry = new EffectRegistry(world)
 * const bloom = registry.createEffect('bloom', camera, world)
 * registry.updateUniform(bloom, 'intensity', 1.5)
 */
export class EffectRegistry {
  constructor(world) {
    this.world = world
    this.effects = new Map()
    this.instances = new Map()
  }

  /**
   * Effect configurations
   * @private
   */
  getEffectDefinitions() {
    return {
      bloom: {
        name: 'bloom',
        class: BloomEffect,
        enabled: 'bloom',
        category: 'postprocessing',
        params: {
          blendFunction: BlendFunction.ADD,
          mipmapBlur: true,
          luminanceThreshold: 1,
          luminanceSmoothing: 0.3,
          intensity: 0.5,
          radius: 0.8,
          levels: 4,
        },
        uniforms: {
          intensity: 'bloomIntensity',
          radius: 'bloomRadius',
          luminanceThreshold: 'bloomLuminanceThreshold',
          luminanceSmoothing: 'bloomLuminanceSmoothing',
        },
      },

      dof: {
        name: 'dof',
        class: DepthOfFieldEffect,
        enabled: 'dofEnabled',
        category: 'postprocessing',
        dependencies: ['camera'],
        params: {
          blendFunction: BlendFunction.NORMAL,
          focusDistance: 10,
          focalLength: 0.024,
          bokehScale: 15,
          height: 480,
        },
        uniforms: {
          // Circle of confusion uniforms
          'circleOfConfusionMaterial.uniforms.focusDistance': 'dofFocusDistance',
          'circleOfConfusionMaterial.uniforms.focalLength': 'dofFocalLength',
          'circleOfConfusionMaterial.uniforms.fStop': 'dofFStop',
          'circleOfConfusionMaterial.uniforms.maxBlur': 'dofMaxBlur',
          'circleOfConfusionMaterial.uniforms.luminanceThreshold': 'dofLuminanceThreshold',
          'circleOfConfusionMaterial.uniforms.luminanceGain': 'dofLuminanceGain',
          'circleOfConfusionMaterial.uniforms.bias': 'dofBias',
          'circleOfConfusionMaterial.uniforms.fringe': 'dofFringe',
        },
        factory: (config, camera, world) => {
          const dof = new DepthOfFieldEffect(camera, {
            ...config.params,
            focusDistance: (world.prefs.dofFocusDistance || 10) / (camera.far || 1200),
            focalLength: (world.prefs.dofFocalLength || 24) * 0.001,
            bokehScale: (world.prefs.dofMaxBlur || 0.15) * 100,
            height: 480,
          })

          // Configure DOF uniforms (check if they exist first)
          const uniforms = dof.circleOfConfusionMaterial.uniforms
          if (uniforms.fStop) uniforms.fStop.value = world.prefs.dofFStop || 1.8
          if (uniforms.maxBlur) uniforms.maxBlur.value = world.prefs.dofMaxBlur || 0.15
          if (uniforms.luminanceThreshold) uniforms.luminanceThreshold.value = world.prefs.dofLuminanceThreshold || 0.6
          if (uniforms.luminanceGain) uniforms.luminanceGain.value = world.prefs.dofLuminanceGain || 2.5
          if (uniforms.bias) uniforms.bias.value = world.prefs.dofBias || 0.08
          if (uniforms.fringe) uniforms.fringe.value = world.prefs.dofFringe || 0.8

          // Store uniform references for updates
          dof.__uniforms = uniforms
          return dof
        },
      },

      smaa: {
        name: 'smaa',
        class: SMAAEffect,
        enabled: null, // Always enabled
        category: 'postprocessing',
        params: {
          preset: SMAAPreset.ULTRA,
        },
        uniforms: {},
      },

      tonemapping: {
        name: 'tonemapping',
        class: ToneMappingEffect,
        enabled: null, // Always enabled
        category: 'postprocessing',
        params: {
          mode: ToneMappingMode.ACES_FILMIC,
          adaptationRate: 0.5,
          whitePoint: new THREE.Color(1, 1, 1),
          middleGrey: 0.6,
          minLuminance: 0.01,
          maxLuminance: 64,
          averageLuminance: 0.25,
        },
        uniforms: {
          'adaptiveLuminanceMaterial.uniforms.adaptationRate': 'toneMapAdaptationRate',
          'toneMapMaterial.uniforms.whitePoint': 'toneMapWhitePoint',
          'toneMapMaterial.uniforms.middleGrey': 'toneMapMiddleGrey',
          'toneMapMaterial.uniforms.minLuminance': 'toneMapMinLuminance',
        },
      },

      ao: {
        name: 'ao',
        class: null, // Special case using n8ao
        enabled: 'ao',
        category: 'postprocessing',
        dependencies: ['aoPass'],
        params: {
          halfRes: true,
          screenSpaceRadius: true,
          aoRadius: 64,
          distanceFalloff: 0.3,
          intensity: 1,
          autoDetectTransparency: false,
        },
        uniforms: {
          'configuration.aoRadius': 'aoRadius',
          'configuration.distanceFalloff': 'aoDistanceFalloff',
          'configuration.intensity': 'aoIntensity',
          'configuration.halfRes': 'aoHalfRes',
          'configuration.screenSpaceRadius': 'aoScreenSpaceRadius',
        },
        factory: (config, camera, world) => {
          // Special handling for AO pass
          const aoPass = new N8AOPostPass(world.stage.scene, camera, world.width, world.height)
          aoPass.enabled = world.settings.ao && world.prefs.ao
          aoPass.configuration.halfRes = world.prefs.aoHalfRes ?? true
          aoPass.configuration.screenSpaceRadius = world.prefs.aoScreenSpaceRadius ?? true
          aoPass.configuration.aoRadius = world.prefs.aoRadius ?? 64
          aoPass.configuration.distanceFalloff = world.prefs.aoDistanceFalloff ?? 0.3
          aoPass.configuration.intensity = world.prefs.aoIntensity ?? 1
          return aoPass
        },
      },
    }
  }

  /**
   * Get configuration for a specific effect
   * @param {string} name - Effect name
   * @returns {Object|null} Effect configuration
   */
  getEffectConfig(name) {
    const definitions = this.getEffectDefinitions()
    return definitions[name] || null
  }

  /**
   * Get all effect configurations
   * @param {string} [category] - Optional category filter
   * @returns {Object} All effect configurations
   */
  getAllEffects(category = null) {
    const definitions = this.getEffectDefinitions()
    if (category) {
      return Object.fromEntries(
        Object.entries(definitions).filter(([_, config]) => config.category === category)
      )
    }
    return definitions
  }

  /**
   * Get all effect configurations by category
   * @param {string} category - Category name
   * @returns {Array} Array of effect configurations
   */
  getAllEffectsByCategory(category) {
    const definitions = this.getEffectDefinitions()
    return Object.values(definitions).filter(config => config.category === category)
  }

  /**
   * Create an effect instance
   * @param {string} name - Effect name
   * @param {THREE.Camera} camera - Camera for effect
   * @param {World} world - World instance
   * @returns {Object|null} Effect instance
   */
  createEffect(name, camera, world) {
    const config = this.getEffectConfig(name)
    if (!config) {
      console.warn(`[EffectRegistry] Unknown effect: ${name}`)
      return null
    }

    // Check dependencies
    if (config.dependencies) {
      for (const dep of config.dependencies) {
        if (dep === 'camera' && !camera) {
          console.warn(`[EffectRegistry] Effect ${name} requires camera`)
          return null
        }
        if (dep === 'aoPass' && config.name !== 'ao') {
          console.warn(`[EffectRegistry] AO is special case, handled separately`)
        }
      }
    }

    // Check if effect should be enabled
    if (config.enabled && world.prefs[config.enabled] === false) {
      return null
    }

    let effect = null

    try {
      // Use factory if available
      if (config.factory) {
        effect = config.factory(config, camera, world)
      } else if (config.class) {
        // Standard effect creation
        const params = { ...config.params }

        // Apply preference overrides
        for (const [uniformKey, prefKey] of Object.entries(config.uniforms)) {
          if (world.prefs[prefKey] !== undefined) {
            // Handle nested properties
            const keys = uniformKey.split('.')
            let target = params
            for (let i = 0; i < keys.length - 1; i++) {
              const key = keys[i]
              if (!target[key]) target[key] = {}
              target = target[key]
            }
            target[keys[keys.length - 1]] = world.prefs[prefKey]
          }
        }

        effect = new config.class(params)
      }

      if (effect) {
        effect.__effectName = name
        effect.__config = config

        // Store instance for updates
        this.instances.set(name, effect)

        console.log(`[EffectRegistry] Created effect: ${name}`)
      }
    } catch (error) {
      console.error(`[EffectRegistry] Failed to create effect ${name}:`, error)
    }

    return effect
  }

  /**
   * Update a uniform on an effect
   * @param {Object} effect - Effect instance
   * @param {string} uniformName - Uniform name (supports nested notation)
   * @param {*} value - New value
   * @returns {boolean} Success status
   */
  updateUniform(effect, uniformName, value) {
    if (!effect) return false

    try {
      // Handle nested uniform access
      const keys = uniformName.split('.')
      let target = effect

      for (const key of keys) {
        if (target[key] === undefined) return false
        target = target[key]
      }

      target.value = value

      // Mark effect for recompilation if it has recompile method
      if (effect.recompile && typeof effect.recompile === 'function') {
        effect.recompile()
      }

      return true
    } catch (error) {
      console.error(`[EffectRegistry] Failed to update uniform ${uniformName}:`, error)
      return false
    }
  }

  /**
   * Update multiple effect parameters
   * @param {Object} effect - Effect instance
   * @param {Object} params - Parameter object
   * @returns {boolean} Success status
   */
  updateEffectParams(effect, params) {
    if (!effect || !params) return false

    let success = true

    for (const [key, value] of Object.entries(params)) {
      const result = this.updateUniform(effect, key, value)
      if (!result) success = false
    }

    return success
  }

  /**
   * Update effect from preferences
   * @param {string} name - Effect name
   * @param {Object} preferences - Preference changes
   * @returns {boolean} Success status
   */
  updateEffectFromPrefs(name, preferences) {
    const effect = this.instances.get(name)
    if (!effect) return false

    const config = this.getEffectConfig(name)
    if (!config || !config.uniforms) return false

    let updated = false

    for (const [uniformKey, prefKey] of Object.entries(config.uniforms)) {
      if (preferences[prefKey] !== undefined) {
        const value = preferences[prefKey].value ?? preferences[prefKey]

        // Special handling for DOF focus distance
        if (name === 'dof' && uniformKey === 'circleOfConfusionMaterial.uniforms.focusDistance') {
          const adjustedValue = value / (this.world.camera.far || 1200)
          if (this.updateUniform(effect, uniformKey, adjustedValue)) {
            updated = true
          }
        }
        // Special handling for DOF focal length
        else if (name === 'dof' && uniformKey === 'circleOfConfusionMaterial.uniforms.focalLength') {
          const adjustedValue = value * 0.001
          if (this.updateUniform(effect, uniformKey, adjustedValue)) {
            updated = true
          }
        }
        // Special handling for DOF bokeh scale
        else if (name === 'dof' && uniformKey === 'circleOfConfusionMaterial.uniforms.maxBlur') {
          const adjustedValue = value * 100
          if (this.updateUniform(effect, uniformKey, adjustedValue)) {
            updated = true
          }
        }
        // Standard uniform update
        else {
          if (this.updateUniform(effect, uniformKey, value)) {
            updated = true
          }
        }
      }
    }

    return updated
  }

  /**
   * Get effect instance by name
   * @param {string} name - Effect name
   * @returns {Object|null} Effect instance
   */
  getEffect(name) {
    return this.instances.get(name) || null
  }

  /**
   * Get all active effect instances
   * @returns {Array} Array of effect instances
   */
  getAllActiveEffects() {
    return Array.from(this.instances.values())
  }

  /**
   * Check if an effect is active
   * @param {string} name - Effect name
   * @returns {boolean} Whether effect is active
   */
  isEffectActive(name) {
    return this.instances.has(name)
  }

  /**
   * Remove an effect instance
   * @param {string} name - Effect name
   * @returns {boolean} Success status
   */
  removeEffect(name) {
    const effect = this.instances.get(name)
    if (!effect) return false

    // Dispose effect if it has dispose method
    if (effect.dispose && typeof effect.dispose === 'function') {
      effect.dispose()
    }

    this.instances.delete(name)
    console.log(`[EffectRegistry] Removed effect: ${name}`)
    return true
  }

  /**
   * Clear all effect instances
   */
  clearEffects() {
    for (const [name] of this.instances) {
      this.removeEffect(name)
    }
  }

  /**
   * Get supported effect names
   * @param {string} [category] - Optional category filter
   * @returns {Array} Array of effect names
   */
  getSupportedEffects(category = null) {
    const effects = this.getAllEffects(category)
    return Object.keys(effects)
  }

  /**
   * Destroy the registry and clean up all effects
   */
  destroy() {
    this.clearEffects()
    this.effects.clear()
    this.instances.clear()
  }
}