import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)
gsap.config({ nullTargetWarn: false }) // ponytail: empty action lists / unmounted refs spam the console

// Shared easing tokens — keep CoreUI feeling cohesive
export const ease = {
  out: 'power2.out',
  soft: 'power3.out',
  pop: 'back.out(2)',
  drop: 'back.out(1.7)',
}

export const DUR = {
  fast: 0.18,
  norm: 0.3,
  slow: 0.5,
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

// Returns a zero-duration timeline-friendly duration if user prefers reduced motion
export function dur(d) {
  return prefersReducedMotion() ? 0 : d
}

// gsap.utils — omit-value form so callers reuse the same range
export const clamp01 = gsap.utils.clamp(0, 1)
export const clamp = gsap.utils.clamp
export const mapRange = gsap.utils.mapRange
export const interpolate = gsap.utils.interpolate

export { gsap, useGSAP }
