// boltSky — sky authority for the bolt world
//
// Owns the shader dome + preset. Tablets (later) are request senders + mirrors,
// same split as booth vs speakers. This file is the booth.
//
// Event contract (server world bus, channel must match tablets):
//   '<ch>:sky:request'     { action, value?, key? }
//     preset  -> value is one of PRESETS
//     uniform -> key + value (cycleSpeed, cloudCover, cloudSpeed,
//                starsDensity, moonEmissive, fogOn, fogNear, fogFar, fogColor)
//   '<ch>:sky:state'       snapshot for remotes (no per-frame sun)
//   '<ch>:sky:querystate'  rebuild heal — authority re-emits state
//
// Presets are viz modes in ONE GLSL (uMode float). Motion from uTime; audio
// bands (uVolume/uBass/uMid/uTreble) live-forward from the rig speaker FFT
// when keys match — no material rebuild. Idle amp floor keeps the look alive
// with no track.
//
// uSunDirection stays in every shaderUniforms SET, out of the rebuild trigger.

app.configure([
  {
    key: 'channelSection',
    type: 'section',
    label: 'Sky Authority',
  },
  {
    key: 'channel',
    type: 'text',
    label: 'Channel',
    initial: 'bolt',
    hint: 'must match tablets / booth',
  },
  {
    key: 'preset',
    type: 'switch',
    label: 'Preset',
    options: [
      { label: 'Cycle', value: 'cycle' },
      { label: 'Bars', value: 'bars' },
      { label: 'Wave', value: 'wave' },
      { label: 'Tunnel', value: 'tunnel' },
      { label: 'Plasma', value: 'plasma' },
      { label: 'Burst', value: 'burst' },
      { label: 'Radar', value: 'radar' },
      { label: 'Grid', value: 'grid' },
      { label: 'Storm', value: 'storm' },
      { label: 'Kaleido', value: 'kaleido' },
      { label: 'Rain', value: 'rain' },
      { label: 'Nova', value: 'nova' },
      { label: 'Aurora', value: 'aurora' },
      { label: 'Bloom', value: 'bloom' },
      { label: 'Spiral', value: 'spiral' },
    ],
    initial: 'cycle',
    hint: 'visualiser look — cycle is day/night, the rest are Milkdrop energy',
  },
  {
    key: 'debug',
    type: 'switch',
    label: 'Debug Logging',
    options: [
      { label: 'Enabled', value: 'enabled' },
      { label: 'Disabled', value: 'disabled' },
    ],
    initial: 'disabled',
  },
  {
    key: 'cycleSection',
    type: 'section',
    label: 'Cycle / Tempo',
  },
  { key: 'cycleSpeed', type: 'range', label: 'Cycle Speed', initial: 0.005, min: 0.001, max: 0.02, step: 0.001, dp: 3 },
  { key: 'cloudCover', type: 'range', label: 'Cloud Cover', initial: 1.0, min: 0, max: 1, step: 0.05, dp: 2 },
  { key: 'cloudSpeed', type: 'range', label: 'Cloud Speed', initial: 0.01, min: 0, max: 0.1, step: 0.005, dp: 3 },
  { key: 'starsDensity', type: 'range', label: 'Stars', initial: 0.9, min: 0, max: 1, step: 0.05, dp: 2 },
  { key: 'moonEmissive', type: 'range', label: 'Moon Glow', initial: 0.6, min: 0, max: 1, step: 0.05, dp: 2 },
  {
    key: 'fogSection',
    type: 'section',
    label: 'Fog',
  },
  { key: 'fogOn', type: 'toggle', label: 'Fog', initial: true },
  { key: 'fogNear', type: 'range', label: 'Fog Near', initial: 350, min: 0, max: 899, step: 10 },
  { key: 'fogFar', type: 'range', label: 'Fog Far', initial: 900, min: 100, max: 2000, step: 10 },
  { key: 'fogColor', type: 'color', label: 'Fog Color', initial: '#cfe0f2' },
])

