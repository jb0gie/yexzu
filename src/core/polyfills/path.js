// Browser polyfill for path module
// Basic implementations that work in browser context

export default {
	join: (...segments) => {
		return segments
			.filter(segment => segment && typeof segment === 'string')
			.join('/')
			.replace(/\/+/g, '/')
			.replace(/\/$/, '') || '/'
	},

	resolve: (...paths) => {
		let resolvedPath = ''
		for (let i = paths.length - 1; i >= 0; i--) {
			const path = paths[i]
			if (path && typeof path === 'string') {
				if (path.startsWith('/')) {
					resolvedPath = path
					break
				} else {
					resolvedPath = path + '/' + resolvedPath
				}
			}
		}
		return resolvedPath || '/'
	},

	dirname: (path) => {
		if (!path || typeof path !== 'string') return '.'
		const lastSlash = path.lastIndexOf('/')
		if (lastSlash === -1) return '.'
		if (lastSlash === 0) return '/'
		return path.slice(0, lastSlash)
	},

	basename: (path, ext) => {
		if (!path || typeof path !== 'string') return ''
		const lastSlash = path.lastIndexOf('/')
		let base = lastSlash === -1 ? path : path.slice(lastSlash + 1)
		if (ext && base.endsWith(ext)) {
			base = base.slice(0, -ext.length)
		}
		return base
	},

	extname: (path) => {
		if (!path || typeof path !== 'string') return ''
		const lastDot = path.lastIndexOf('.')
		const lastSlash = path.lastIndexOf('/')
		if (lastDot === -1 || lastDot < lastSlash) return ''
		return path.slice(lastDot)
	},

	sep: '/',
	delimiter: ':'
}

export const join = (...segments) => {
	return segments
		.filter(segment => segment && typeof segment === 'string')
		.join('/')
		.replace(/\/+/g, '/')
		.replace(/\/$/, '') || '/'
}

export const resolve = (...paths) => {
	let resolvedPath = ''
	for (let i = paths.length - 1; i >= 0; i--) {
		const path = paths[i]
		if (path && typeof path === 'string') {
			if (path.startsWith('/')) {
				resolvedPath = path
				break
			} else {
				resolvedPath = path + '/' + resolvedPath
			}
		}
	}
	return resolvedPath || '/'
}

export const dirname = (path) => {
	if (!path || typeof path !== 'string') return '.'
	const lastSlash = path.lastIndexOf('/')
	if (lastSlash === -1) return '.'
	if (lastSlash === 0) return '/'
	return path.slice(0, lastSlash)
}

export const basename = (path, ext) => {
	if (!path || typeof path !== 'string') return ''
	const lastSlash = path.lastIndexOf('/')
	let base = lastSlash === -1 ? path : path.slice(lastSlash + 1)
	if (ext && base.endsWith(ext)) {
		base = base.slice(0, -ext.length)
	}
	return base
}

export const extname = (path) => {
	if (!path || typeof path !== 'string') return ''
	const lastDot = path.lastIndexOf('.')
	const lastSlash = path.lastIndexOf('/')
	if (lastDot === -1 || lastDot < lastSlash) return ''
	return path.slice(lastDot)
}

export const sep = '/'
export const delimiter = ':' 