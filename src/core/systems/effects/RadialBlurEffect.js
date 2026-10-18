/**
 * RadialBlurEffect - the slow-motion blur. Zoom-blur that radiates from a point, with a self-decaying
 * punch so a death moment is one call rather than a per-frame tween.
 *
 *   const blur = graphics.punchRadialBlur({ strength: 0.07, seconds: 1.4 })
 *
 * The world calls it once when the boss falls; the effect decays its own strength to zero over
 * `seconds` and then takes itself out of the mix. Nothing to update per frame from outside.
 *
 * amount 0 is a no-op, and the sampler is chosen with a __VERSION__ guard so it compiles under both
 * GLSL1 and GLSL3 contexts.
 */
import { Uniform, Vector2 } from 'three'
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
uniform vec2  uCenter;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (uAmount <= 0.0 || uStrength <= 0.0) {
    outputColor = inputColor;
    return;
  }

  vec2 dir = uv - uCenter;
  vec4 sum = vec4(0.0);
  const int TAPS = 8;

  for (int i = 0; i < TAPS; i++) {
    float t = float(i) / float(TAPS - 1);
    sum += SAMPLE(inputBuffer, uv - dir * uStrength * t);
  }

  outputColor = mix(inputColor, sum / float(TAPS), uAmount);
}
`

export class RadialBlurEffect extends Effect {
  constructor({
    blendFunction = BlendFunction.NORMAL,
    amount = 0.0,
    strength = 0.0,
    center = [0.5, 0.5],
  } = {}) {
    super('RadialBlurEffect', fragmentShader, {
      blendFunction,
      uniforms: new Map([
        ['uAmount', new Uniform(amount)],
        ['uStrength', new Uniform(strength)],
        ['uCenter', new Uniform(new Vector2(center[0], center[1]))],
      ]),
    })

    this._decay = 0
    this._decayTotal = 0
    this._peak = 0
  }

  /**
   * One call, self-decaying. strength is in uv units (0.04-0.09 reads as a proper slow-mo punch);
   * seconds is how long it takes to fall back to nothing.
   */
  punch({ strength = 0.06, seconds = 1.2 } = {}) {
    this._peak = strength
    this._decayTotal = Math.max(0.05, seconds)
    this._decay = this._decayTotal

    const uStrength = this.uniforms.get('uStrength')
    const uAmount = this.uniforms.get('uAmount')
    if (uStrength) uStrength.value = strength
    if (uAmount) uAmount.value = 1
  }

  update(renderer, inputBuffer, deltaTime) {
    const uAmount = this.uniforms.get('uAmount')
    if (!uAmount || uAmount.value <= 0) return

    const uStrength = this.uniforms.get('uStrength')

    if (this._decay > 0) {
      this._decay -= deltaTime
      if (this._decay <= 0) {
        this._decay = 0
        uAmount.value = 0
        if (uStrength) uStrength.value = 0
        return
      }
      // ease out: full at the punch, nothing at the end
      const t = this._decay / this._decayTotal
      if (uStrength) uStrength.value = this._peak * t * t
    }
  }
}
