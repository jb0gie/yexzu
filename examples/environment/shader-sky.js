// Shader sky demo — single GLSL shader driving a full DAY/NIGHT CYCLE on the
// sky dome (port of upstream 602a121b + shaderHeader global-slot fix).
//
// CONTRACT:
//   shader        — code injected INSIDE main(). You get `direction` (vec3,
//                   normalized view dir), `vUv`, `uTime`, `uResolution`, and
//                   any `shaderUniforms` declared for you. WRITE `color` (and
//                   optionally `alpha`). Output is written as-is (no tonemap).
//   shaderHeader  — GLSL injected at GLOBAL scope BEFORE main(). Put helper
//                   function definitions here. (You cannot define functions
//                   inside `shader` — it runs inside main().)
//   shaderUniforms— plain object: numbers → float, arrays → vec2/3/4.
//
// This demo: uTime drives a day/night cycle — the sun azimuth rotates and its
// elevation dips below the horizon at night; gradient, sun, moon, stars and
// clouds all blend by sun elevation. No preset switching needed.

// Global helper functions (injected before main())
const SKY_HEADER = `
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
  return v;
}
`

const CYCLE = `
  // ---- sun position from time (full day/night cycle) ----
  float phase = fract(uTime * uCycleSpeed);
  float sunAngle = phase * 6.28318;
  vec3 sunDir = normalize(vec3(
    cos(sunAngle),
    sin(sunAngle) * 0.75 - 0.12,   // dips below horizon -> night
    sin(sunAngle) * 0.8
  ));
  float sunElev = sunDir.y;
  float day = smoothstep(-0.15, 0.15, sunElev);   // 0 = night, 1 = noon
  float night = 1.0 - day;

  // ---- base gradient blended by time of day ----
  float h = direction.y;
  vec3 zenithDay = vec3(0.12, 0.36, 0.78);
  vec3 horizonDay = vec3(0.78, 0.88, 0.98);
  vec3 zenithNight = vec3(0.015, 0.018, 0.045);
  vec3 horizonNight = vec3(0.07, 0.07, 0.11);
  vec3 ground = vec3(0.18, 0.16, 0.14);
  vec3 sky = mix(ground, mix(horizonNight, horizonDay, day), smoothstep(-0.1, 0.02, h));
  sky = mix(sky, mix(zenithNight, zenithDay, day), smoothstep(0.02, 0.45, h));

  // ---- sun disc + halo (only while the sun is up) ----
  float sunDot = max(dot(direction, sunDir), 0.0);
  float warm = smoothstep(0.0, 0.35, sunElev);
  vec3 sunTint = mix(vec3(1.0, 0.32, 0.08), vec3(1.0, 0.95, 0.85), warm);
  float disc = pow(sunDot, 8.0);
  float halo = pow(sunDot, 2.5) * 0.2 * (0.05 + 0.95 * day);
  sky += sunTint * (disc * day * 1.6 + halo * day);

  // ---- moon opposite the sun (night only) ----
  vec3 moonDir = -sunDir;
  float moonDot = max(dot(direction, moonDir), 0.0);
  sky += vec3(0.85, 0.88, 0.95) * smoothstep(0.997, 0.9998, moonDot) * night * 1.5;
  sky += vec3(0.85, 0.88, 0.95) * pow(moonDot, 8.0) * 0.15 * night;

  // ---- stars (twinkle, fade out with day) ----
  vec3 cell = floor(direction * 90.0);
  vec3 f = fract(direction * 90.0);
  vec3 starPos = vec3(hash13(cell + 0.7), hash13(cell + 1.3), hash13(cell + 2.1)) - 0.5;
  float starDist = length(f - 0.5 - starPos);
  float twinkle = 0.6 + 0.4 * hash13(cell + floor(uTime * 0.7) + 3.7);
  float stars = smoothstep(0.02, 0.0, starDist) * twinkle;
  sky += vec3(1.0) * stars * night * uStarsDensity * 2.4;

  // ---- clouds (drifting FBM, tinted by time of day) ----
  float cmask = smoothstep(-0.05, 0.3, direction.y);
  vec2 cp = direction.xz / max(direction.y + 0.15, 0.1);
  cp *= 1.2;
  cp += vec2(uTime * uCloudSpeed, uTime * uCloudSpeed * 0.3);
  float cn = fbm(cp);
  float clouds = smoothstep(0.35, 0.6, cn);
  float cloudop = clouds * uCloudCover * cmask;
  vec3 cloudCol = mix(vec3(0.5, 0.5, 0.58), vec3(1.0, 1.0, 1.0), day);
  sky = mix(sky, cloudCol, clamp(cloudop, 0.0, 1.0));

  color = sky;
`

const sky = app.create('sky', {
  shader: CYCLE,
  shaderHeader: SKY_HEADER,
  shaderUniforms: {
    uCycleSpeed: 0.05,
    uCloudCover: 1.0,
    uCloudSpeed: 0.01,
    uStarsDensity: 0.9,
  },
})
app.add(sky)
app.keepActive = true

app.configure([
  { key: 'cycleSpeed', type: 'range', label: 'Cycle Speed', initial: 0.05, min: 0, max: 0.5, step: 0.01, dp: 2 },
  { key: 'cloudCover', type: 'range', label: 'Cloud Cover', initial: 1.0, min: 0, max: 1, step: 0.05, dp: 2 },
  { key: 'cloudSpeed', type: 'range', label: 'Cloud Speed', initial: 0.01, min: 0, max: 0.1, step: 0.005, dp: 3 },
  { key: 'starsDensity', type: 'range', label: 'Stars', initial: 0.9, min: 0, max: 1, step: 0.05, dp: 2 },
])

// Push inspector values into the shader uniforms only when they change
// (assigning shaderUniforms triggers a recompile via updateSky).
let last = null

app.on('update', () => {
  const cfg = app.config
  const target = { uCycleSpeed: cfg.cycleSpeed, uCloudCover: cfg.cloudCover, uCloudSpeed: cfg.cloudSpeed, uStarsDensity: cfg.starsDensity }
  if (JSON.stringify(target) !== JSON.stringify(last)) {
    last = target
    sky.shaderUniforms = target
  }
})