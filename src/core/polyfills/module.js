// Browser polyfill for module
// Provides stub implementations for browser context

export const createRequire = () => {
	return () => {
		throw new Error('require() is not available in browser context')
	}
}

export default {
	createRequire
} 