const CHANNEL = props.channel || 'bolt'
const REQ_EVENT = `${CHANNEL}:sky:request`
const STATE_EVENT = `${CHANNEL}:sky:state`
const QUERYSTATE_EVENT = `${CHANNEL}:sky:querystate`
const APPLY_EVENT = 'sky:apply'

const PRESETS = {
  cycle: 0,
  bars: 1,
  wave: 2,
  tunnel: 3,
  plasma: 4,
  burst: 5,
  radar: 6,
  grid: 7,
  storm: 8,
  kaleido: 9,
  rain: 10,
  nova: 11,
  aurora: 12,
  bloom: 13,
  spiral: 14,
}

function debugLog(...args) {
  if (props.debug === 'enabled') console.log('[boltSky]', ...args)
}

function modeOf(name) {
  const n = PRESETS[name]
  return n === undefined ? 0 : n
}

function snapshotFrom(src) {
  return {
    preset: src.preset || 'cycle',
    cycleSpeed: Number(src.cycleSpeed ?? 0.005),
    cloudCover: Number(src.cloudCover ?? 1),
    cloudSpeed: Number(src.cloudSpeed ?? 0.01),
    starsDensity: Number(src.starsDensity ?? 0.9),
    moonEmissive: Number(src.moonEmissive ?? 0.6),
    fogOn: src.fogOn !== false,
    fogNear: Number(src.fogNear ?? 350),
    fogFar: Number(src.fogFar ?? 900),
    fogColor: src.fogColor || '#cfe0f2',
  }
}

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
vec3 pal(float t) {
  return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
}
float boltDist(vec2 p, float seed) {
  float minD = 9.0;
  float aAz = (hash(vec2(seed, 0.11)) - 0.5) * 2.6;
  float aH = 0.98;
  for (int i = 1; i <= 16; i++) {
    float fi = float(i);
    float bH = 0.98 - fi * 0.122;
    float bAz = aAz + (hash(vec2(seed, fi + 0.73)) - 0.5) * 0.34;
    vec2 ba = vec2(bAz - aAz, bH - aH);
    vec2 pa = p - vec2(aAz, aH);
    float hh = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
    minD = min(minD, length(pa - ba * hh));
    aAz = bAz;
    aH = bH;
  }
  return minD;
}
vec3 vizMode(vec3 dir, float h, float mode) {
  float az = atan(dir.z, dir.x);
  float nAz = az * 0.318309886;
  float t = uTime;
  float tempo = 0.5 + uCycleSpeed * 80.0;
  float vol = uVolume;
  float bass = uBass;
  float mid = uMid;
  float tre = uTreble;
  float amp = 0.35 + vol * 1.65;
  vec3 viz = vec3(0.01, 0.012, 0.03);
  if (mode < 1.5) {
    float cols = 28.0;
    float c = floor((nAz * 0.5 + 0.5) * cols);
    float fracCol = fract((nAz * 0.5 + 0.5) * cols);
    float pulse = 0.5 + 0.5 * sin(t * tempo + c * 1.7);
    float band = mix(bass, tre, clamp(c / cols, 0.0, 1.0));
    float hgt = (0.08 + (0.25 + band * 0.7) * hash(vec2(c, floor(t * 8.0)))) * pulse * (0.5 + amp);
    float colMask = smoothstep(0.15, 0.05, abs(fracCol - 0.5));
    float bar = smoothstep(hgt, hgt - 0.02, h) * step(0.0, h) * colMask;
    viz += mix(vec3(0.0, 1.0, 0.9), vec3(1.0, 0.0, 0.7), clamp(h / 0.7, 0.0, 1.0)) * bar;
    viz += vec3(0.0, 0.4, 0.5) * smoothstep(0.02, 0.0, abs(h)) * (0.3 + vol);
    return viz;
  }
  if (mode < 2.5) {
    float tt = t * (0.6 + uCycleSpeed * 40.0);
    float mag = 0.04 + mid * 0.16;
    float y = mag * sin(az * 6.0 + tt) + mag * 0.5 * sin(az * 13.0 - tt * 1.4);
    viz += vec3(0.2, 1.0, 0.55) * smoothstep(0.018, 0.0, abs(h - y)) * amp;
    viz += vec3(0.05, 0.35, 0.2) * smoothstep(0.08, 0.0, abs(h - y)) * (0.5 + vol);
    viz *= 0.96 + 0.04 * sin(h * 80.0 + tt);
    return viz;
  }
  if (mode < 3.5) {
    float tt = t * (0.25 + uCycleSpeed * 20.0 + vol * 0.4);
    vec2 p = dir.xz / max(abs(dir.y) + 0.15, 0.12);
    float r = length(p);
    float ring = smoothstep(0.12, 0.0, abs(fract(r * 4.0 - tt) - 0.5));
    float spokes = smoothstep(0.08, 0.0, abs(fract((atan(p.y, p.x) * 0.15915 + 0.5) * 12.0 + tt * 0.2) - 0.5));
    vec3 tunCol = mix(vec3(0.0, 0.8, 1.0), vec3(1.0, 0.0, 0.8), fract(r * 0.5 - tt * 0.3));
    viz += tunCol * (ring * 0.85 + spokes * 0.25 + exp(-r * 0.8) * 0.15) * amp;
    return viz;
  }
  if (mode < 4.5) {
    vec3 q = dir * 3.0 + vec3(t * 0.07, t * 0.04, t * 0.03);
    float n = fbm(q.xy + fbm(q.yz + t * 0.05)) + bass * 0.35;
    viz = pal(n + h * 0.3 + t * 0.02) * (0.35 + 0.65 * n) * amp;
    viz += pal(n * 1.7) * pow(max(h, 0.0), 3.0) * (0.25 + tre);
    return viz;
  }
  if (mode < 5.5) {
    float beams = pow(abs(sin(az * 10.0 + t * tempo * 0.15)), 24.0);
    float core = pow(max(h * 0.5 + 0.5, 0.0), 5.0);
    viz += pal(az * 0.1 + t * 0.05) * beams * (0.15 + tre + core) * amp;
    viz += vec3(1.0, 0.85, 0.5) * pow(max(dot(dir, vec3(0.0, 1.0, 0.0)), 0.0), 40.0) * (0.4 + bass);
    return viz;
  }
  if (mode < 6.5) {
    float ang = nAz * 0.5 + 0.5;
    float sweep = fract(ang - t * (0.08 + vol * 0.12));
    float blade = smoothstep(0.08, 0.0, sweep) * (1.0 - sweep);
    float rings = smoothstep(0.04, 0.0, abs(fract(length(dir.xz) * 6.0) - 0.5));
    float cross = smoothstep(0.015, 0.0, min(abs(dir.x), abs(dir.z))) * smoothstep(-0.05, 0.2, h);
    viz += vec3(0.2, 1.0, 0.45) * (blade * (0.5 + vol * 2.0) + rings * 0.25 + cross * 0.35);
    viz += vec3(0.0, 0.3, 0.15) * smoothstep(0.03, 0.0, abs(h));
    return viz;
  }
  if (mode < 7.5) {
    vec2 gp = dir.xz / max(abs(h) + 0.04, 0.08);
    vec2 gf = abs(fract(gp * 3.5 + vec2(0.0, t * 0.15)) - 0.5);
    float line = smoothstep(0.07, 0.0, min(gf.x, gf.y));
    float mer = smoothstep(0.97, 1.0, abs(sin(az * 18.0)));
    float lat = smoothstep(0.97, 1.0, abs(sin(h * 30.0)));
    viz += vec3(0.0, 0.9, 1.0) * line * smoothstep(0.2, -0.3, h) * (0.45 + mid);
    viz += vec3(0.6, 0.2, 1.0) * max(mer, lat) * smoothstep(-0.05, 0.4, h) * (0.2 + tre);
    viz += vec3(1.0, 0.0, 0.8) * smoothstep(0.012, 0.0, abs(h)) * (0.3 + vol);
    return viz;
  }
  if (mode < 8.5) {
    float seed = floor(t * (1.6 + tre * 4.0));
    vec2 lp = vec2(az * 0.42, h);
    float d0 = boltDist(lp, seed + 1.0);
    float d1 = boltDist(lp, seed + 9.2);
    float core = smoothstep(0.01, 0.0, d0) + smoothstep(0.008, 0.0, d1) * 0.65;
    float glow = smoothstep(0.045, 0.0, d0) + smoothstep(0.035, 0.0, d1) * 0.5;
    float flash = pow(tre, 1.4) + pow(hash(vec2(seed, 1.3)), 12.0) * 0.25;
    viz += vec3(0.12, 0.08, 0.22) * (0.25 + 0.75 * fbm(dir.xz * 5.0 + t * 0.15));
    viz += vec3(0.75, 0.88, 1.0) * core * (0.35 + 1.8 * max(vol, flash));
    viz += vec3(0.35, 0.5, 1.0) * glow * (0.25 + bass);
    viz += pal(0.7) * bass * 0.3;
    return viz;
  }
  if (mode < 9.5) {
    float ka = abs(fract(nAz * 3.0 + 0.5) - 0.5);
    vec2 kp = vec2(ka * 2.0, h);
    float kn = fbm(kp * 5.0 + t * 0.15) + bass * 0.4;
    viz = pal(kn + t * 0.03) * (0.25 + kn) * amp;
    viz += pal(ka + h) * pow(max(1.0 - length(kp), 0.0), 3.0) * (0.5 + vol);
    return viz;
  }
  if (mode < 10.5) {
    float col = floor((nAz * 0.5 + 0.5) * 42.0);
    float spd = (0.6 + hash(vec2(col, 0.4)) * 1.8) * (0.7 + tre * 2.2);
    float rain = fract(-h * 3.5 + t * spd + hash(vec2(col, 1.1)));
    float glyph = step(0.78 - vol * 0.15, hash(vec2(col, floor((-h + t * spd) * 18.0))));
    float head = smoothstep(0.15, 0.0, rain) * glyph;
    viz += mix(vec3(0.0, 0.15, 0.0), vec3(0.3, 1.0, 0.4), head) * glyph * smoothstep(-0.95, 0.4, h) * (0.4 + vol);
    viz += vec3(0.6, 1.0, 0.7) * head * (1.0 + vol);
    return viz;
  }
  if (mode < 11.5) {
    float shock = abs(fract(acos(clamp(h, -1.0, 1.0)) * 1.2 - t * (0.35 + vol)) - 0.5);
    viz += pal(h + t * 0.1) * smoothstep(0.06, 0.0, shock) * (0.6 + bass * 2.0);
    viz += vec3(1.0, 0.7, 0.3) * pow(max(h, 0.0), 8.0) * (0.4 + vol);
    viz += pal(t * 0.05) * (0.08 + mid * 0.2);
    return viz;
  }
  if (mode < 12.5) {
    float n = fbm(vec2(nAz * 2.5, h * 2.0 - t * 0.12));
    float curtain = pow(clamp(n, 0.0, 1.0), 1.6) * smoothstep(-0.15, 0.35, h) * smoothstep(1.05, 0.25, h);
    viz += pal(n + t * 0.04 + 0.2) * curtain * (0.7 + mid * 2.0);
    viz += pal(n + 0.5) * pow(curtain, 2.0) * (0.4 + vol);
    viz += vec3(0.05, 0.08, 0.16);
    return viz;
  }
  if (mode < 13.5) {
    for (int i = 0; i < 10; i++) {
      float fi = float(i);
      vec3 d = normalize(vec3(sin(fi * 2.3 + 0.4), cos(fi * 1.1) * 0.75, cos(fi * 2.3)));
      float b = pow(max(dot(dir, d), 0.0), 70.0);
      float pulse = 0.4 + 0.6 * sin(t * 2.2 + fi * 1.3) * (0.3 + vol);
      viz += pal(fi * 0.1 + t * 0.02) * b * pulse * (1.2 + vol * 2.0);
    }
    return viz;
  }
  float r = length(dir.xz);
  float arm = fract(az * 0.15915 + log(max(r, 0.04)) * 0.55 - t * 0.04);
  float dust = smoothstep(0.1, 0.0, abs(arm - 0.5)) * smoothstep(-0.05, 0.25, r) * (0.4 + 0.6 * fbm(dir.xz * 3.0));
  viz += pal(r + t * 0.02) * dust * (0.7 + bass * 1.8);
  viz += vec3(1.0, 0.92, 0.75) * pow(max(1.0 - r * 1.8, 0.0), 7.0) * (0.4 + vol);
  viz += vec3(1.0) * smoothstep(0.02, 0.0, length(fract(dir * 40.0) - 0.5)) * uStarsDensity * (0.35 + tre);
  return viz;
}
`

const SKY_BODY = `
  vec3 sunDir = normalize(-uSunDirection);
  float sunElev = sunDir.y;
  float day = smoothstep(-0.15, 0.15, sunElev);
  float night = 1.0 - day;
  float h = direction.y;

  vec3 zenithDay = vec3(0.12, 0.36, 0.78);
  vec3 horizonDay = vec3(0.78, 0.88, 0.98);
  vec3 zenithNight = vec3(0.015, 0.018, 0.045);
  vec3 horizonNight = vec3(0.025, 0.025, 0.04);
  vec3 ground = vec3(0.18, 0.16, 0.14);
  vec3 sky = mix(ground, mix(horizonNight, horizonDay, day), smoothstep(-0.1, 0.02, h));
  sky = mix(sky, mix(zenithNight, zenithDay, day), smoothstep(0.02, 0.45, h));

  float sunDot = max(dot(direction, sunDir), 0.0);
  float warm = smoothstep(0.0, 0.35, sunElev);
  vec3 sunTint = mix(vec3(1.0, 0.32, 0.08), vec3(1.0, 0.95, 0.85), warm);
  float sunEdge = 0.9999;
  float sunDisk = smoothstep(sunEdge - 0.00008, sunEdge, sunDot);
  float sunCore = pow(sunDot, 14.0);
  float sunCorona = pow(sunDot, 2.5) * 0.4;
  sky += sunTint * (sunDisk * 2.0 + sunCore * 0.5) * day;
  sky += sunTint * sunCorona * day * 0.45;

  float moonAngle = uTime * uCycleSpeed * 0.25;
  vec3 moonDir = normalize(vec3(cos(moonAngle) * 0.9, 0.25 + sin(moonAngle) * 0.45, sin(moonAngle) * 0.9));
  float moonDot = max(dot(direction, moonDir), 0.0);
  float moonEdge = 0.99955;
  float moonMask = smoothstep(moonEdge - 0.00015, moonEdge, moonDot);
  float moonLit = smoothstep(-0.05, 0.15, dot(direction, sunDir));
  vec3 moonTangent = normalize(cross(moonDir, vec3(0.0, 1.0, 0.0)));
  vec3 moonBitangent = cross(moonDir, moonTangent);
  vec2 mariaUV = vec2(dot(direction, moonTangent), dot(direction, moonBitangent));
  float maria = fbm(mariaUV * 120.0 + 5.0) * 0.7 + fbm(mariaUV * 400.0) * 0.3;
  float moonAlbedo = mix(0.22, 1.0, smoothstep(0.4, 0.6, maria));
  float moonShade = mix(0.2 + 0.8 * moonLit, 1.0, uMoonEmissive);
  vec3 moonColor = vec3(0.88, 0.9, 0.98) * moonAlbedo;
  sky += moonColor * moonMask * moonShade * night * (1.2 + uMoonEmissive * 0.8);
  sky += vec3(0.85, 0.88, 0.95) * pow(moonDot, 4.0) * night * (0.06 + uMoonEmissive * 0.4);

  vec3 cell = floor(direction * 90.0);
  vec3 f = fract(direction * 90.0);
  vec3 starPos = vec3(hash13(cell + 0.7), hash13(cell + 1.3), hash13(cell + 2.1)) - 0.5;
  float starDist = length(f - 0.5 - starPos);
  float twinkle = 0.6 + 0.4 * hash13(cell + floor(uTime * 0.7) + 3.7);
  float stars = smoothstep(0.02, 0.0, starDist) * twinkle;
  sky += vec3(1.0) * stars * night * uStarsDensity * 2.4;

  float cmask = smoothstep(-0.05, 0.3, direction.y);
  vec2 cp = direction.xz / max(direction.y + 0.15, 0.1);
  cp *= 1.2;
  cp += vec2(uTime * uCloudSpeed, uTime * uCloudSpeed * 0.3);
  float cn = fbm(cp);
  float clouds = smoothstep(0.35, 0.6, cn);
  float cloudop = clouds * uCloudCover * cmask;
  vec3 cloudCol = mix(vec3(0.03, 0.035, 0.05), vec3(1.0, 1.0, 1.0), day);
  sky = mix(sky, cloudCol, clamp(cloudop, 0.0, 1.0));

  sky += sunTint * sunCorona * day * uBass * 2.0;
  color = sky;
  if (uMode > 0.5) color = vizMode(direction, h, uMode);
