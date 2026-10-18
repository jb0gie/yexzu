/**
 * GradeEffect - a colour grade with vignette, tint and grain.
 *
 * One pass that carries a whole floor's mood: saturation, contrast, lift, a tint, an edge
 * vignette and animated grain. Every dial is a uniform, so a world can drive it from its own
 * data (per floor, per tier, per story beat) without recompiling a shader.
 *
 * Built for the Spire's tiers, where the four grades are:
 *   drowned  cold, blue lift, glow on the lanterns
 *   cinder   warm, hot bloom on the channels, a little shimmer
 *   frost    blue-shift with frost creeping at the frame edge
 *   scar     desaturated - what a floor keeps after its warden falls
 *
 * Registered through EffectRegistry ('grade'), which constructs it as `new GradeEffect(params)`.
 * amount = 0 is a no-op, so shipping this changes nothing until a world asks for it.
 */
import { Uniform, Vector3 } from 'three'
import { BlendFunction, Effect } from 'postprocessing'

const fragmentShader = `
uniform float uAmount;
uniform float uSaturation;
uniform float uContrast;
uniform float uLift;
uniform float uVignette;
uniform float uGrain;
uniform float uTime;
uniform vec3  uTint;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 graded = inputColor.rgb;

  // saturation around luma
  float luma = dot(graded, vec3(0.2126, 0.7152, 0.0722));
  graded = mix(vec3(luma), graded, uSaturation);

  // contrast around mid grey, then lift, then tint
  graded = (graded - 0.5) * uContrast + 0.5;
  graded = (graded + uLift) * uTint;

  // vignette: a wide falloff, so it reads as light falling off and not as a black ring
  float d = distance(uv, vec2(0.5));
  graded *= mix(1.0, smoothstep(0.85, 0.25, d), uVignette);

  // animated grain
  float n = fract(sin(dot(uv * uTime, vec2(12.9898, 78.233))) * 43758.5453);
  graded += (n - 0.5) * uGrain;

  outputColor = vec4(mix(inputColor.rgb, graded, uAmount), inputColor.a);
}
`

export class GradeEffect extends Effect {
  constructor({
    blendFunction = BlendFunction.NORMAL,
    amount = 0.0,
    saturation = 1.0,
    contrast = 1.0,
    lift = 0.0,
    vignette = 0.0,
    grain = 0.0,
    tint = [1.0, 1.0, 1.0],
  } = {}) {
    super('GradeEffect', fragmentShader, {
      blendFunction,
      uniforms: new Map([
        ['uAmount', new Uniform(amount)],
        ['uSaturation', new Uniform(saturation)],
        ['uContrast', new Uniform(contrast)],
        ['uLift', new Uniform(lift)],
        ['uVignette', new Uniform(vignette)],
        ['uGrain', new Uniform(grain)],
        ['uTime', new Uniform(0.0)],
        ['uTint', new Uniform(new Vector3(tint[0], tint[1], tint[2]))],
      ]),
    })

    this._time = 0.0
  }

  /**
   * Advance the grain clock. One float per frame - deliberately not a uniform rebuild.
   */
  update(renderer, inputBuffer, deltaTime) {
    this._time += deltaTime
    const uTime = this.uniforms.get('uTime')
    if (uTime) uTime.value = this._time
  }
}
