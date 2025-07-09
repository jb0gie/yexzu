import { System } from './System.js'

export class MiniAppOptimizer extends System {
	init() {
		this.isMiniApp = this.world.config?.miniAppMode || false
		this.performanceProfile = this.world.config?.performanceProfile || 'balanced'
		this.optimizations = new Set()

		if (this.isMiniApp) {
			this.applyMiniAppOptimizations()
		}
	}

	applyMiniAppOptimizations() {
		// Apply performance optimizations for Mini App context
		this.optimizeRendering()
		this.optimizePhysics()
		this.optimizeNetworking()
		this.optimizeAssets()
		this.optimizeUI()

		// Monitor performance and adjust dynamically
		this.startPerformanceMonitoring()
	}

	optimizeRendering() {
		const graphics = this.world.getSystem('graphics')
		if (!graphics) return

		const profile = this.getPerformanceProfile()

		// Apply rendering optimizations based on performance profile
		if (profile.shadowQuality !== undefined) {
			graphics.setShadowMapSize(profile.shadowQuality)
			this.optimizations.add('shadows')
		}

		if (profile.textureQuality !== undefined) {
			graphics.setTextureMaxSize(profile.textureQuality)
			this.optimizations.add('textures')
		}

		if (profile.antialiasing !== undefined) {
			graphics.setAntialiasingLevel(profile.antialiasing)
			this.optimizations.add('antialiasing')
		}

		// Reduce particle system complexity
		const particles = this.world.getSystem('particles')
		if (particles && profile.particleCount) {
			particles.setMaxParticles(profile.particleCount)
			this.optimizations.add('particles')
		}

		// Optimize LOD (Level of Detail) more aggressively
		const lods = this.world.getSystem('lods')
		if (lods && profile.lodBias) {
			lods.setBias(profile.lodBias)
			this.optimizations.add('lod')
		}
	}

	optimizePhysics() {
		const physics = this.world.getSystem('physics')
		if (!physics) return

		const profile = this.getPerformanceProfile()

		// Reduce physics simulation frequency for Mini Apps
		if (profile.physicsRate) {
			physics.setSimulationRate(profile.physicsRate)
			this.optimizations.add('physics_rate')
		}

		// Simplify collision detection
		if (profile.collisionComplexity) {
			physics.setCollisionComplexity(profile.collisionComplexity)
			this.optimizations.add('collision')
		}
	}

	optimizeNetworking() {
		const network = this.world.getSystem('network')
		if (!network) return

		const profile = this.getPerformanceProfile()

		// Reduce network update frequency for embedded context
		if (profile.networkRate) {
			network.setUpdateRate(profile.networkRate)
			this.optimizations.add('network_rate')
		}

		// Optimize data compression
		if (profile.compressionLevel) {
			network.setCompressionLevel(profile.compressionLevel)
			this.optimizations.add('compression')
		}
	}

	optimizeAssets() {
		const loader = this.world.getSystem('loader')
		if (!loader) return

		const profile = this.getPerformanceProfile()

		// Preload only essential assets
		if (this.isMiniApp) {
			loader.setPreloadStrategy('essential')
			this.optimizations.add('asset_preload')
		}

		// Use compressed texture formats
		if (profile.textureCompression) {
			loader.enableTextureCompression(true)
			this.optimizations.add('texture_compression')
		}
	}

	optimizeUI() {
		const ui = this.world.getSystem('ui')
		if (!ui) return

		// Reduce UI update frequency
		if (this.isMiniApp) {
			ui.setUpdateRate(30) // 30fps for UI updates
			this.optimizations.add('ui_rate')
		}

		// Simplify UI elements for smaller viewport
		ui.setSimplifiedMode(true)
		this.optimizations.add('ui_simplified')
	}

