// Shader sky demo — user-authored GLSL on the sky dome (port of upstream 602a121b).
//
// CONTRACT: your `shader` code is injected inside main() of a wrapper fragment
// shader. You get these in scope to read:
//   vec3 direction  — normalized view direction from the sky dome center
//   vec2 vUv        — sphere UV
//   float uTime     — seconds since the sky shader became active
//   vec2 uResolution— renderer drawing-buffer size in px
// plus any `shaderUniforms` you declare (numbers → float, arrays → vec2/3/4).
// Expect to WRITE: vec3 color (and optionally float alpha).
// Output is written as-is: no tonemapping or color-space conversion.
//
// Pattern: app.create('sky') + app.add(sky), then set props live.
// NOTE: hyperfy's sunDirection is the direction light TRAVELS (points at the
// scene), so the visible sun sits at -sunDirection.

const DAY_SKY = `
  // simple gradient + sun disc toward the CSM sun direction
  float h = direction.y;
  vec3 zenith = vec3(0.12, 0.36, 0.78);
  vec3 horizon = vec3(0.78, 0.88, 0.98);
  vec3 ground = vec3(0.35, 0.32, 0.28);
  vec3 sky = mix(ground, horizon, smoothstep(-0.1, 0.02, h));
  sky = mix(sky, zenith, smoothstep(0.02, 0.45, h));
  vec3 sunDir = normalize(-vec3(uSunDirection.x, uSunDirection.y, uSunDirection.z));
  float sun = pow(max(dot(direction, sunDir), 0.0), 8.0);
  sky += vec3(1.0, 0.9, 0.7) * sun * 1.5;
  color = sky;
`

const CLOUDS = `
  // drifting FBM cloud layer
  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
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
  float h = direction.y;
  vec3 sky = mix(vec3(0.35, 0.32, 0.28), vec3(0.72, 0.82, 0.92), smoothstep(-0.1, 0.3, h));
  vec2 p = direction.xz / max(direction.y + 0.12, 0.08);
  p *= 0.35;
  p += vec2(uTime * uCloudSpeed, uTime * uCloudSpeed * 0.3);
  float n = fbm(p);
  float layer = smoothstep(uCloudCover, uCloudCover + 0.35, n);
  float mask = smoothstep(-0.02, 0.15, direction.y);
  sky = mix(sky, vec3(1.0, 1.0, 1.0), layer * mask * 0.9);
  color = sky;
`

const NIGHT = `
  // twinkling hash-grid starfield
  float hash13(vec3 p3) {
    p3 = fract(p3 * 0.1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
  }
  float h = direction.y;
  vec3 sky = mix(vec3(0.05, 0.04, 0.08), vec3(0.01, 0.01, 0.03), smoothstep(0.0, 0.4, h));
  vec3 cell = floor(direction * 110.0);
  vec3 f = fract(direction * 110.0);
  vec3 starPos = vec3(hash13(cell + 0.7), hash13(cell + 1.3), hash13(cell + 2.1)) - 0.5;
  float d = length(f - 0.5 - starPos);
  float twinkle = 0.6 + 0.4 * hash13(cell + floor(uTime * 0.7) + 3.7);
  sky += vec3(1.0) * smoothstep(0.022, 0.0, d) * twinkle * uStarsDensity;
  color = sky;
`

const sky = app.create('sky', {
  shader: DAY_SKY,
  shaderUniforms: { uSunDirection: [-1, -2, -2] }, // match baseEnvironment sunDirection
})
app.add(sky)
app.keepActive = true

app.configure([
  { key: 'sky', type: 'dropdown', label: 'Sky Shader', initial: 'day', options: ['day', 'clouds', 'night'] },
  { key: 'cloudCover', type: 'range', label: 'Cloud Cover', initial: 0.35, min: 0, max: 1, step: 0.05, dp: 2 },
  { key: 'cloudSpeed', type: 'range', label: 'Cloud Speed', initial: 0.02, min: 0, max: 0.2, step: 0.01, dp: 2 },
  { key: 'starsDensity', type: 'range', label: 'Stars', initial: 0.8, min: 0, max: 1, step: 0.05, dp: 2 },
])

// Apply live inspector changes only when the relevant values actually change
// (assigning shader/shaderUniforms triggers a recompile via updateSky).
const snippets = { day: DAY_SKY, clouds: CLOUDS, night: NIGHT }
let last = {}

app.on('update', () => {
  const cfg = app.config
  if (cfg.sky !== last.sky) {
    last.sky = cfg.sky
    const next = snippets[cfg.sky]
    if (next && sky.shader !== next) sky.shader = next
  }
  const target =
    cfg.sky === 'clouds' ? ['clouds', cfg.cloudCover, cfg.cloudSpeed] :
    cfg.sky === 'night' ? ['night', cfg.starsDensity] : ['day']
  if (String(target) !== String(last.hash)) {
    last.hash = target
    sky.shaderUniforms =
      cfg.sky === 'clouds' ? { uCloudCover: cfg.cloudCover, uCloudSpeed: cfg.cloudSpeed } :
      cfg.sky === 'night' ? { uStarsDensity: cfg.starsDensity } :
      { uSunDirection: [-1, -2, -2] }
  }
})