`

function uniformsOf(snap, lightDir, bands) {
  return {
    uSunDirection: [lightDir.x, lightDir.y, lightDir.z],
    uMode: modeOf(snap.preset),
    uCycleSpeed: snap.cycleSpeed,
    uCloudCover: snap.cloudCover,
    uCloudSpeed: snap.cloudSpeed,
    uStarsDensity: snap.starsDensity,
    uMoonEmissive: snap.moonEmissive,
    uVolume: Number(bands?.volume ?? 0),
    uBass: Number(bands?.bass ?? 0),
    uMid: Number(bands?.mid ?? 0),
    uTreble: Number(bands?.treble ?? 0),
  }
}

// Closed-over authority state — NOT app.state (that rebuilds the script).
let live = snapshotFrom(props)

if (world.isServer) {
  console.warn(`[boltSky] server booted — channel=${CHANNEL} preset=${live.preset}`)

  function broadcastState() {
    app.emit(STATE_EVENT, live)
    app.send(APPLY_EVENT, live)
    debugLog('state', live.preset)
  }

  world.on(REQ_EVENT, req => {
    if (!req) return
    debugLog('request', req.action, req.value ?? req.key ?? '')
    if (req.action === 'preset' && PRESETS[req.value] !== undefined) {
      live.preset = req.value
      broadcastState()
    } else if (req.action === 'uniform' && req.key && req.key in live) {
      if (req.key === 'fogColor' || req.key === 'preset') live[req.key] = req.value
      else if (req.key === 'fogOn') live.fogOn = !!req.value
      else live[req.key] = Number(req.value)
      broadcastState()
    }
  })

  world.on(QUERYSTATE_EVENT, () => {
    broadcastState()
  })
}

if (world.isClient) {
  console.warn(`[boltSky] client booted — channel=${CHANNEL}`)

  const sky = app.create('sky', {
    shader: SKY_BODY,
    shaderHeader: SKY_HEADER,
    shaderUniforms: uniformsOf(live, { x: -1, y: -2, z: -2 }, null),
    fogNear: live.fogNear,
    fogFar: live.fogFar,
    fogColor: live.fogColor,
  })
  app.add(sky)

  let lastFogOn
  let lastFogNear
  let lastFogFar
  let lastFogColor
  let elapsed = 0
  let applied = live
  let linkedSourceId = null
  const sunDir = new Vector3()
  const lightDir = new Vector3()
  const uni = {
    uSunDirection: [0, 0, 0],
    uMode: 0,
    uCycleSpeed: 0,
    uCloudCover: 0,
    uCloudSpeed: 0,
    uStarsDensity: 0,
    uMoonEmissive: 0,
    uVolume: 0,
    uBass: 0,
    uMid: 0,
    uTreble: 0,
  }

  const AUDIO_EVENT = `${CHANNEL}:speaker:audio`
  const WHOIS_EVENT = `${CHANNEL}:reactive:whois`

  world.on(AUDIO_EVENT, ann => {
    if (!ann) return
    if (ann.playing && ann.audioId) {
      linkedSourceId = ann.audioId
      console.warn('[boltSky] linked speaker audio', linkedSourceId)
    } else if (!ann.playing) {
      linkedSourceId = null
    }
  })

  let whoisAttempts = 0
  const whois = () => {
    if (linkedSourceId || whoisAttempts >= 8) return
    whoisAttempts++
    app.emit(WHOIS_EVENT, { channel: CHANNEL })
    debugLog('whois speakers (attempt', whoisAttempts + ')')
    setTimeout(whois, whoisAttempts === 1 ? 800 : 2000)
  }
  setTimeout(whois, 1000)

  app.on(APPLY_EVENT, snap => {
    if (!snap) return
    applied = snapshotFrom(snap)
    debugLog('apply', applied.preset)
  })

  app.on('update', delta => {
    elapsed += delta
    const src = applied
    const speed = src.cycleSpeed
    const angle = ((elapsed * speed) % 1) * 6.28318
    sunDir.set(Math.cos(angle), Math.sin(angle) * 0.75 - 0.12, Math.sin(angle) * 0.8).normalize()
    lightDir.copy(sunDir).negate()
    sky.sunDirection = lightDir

    let vol = 0
    let bass = 0
    let mid = 0
    let tre = 0
    if (linkedSourceId) {
      const d = world.audioReactivity?.getBands?.(linkedSourceId)
      if (d) {
        vol = d.volume || 0
        bass = d.bass || 0
        mid = d.mid || 0
        tre = d.treble || 0
      }
    }
    uni.uSunDirection[0] = lightDir.x
    uni.uSunDirection[1] = lightDir.y
    uni.uSunDirection[2] = lightDir.z
    uni.uMode = modeOf(src.preset)
    uni.uCycleSpeed = src.cycleSpeed
    uni.uCloudCover = src.cloudCover
    uni.uCloudSpeed = src.cloudSpeed
    uni.uStarsDensity = src.starsDensity
    uni.uMoonEmissive = src.moonEmissive
    uni.uVolume = vol
    uni.uBass = bass
    uni.uMid = mid
    uni.uTreble = tre
    sky.shaderUniforms = uni

    if (
      src.fogOn !== lastFogOn ||
      src.fogNear !== lastFogNear ||
      src.fogFar !== lastFogFar ||
      src.fogColor !== lastFogColor
    ) {
      lastFogOn = src.fogOn
      lastFogNear = src.fogNear
      lastFogFar = src.fogFar
      lastFogColor = src.fogColor
      if (src.fogOn) {
        sky.fogNear = src.fogNear
        sky.fogFar = src.fogFar
        sky.fogColor = src.fogColor
      } else {
        sky.fogNear = null
        sky.fogFar = null
        sky.fogColor = null
      }
    }
  })
}