	getPerformanceProfile() {
		const profiles = {
			minimal: {
				shadowQuality: 512,        // Small shadow maps
				textureQuality: 512,       // Max 512px textures
				antialiasing: 0,           // No antialiasing
				particleCount: 50,         // Very few particles
				lodBias: 2.0,              // Aggressive LOD
				physicsRate: 30,           // 30Hz physics
				collisionComplexity: 'low',
				networkRate: 4,            // 4Hz network updates
				compressionLevel: 'high',
				textureCompression: true
			},
			balanced: {
				shadowQuality: 1024,       // Medium shadow maps
				textureQuality: 1024,      // Max 1024px textures
				antialiasing: 1,           // Basic antialiasing
				particleCount: 100,        // Moderate particles
				lodBias: 1.5,              // Moderate LOD
				physicsRate: 50,           // 50Hz physics
				collisionComplexity: 'medium',
				networkRate: 6,            // 6Hz network updates
				compressionLevel: 'medium',
				textureCompression: true
			},
			quality: {
				shadowQuality: 2048,       // High quality shadows
				textureQuality: 2048,      // High resolution textures
				antialiasing: 2,           // Better antialiasing
				particleCount: 200,        // More particles
				lodBias: 1.0,              // Standard LOD
				physicsRate: 60,           // 60Hz physics
				collisionComplexity: 'high',
				networkRate: 8,            // 8Hz network updates
				compressionLevel: 'low',
				textureCompression: false
			}
		}

		return profiles[this.performanceProfile] || profiles.balanced
	}

	startPerformanceMonitoring() {
		this.performanceInterval = setInterval(() => {
			this.checkPerformance()
		}, 5000) // Check every 5 seconds
	}

	checkPerformance() {
		const stats = this.world.getSystem('stats')
		if (!stats) return

		const fps = stats.getFPS()
		const memoryUsage = performance.memory ? performance.memory.usedJSHeapSize / 1024 / 1024 : 0

		// Auto-adjust performance if needed
		if (fps < 30 && this.performanceProfile !== 'minimal') {
			this.degradePerformanceProfile()
		} else if (fps > 50 && memoryUsage < 100 && this.performanceProfile === 'minimal') {
			this.improvePerformanceProfile()
		}
	}

	degradePerformanceProfile() {
		const profiles = ['quality', 'balanced', 'minimal']
		const currentIndex = profiles.indexOf(this.performanceProfile)

		if (currentIndex < profiles.length - 1) {
			this.performanceProfile = profiles[currentIndex + 1]
			this.applyMiniAppOptimizations()

			console.log(`Performance degraded to: ${this.performanceProfile}`)
			this.world.emit('performance:degraded', { profile: this.performanceProfile })
		}
	}

	improvePerformanceProfile() {
		const profiles = ['minimal', 'balanced', 'quality']
		const currentIndex = profiles.indexOf(this.performanceProfile)

		if (currentIndex > 0) {
			this.performanceProfile = profiles[currentIndex - 1]
			this.applyMiniAppOptimizations()

			console.log(`Performance improved to: ${this.performanceProfile}`)
			this.world.emit('performance:improved', { profile: this.performanceProfile })
		}
	}

	// Memory management for Mini Apps
	optimizeMemoryUsage() {
		// Clean up unused resources more aggressively
		const loader = this.world.getSystem('loader')
		if (loader) {
			loader.cleanupUnusedAssets()
		}

		// Force garbage collection if available
		if (window.gc) {
			window.gc()
		}

		this.optimizations.add('memory_cleanup')
	}

	// Adaptive quality based on viewport size
	adaptToViewportSize() {
		const viewport = this.world.config?.viewport
		if (!viewport) return

		const rect = viewport.getBoundingClientRect()
		const area = rect.width * rect.height

		// Adjust quality based on viewport size
		if (area < 300000) { // Small viewport
			this.performanceProfile = 'minimal'
		} else if (area < 600000) { // Medium viewport
			this.performanceProfile = 'balanced'
		} else { // Large viewport
			this.performanceProfile = 'quality'
		}

		this.applyMiniAppOptimizations()
	}

	// Get optimization status
	getOptimizationStatus() {
		return {
			isMiniApp: this.isMiniApp,
			performanceProfile: this.performanceProfile,
			activeOptimizations: Array.from(this.optimizations),
			isMonitoring: !!this.performanceInterval
		}
	}

	// Enable/disable specific optimizations
	setOptimization(name, enabled) {
		if (enabled) {
			this.optimizations.add(name)
		} else {
			this.optimizations.delete(name)
		}

		// Reapply optimizations
		this.applyMiniAppOptimizations()
	}

	destroy() {
		if (this.performanceInterval) {
			clearInterval(this.performanceInterval)
		}
		super.destroy()
	}
} 