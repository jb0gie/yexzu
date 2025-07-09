#!/usr/bin/env node

import * as esbuild from 'esbuild'
import fs from 'fs-extra'
import path from 'path'

const isDev = process.argv.includes('--dev')
const isWatch = process.argv.includes('--watch')

// Clean and create client build directory (preserve server build)
await fs.remove('build/client')
await fs.ensureDir('build')
await fs.ensureDir('build/client')

// Copy the unified HTML file (handles both regular and Mini App)
await fs.copy('build/public/index.html', 'build/client/index.html')

// Copy the main app JavaScript and CSS files
await fs.copy('build/public/index-P5CTV26W.js', 'build/client/index-P5CTV26W.js')
await fs.copy('build/public/particles-QM3BZSIW.js', 'build/client/particles-QM3BZSIW.js')
await fs.copy('build/public/index.css', 'build/client/index.css')

// Copy essential assets
await fs.copy('src/client/public/rubik.woff2', 'build/client/rubik.woff2')
await fs.copy('src/client/public/base-environment.glb', 'build/client/base-environment.glb')
await fs.copy('src/client/public/day2-2k.jpg', 'build/client/day2-2k.jpg')
await fs.copy('src/client/public/day2.hdr', 'build/client/day2.hdr')
await fs.copy('src/client/public/particle.png', 'build/client/particle.png')

// Copy manifest to root for discovery
await fs.copy('manifest.json', 'build/manifest.json')

console.log('📦 Building Farcaster Mini App...')

// Build configuration optimized for Mini Apps
const buildConfig = {
  entryPoints: ['src/client/miniapp.js'],
  bundle: true,
  outfile: 'build/client/miniapp.js',
  format: 'esm',
  target: 'es2022',
  platform: 'browser',
  jsx: 'automatic',
  jsxImportSource: '@firebolt-dev/jsx',
  define: {
    'process.env.NODE_ENV': isDev ? '"development"' : '"production"',
    'global': 'globalThis',
  },
  loader: {
    '.js': 'jsx',
    '.jsx': 'jsx',
    '.ts': 'tsx',
    '.tsx': 'tsx',
    '.png': 'dataurl',
    '.jpg': 'dataurl',
    '.jpeg': 'dataurl',
    '.svg': 'dataurl',
    '.woff': 'dataurl',
    '.woff2': 'dataurl',
    '.mp4': 'file',
    '.glb': 'file',
    '.hdr': 'file',
  },
  external: [
    // Exclude Node.js specific modules and server-side dependencies
    'livekit-server-sdk',
    'better-sqlite3',
    'fastify',
    '@fastify/cors',
    '@fastify/static',
    '@fastify/websocket',
    '@fastify/multipart',
    '@fastify/compress',
    'knex',
    'dotenv-flow',
    'fs-extra',
    'jsonwebtoken',
    'node:crypto',
    'node:fs',
    'node:path',
    'node:url'
  ],
  alias: {
    // Browser polyfills for Node.js modules
    'fs': path.resolve('./src/core/polyfills/fs.js'),
    'path': path.resolve('./src/core/polyfills/path.js'),
    'url': path.resolve('./src/core/polyfills/url.js'),
    'module': path.resolve('./src/core/polyfills/module.js'),
  },
  minify: !isDev,
  sourcemap: isDev,
  splitting: false, // Disable code splitting for Mini Apps
  treeShaking: true,
  // Optimize for smaller bundle size
  legalComments: 'none',
  // Mini App specific optimizations
  drop: isDev ? [] : ['console', 'debugger'],
  mangleProps: isDev ? undefined : /^_/,
}

try {
  if (isWatch) {
    const ctx = await esbuild.context(buildConfig)
    await ctx.watch()
    console.log('👀 Watching for changes...')
  } else {
    const result = await esbuild.build(buildConfig)

    // Log bundle size
    const stats = await fs.stat('build/client/miniapp.js')
    const sizeKB = Math.round(stats.size / 1024)
    console.log(`✅ Mini App built successfully! Bundle size: ${sizeKB}KB`)

    if (result.warnings.length > 0) {
      console.warn('⚠️  Build warnings:')
      result.warnings.forEach(warning => console.warn(warning))
    }
  }
} catch (error) {
  console.error('❌ Build failed:', error)
  process.exit(1)
} 