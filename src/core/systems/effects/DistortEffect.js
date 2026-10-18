/**
 * DistortEffect - screen-space warp for the two atmospheres this world is built on.
 *
 *   mode 0  heat   the cinder floors: fast vertical shimmer rising off the channels, hugging the bottom
 *   mode 1  water  the drowned floors: a slow lateral swell that reads as water moving over the lens
 *   mode 2  frost  the Frostwake: a still crystalline warp that comes in from the edges of the frame
 *
 * One warp core, three flavours, every dial a uniform - so a floor turns it on with numbers rather
 * than a new shader. amount 0 is a no-op; strength is in uv units, so keep it small (0.002-0.008).
 *
 * Same door as GradeEffect: ClientGraphics owns it, it joins the effect pass, and a world asks for
 * it at runtime when a floor changes.
 */
import { Uniform } from 'three'
import { BlendFunction, Effect } from 'postprocessing'

const fragmentShader = `
#if __VERSION__ >= 300
  #define SAMPLE texture
#else
  #define SAMPLE texture2D
#endif

uniform sampler2D inputBuffer;
uniform float uAmount;
uniform float uStrength;
uniform float uSpeed;
uniform float uTime;
uniform float uMode;
uniform float uBand;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (uAmount <= 0.0 || uStrength <= 0.0) {
    outputColor = inputColor;
    return;
  }

  vec2 offset = vec2(0.0);

  if (uMode < 0.5) {
    // heat - fast, vertical, strongest low in the frame
    float weight = mix(1.0, uv.y, uBand);
    float t = uTime * uSpeed;
    offset.x = sin(uv.y * 26.0 + t * 2.7) * 0.6 + sin(uv.y * 11.0 - t * 1.3) * 0.4;
    offset.y = sin(uv.x * 18.0 + t * 3.4) * 0.7;
    offset *= uStrength * weight;
  } else if (uMode < 1.5) {
    // water - slow lateral swell, a little heavier than heat
    float weight = mix(1.0, uv.y, uBand);
    float t = uTime * uSpeed;
    offset.x = sin(uv.y * 8.0 + t * 0.8) * 0.8 + sin(uv.y * 21.0 - t * 0.45) * 0.2;
    offset.y = sin(uv.x * 6.0 + t * 0.6) * 0.35;
    offset *= uStrength * weight * 1.4;
  } else {
    // frost - still and crystalline, creeping in from the corners
    float edge = smoothstep(0.55, 0.15, distance(uv, vec2(0.5)));
    float t = uTime * uSpeed * 0.2;
    offset.x = sin(uv.y * 60.0 + t) * 0.5;
    offset.y = cos(uv.x * 60.0 - t) * 0.5;
    offset *= uStrength * (1.0 - edge);
  }

  outputColor = mix(inputColor, SAMPLE(inputBuffer, uv + offset), uAmount);
}
`

export class DistortEffect extends Effect {
  constructor({
    blendFunction = BlendFunction.NORMAL,
    amount = 0.0,
    strength = 0.004,
    speed = 1.0,
    mode = 0.0,
    band = 0.8,
  } = {}) {
    super('DistortEffect', fragmentShader, {
      blendFunction,
      uniforms: new Map([
        ['uAmount', new Uniform(amount)],
        ['uStrength', new Uniform(strength)],
        ['uSpeed', new Uniform(speed)],
        ['uTime', new Uniform(0.0)],
        ['uMode', new Uniform(mode)],
        ['uBand', new Uniform(band)],
      ]),
    })

    this._time = 0.0
  }

  update(renderer, inputBuffer, deltaTime) {
    // the clock only runs when the effect can actually be seen - no cost when amount is 0
    const uAmount = this.uniforms.get('uAmount')
    if (uAmount && uAmount.value <= 0.0) return
    this._time += deltaTime
    const uTime = this.uniforms.get('uTime')
    if (uTime) uTime.value = this._time
  }
}
