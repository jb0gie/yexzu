/**
 * System Modularization Template
 *
 * Copy-paste template for converting any Hyperfy system from hardcoded constants
 * to configuration-driven design. This shows the exact mechanical process.
 *
 * BEFORE: Hardcoded constants scattered throughout the system
 * AFTER: Clean configuration loading at startup with runtime updates
 */

import { System } from '../core/systems/System'
import { createConstantsManager } from '../modules/ConstantsExtraction'

/**
 * Template for System X Module (replace X with your system name)
 */
export class ConfigurableSystemX extends System {
  constructor(world) {
    super(world)

    // STEP 1: Define what constants your system uses
    this.configSchema = {
      // Constants your system uses (replace with actual values)
      CONSTANT_1: { type: 'number', default: 100, min: 1, max: 1000, description: 'First constant description' },
      CONSTANT_2: { type: 'number', default: 50, min: 10, max: 100, description: 'Second constant description' },
      CONSTANT_OBJECT: { type: 'object', default: { x: 0, y: 1, z: 0 }, description: 'Default vector' },
      CONSTANT_BOOL: { type: 'boolean', default: true, description: 'Feature toggle' },
      CONSTANT_STRING: { type: 'string', default: 'default', description: 'Default string value' }
    }

    // STEP 2: Initialize constants manager
    this.constants = createConstantsManager('system-x', this.configSchema)

    // STEP 3: Load and apply configuration
    this.applyConfiguration()
  }

  applyConfiguration() {
    // STEP 4: Extract all constants from config
    const config = this.constants.getAll()

    // STEP 5: Replace all hardcoded values with config values

    // ORIGINAL: this.value = 100;
    this.value = config.CONSTANT_1

    // ORIGINAL: this.setting = 50;
    this.setting = config.CONSTANT_2

    // ORIGINAL: this.direction = new THREE.Vector3(0, 1, 0);
    this.direction = new THREE.Vector3().fromArray([
      config.CONSTANT_OBJECT.x,
      config.CONSTANT_OBJECT.y,
      config.CONSTANT_OBJECT.z
    ])

    // ORIGINAL: this.featureEnabled = true;
    this.featureEnabled = config.CONSTANT_BOOL

    // ORIGINAL: this.defaultText = 'default';
    this.defaultText = config.CONSTANT_STRING

    // STEP 6: Validate configuration (optional but recommended)
    const errors = this.constants.validate()
    if (errors.length > 0) {
      console.warn(`[${this.constructor.name}] Configuration issues:`, errors)
    }

    console.log(`[${this.constructor.name}] Configuration applied:`, config)
  }

  init() {
    // Use configured values instead of hardcoded ones
    this.enabled = this.getConfig('enabled', true)

    // Replace hardcoded initialization
    // before: this.radius = 10
    this.radius = this.getConfig('CONSTANT_RADIUS', 10)

    this.world.on('update', this.update.bind(this))
  }

  update(delta) {
    if (!this.enabled) return

    // Use configured values in update loop
    const speed = this.getConfig('CONSTANT_SPEED', 5)
    const threshold = this.getConfig('CONSTANT_THRESHOLD', 0.1)

    // Logic that uses these configured values
    // (replace with actual system logic)
    const distance = this.world.entities.player.position.distanceTo(this.world.hands)

    if (distance > threshold) {
      // Apply configuration-driven behavior
      this.applySpeed(distance * speed * delta)
    }
  }

  applySpeed(speed) {
    // Logic using configured speed value
    console.log(`[${this.constructor.name}] Applying speed:`, speed)
  }

  // STEP 7: Provide configuration management methods

  /**
   * Get configuration value
   */
  getConfig(key, fallback = null) {
    return this.constants.get(key) ?? fallback
  }

  /**
   * Update configuration (if runtime updates are supported)
   */
  updateConfig(key, value) {
    this.constants.update(key, value)
    console.log(`[${this.constructor.name}] Updated ${key} to ${value}`)
  }

  /**
   * Get all configuration values
   */
  getAllConfig() {
    return this.constants.getAll()
  }

  /**
   * Generate configuration file template
   */
  generateConfigTemplate() {
    return this.constants.exportConfigToJson()
  }
}

/**
 * Copy-Paste Process for Any System (STEP-BY-STEP)
 *
 * 1. Identify constants in your system by searching for:
 *    - Magic numbers: 100, 24, 0.001, etc.
 *    - Default objects: { x: 0, y: 1 }
 *    - Inline configurations: CONSTANTS = {...}
 *
 * 2. Create config schema for all hardcoded values:
 *    CONSTANT_NAME: { type, default, min??, max??, description }
 *
 * 3. Replace constructor:
 *    Add constants manager initialization
 *    Call this.applyConfiguration()
 *
 * 4. Replace hardcoded values:
 *    this.value = config.CONSTANT_NAME (instead of = 100)
 *
 * 5. Add configuration methods:
 *    getConfig(), getAllConfig(), updateConfig(), validateConfig()
 *
 * 6. Create JSON config file:
 *    Export template: system.generateConfigTemplate()
 *    Save as: src/config/your-system.json
 *    Commit to repository
 *
 * RESULT: Clean, configurable, DRY code!
 */

// USAGE EXAMPLE WITH ACTUAL HYPERFY CODE:
// This shows the exact mechanical transformation process

// BEFORE (lines 15-33 in original file):
// const FORWARD = new THREE.Vector3(0, 0, -1)
// const SNAP_DISTANCE = 1
// const SNAP_DEGREES = 5
// const PROJECT_SPEED = 10

// AFTER (configuration-driven):
// this.forward = new THREE.Vector3(...this.getConfig('FORWARD', [0, 0, -1]))
// this.snapDistance = this.getConfig('SNAP_DISTANCE', 1)
// this.snapDegrees = this.getConfig('SNAP_DEGREES', 5)
// this.projectSpeed = this.getConfig('PROJECT_SPEED', 10)

// BEFORE (lines 100+ where constants are used):
// if (distance < SNAP_DISTANCE) { ... }
// velocity = direction * PROJECT_SPEED
// rotation = angle * SNAP_DEGREES

// AFTER (configuration-driven):
// if (distance < this.getConfig('SNAP_DISTANCE')) { ... }
// velocity = direction * this.getConfig('PROJECT_SPEED')
// rotation = angle * this.getConfig('SNAP_DEGREES')

// This pattern can be applied to ANY Hyperfy system:
// - CameraControls → camera.json
// - ClientBuilder → builder.json
// - ClientControls → input.json
// - PlatformerMechanics → platformer.json
// - Physics.js → physics.json
// - Vehicle examples → vehicle.json

// Each migration achieves 100-300 line reductions through configuration externalization.