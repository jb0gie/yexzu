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
// This demo: the APP owns the day/night orbit (single source of truth). Each
// frame it computes the sun direction and pushes it to BOTH the shader sun
// disc and the directional-light shadows via world.environment.setSunDirection()
// — so the visible sun and the shadows always agree. The moon orbits 4x slower
// than the sun, so its phases emerge from the sun angle. Clouds drift via uTime.

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
  // ---- sun direction comes from the app (uSunDirection uniform) so the
  //      directional-light shadows stay in sync with the visible disc ----
  vec3 sunDir = normalize(uSunDirection);
  float sunElev = sunDir.y;
  float day = smoothstep(-0.15, 0.15, sunElev);   // 0 = night, 1 = noon
  float night = 1.0 - day;

  // ---- base gradient blended by time of day ----
  float h = direction.y;
  vec3 zenithDay = vec3(0.12, 0.36, 0.78);
  vec3 horizonDay = vec3(0.78, 0.88, 0.98);
  vec3 zenithNight = vec3(0.015, 0.018, 0.045);
  vec3 horizonNight = vec3(0.025, 0.025, 0.04);
  vec3 ground = vec3(0.18, 0.16, 0.14);
  vec3 sky = mix(ground, mix(horizonNight, horizonDay, day), smoothstep(-0.1, 0.02, h));
  sky = mix(sky, mix(zenithNight, zenithDay, day), smoothstep(0.02, 0.45, h));

  // ---- sun: crisp disk + hot core + corona ----
  float sunDot = max(dot(direction, sunDir), 0.0);
  float warm = smoothstep(0.0, 0.35, sunElev);
  vec3 sunTint = mix(vec3(1.0, 0.32, 0.08), vec3(1.0, 0.95, 0.85), warm);
  float sunEdge = 0.9999;
  float sunDisk = smoothstep(sunEdge - 0.00008, sunEdge, sunDot);
  float sunCore = pow(sunDot, 14.0);
  float sunCorona = pow(sunDot, 2.5) * 0.4;
  sky += sunTint * (sunDisk * 2.0 + sunCore * 0.5) * day;
  sky += sunTint * sunCorona * day * 0.45;

  // ---- moon: slow orbit, phases from sun angle, maria blotches ----
  float moonAngle = uTime * uCycleSpeed * 0.25;      // moon orbits 4x slower than the sun
  vec3 moonDir = normalize(vec3(cos(moonAngle) * 0.9, 0.25 + sin(moonAngle) * 0.45, sin(moonAngle) * 0.9));
  float moonDot = max(dot(direction, moonDir), 0.0);
  float moonEdge = 0.99955;                          // ~1.7 deg apparent disk
  float moonMask = smoothstep(moonEdge - 0.00015, moonEdge, moonDot);
  float moonLit = smoothstep(-0.05, 0.15, dot(direction, sunDir));  // phase terminator
  vec3 moonTangent = normalize(cross(moonDir, vec3(0.0, 1.0, 0.0)));
  vec3 moonBitangent = cross(moonDir, moonTangent);
  vec2 mariaUV = vec2(dot(direction, moonTangent), dot(direction, moonBitangent));
  float maria = fbm(mariaUV * 120.0 + 5.0) * 0.7 + fbm(mariaUV * 400.0) * 0.3;
  float moonAlbedo = mix(0.22, 1.0, smoothstep(0.4, 0.6, maria));
  float moonShade = 0.2 + 0.8 * moonLit;
  vec3 moonColor = vec3(0.88, 0.9, 0.98) * moonAlbedo;
  sky += moonColor * moonMask * moonShade * night * 1.2;
  sky += vec3(0.85, 0.88, 0.95) * pow(moonDot, 6.0) * night * 0.06;  // soft halo

  // ---- stars (twinkle, fade out with day) ----
  vec3 cell = floor(direction * 90.0);
  vec3 f = fract(direction * 90.0);
  vec3 starPos = vec3(hash13(cell + 0.7), hash13(cell + 1.3), hash13(cell + 2.1)) - 0.5;
  float starDist = length(f - 0.5 - starPos);
  float twinkle = 0.6 + 0.4 * hash13(cell + floor(uTime * 0.7) + 3.7);
  float stars = smoothstep(0.02, 0.0, starDist) * twinkle;
  sky += vec3(1.0) * stars * night * uStarsDensity * 2.4;

  // ---- clouds (drifting FBM, dark at night) ----
  float cmask = smoothstep(-0.05, 0.3, direction.y);
  vec2 cp = direction.xz / max(direction.y + 0.15, 0.1);
  cp *= 1.2;
  cp += vec2(uTime * uCloudSpeed, uTime * uCloudSpeed * 0.3);
  float cn = fbm(cp);
  float clouds = smoothstep(0.35, 0.6, cn);
  float cloudop = clouds * uCloudCover * cmask;
  vec3 cloudCol = mix(vec3(0.03, 0.035, 0.05), vec3(1.0, 1.0, 1.0), day);
  sky = mix(sky, cloudCol, clamp(cloudop, 0.0, 1.0));

  color = sky;
`

const sky = app.create('sky', {
  shader: CYCLE,
  shaderHeader: SKY_HEADER,
  shaderUniforms: {
    uSunDirection: [0, 0.63, 0.8], // noon-ish; the app overwrites this every frame
    uCycleSpeed: 0.005,
    uCloudCover: 1.0,
    uCloudSpeed: 0.01,
    uStarsDensity: 0.9,
  },
})
app.add(sky)
app.keepActive = true

app.configure([
  { key: 'cycleSpeed', type: 'range', label: 'Cycle Speed', initial: 0.005, min: 0.001, max: 0.02, step: 0.001, dp: 3 },
  { key: 'cloudCover', type: 'range', label: 'Cloud Cover', initial: 1.0, min: 0, max: 1, step: 0.05, dp: 2 },
  { key: 'cloudSpeed', type: 'range', label: 'Cloud Speed', initial: 0.01, min: 0, max: 0.1, step: 0.005, dp: 3 },
  { key: 'starsDensity', type: 'range', label: 'Stars', initial: 0.9, min: 0, max: 1, step: 0.05, dp: 2 },
])

// Push inspector values into the shader uniforms only when they change
// (assigning shaderUniforms triggers a recompile via updateSky). The sun
// direction is NOT part of this — it changes every frame and is pushed live
// via setSunDirection so it never causes a recompile.
let last = null
let elapsed = 0

app.on('update', delta => {
  elapsed += delta

  // Day/night orbit — SINGLE source of truth for the visible sun disc AND the
  // directional-light shadows (CSM), so they always agree.
  const phase = (elapsed * app.config.cycleSpeed) % 1
  const angle = phase * 6.28318
  const sunDir = new Vector3(
    Math.cos(angle),
    Math.sin(angle) * 0.75 - 0.12,
    Math.sin(angle) * 0.8
  ).normalize()
  world.environment?.setSunDirection(sunDir)

  const cfg = app.config
  const target = { uCycleSpeed: cfg.cycleSpeed, uCloudCover: cfg.cloudCover, uCloudSpeed: cfg.cloudSpeed, uStarsDensity: cfg.starsDensity }
  if (JSON.stringify(target) !== JSON.stringify(last)) {
    last = target
    sky.shaderUniforms = target
  }
})