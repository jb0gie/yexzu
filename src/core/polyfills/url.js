// Browser polyfill for url module
// Uses native browser URL API

export const fileURLToPath = (url) => {
	if (typeof url === 'string') {
		url = new URL(url)
	}

	if (url.protocol !== 'file:') {
		throw new Error('URL must be a file URL')
	}

	return decodeURIComponent(url.pathname)
}

export const pathToFileURL = (path) => {
	if (typeof path !== 'string') {
		throw new Error('Path must be a string')
	}

	// Simple implementation for browser context
	return new URL(`file://${path}`)
}

export default {
	fileURLToPath,
	pathToFileURL,
	URL: globalThis.URL,
	URLSearchParams: globalThis.URLSearchParams
} 