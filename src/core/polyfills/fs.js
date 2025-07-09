// Browser polyfill for fs module
// These are stub implementations that won't work in browser but prevent build errors

export default {
	readFileSync: () => {
		throw new Error('fs.readFileSync is not available in browser')
	},
	writeFileSync: () => {
		throw new Error('fs.writeFileSync is not available in browser')
	},
	existsSync: () => false,
	mkdirSync: () => {
		throw new Error('fs.mkdirSync is not available in browser')
	},
	promises: {
		readFile: () => Promise.reject(new Error('fs.readFile is not available in browser')),
		writeFile: () => Promise.reject(new Error('fs.writeFile is not available in browser')),
		mkdir: () => Promise.reject(new Error('fs.mkdir is not available in browser')),
		access: () => Promise.reject(new Error('fs.access is not available in browser'))
	}
}

export const readFileSync = () => {
	throw new Error('fs.readFileSync is not available in browser')
}

export const writeFileSync = () => {
	throw new Error('fs.writeFileSync is not available in browser')
}

export const existsSync = () => false

export const mkdirSync = () => {
	throw new Error('fs.mkdirSync is not available in browser')
} 