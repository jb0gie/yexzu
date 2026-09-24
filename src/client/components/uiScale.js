// The UI sizing policy, ported from the dead repo's
// content/ui/layout/scale.view.ts (COLD LIGHT).
//
// One model, and it is the one every game UI arrives at: a DESIGN SPACE plus a
// magnification factor. Layout is always computed in design pixels, so a row is
// the same shape on every device and the type scale is never re-tuned per
// screen; the surface is then magnified to fill a fraction of the frame.
//
// The engine already does the magnification half for free — the whole editor is
// sized in `rem` and CoreUI writes the root font-size. This file is the missing
// half: how big that root should be for a given viewport.
//
// Pure arithmetic, no DOM: `dev/ui-scale-check.mjs` asserts on it in node.

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

/**
 * The frame height the design is drawn for. At exactly this height the scale is
 * 1 and a design pixel is a screen pixel.
 *
 * 820 rather than 1080: a 1080p monitor with browser chrome lands near 940, so
 * ordinary laptops sit at scale 1 and only genuinely large displays magnify.
 * Choosing 1080 would put every laptop BELOW 1 — shrinking type on exactly the
 * screens that can least afford it.
 */
export const REF_H = 820

/**
 * The floor is 1, and it is the important half of this file.
 *
 * Below the reference height the UI does NOT shrink — it shows fewer rows at
 * full size instead. Scaling down is the intuitive move and it is wrong: an
 * 11px tracked micro-cap at 0.47 scale is 5 physical pixels, which is not small
 * type, it is no type at all. A short screen has less room, and the honest
 * answer to less room is less content, not illegible content.
 */
export const MIN_SCALE = 1

/**
 * A ceiling, so a large display gets a generous interface rather than a cartoon.
 *
 * Dead's value is 2.4, and it is NOT copied here on purpose: dead's ceiling is
 * for a fullscreen game menu, which is the only thing on screen. This is an
 * editor overlay sitting next to a live 3D viewport you are still working in —
 * 2.4x would swallow the world. 1.4 is the same idea, sized for a tool.
 */
export const MAX_SCALE = 1.4

/**
 * Scale is driven by HEIGHT, not width and not the diagonal. Readability is
 * bounded by how many rows fit and how tall the type is; width only decides how
 * much air sits between a label and its value. Driving off width would make an
 * ultrawide magnify the type as if it were a bigger screen, when it is exactly
 * as tall as the 16:9 one beside it.
 */
export function uiScale(frameH) {
  return clamp(frameH / REF_H, MIN_SCALE, MAX_SCALE)
}

/**
 * How far a docked surface toes in toward the centre of the frame, in degrees.
 *
 * This is the whole "cockpit" read. A set of panels all facing slightly inward
 * looks like a shallow wrap around the player; the same panels left flat look
 * like stickers on the glass. Dead expresses it as `yaw` per panel; here it is a
 * CSS `rotateY`, and the sign convention happens to match — positive `rotateY`
 * turns a panel's RIGHT edge away from the viewer, so a left-docked pane takes
 * `+YAW_DEG` and a right-docked one `-YAW_DEG`. Both then face the middle.
 */
export const YAW_DEG = 16

/**
 * Perspective for that rotation, in px. Smaller = more wrap, sooner.
 *
 * Deliberately gentle, and the measurement is why: at 1200 the near edge of a
 * 700px-tall pane magnifies ~4%, which is ~14px of overflow past the top and
 * bottom of its own box — enough for the parent's `overflow: hidden` to shave
 * the card's rounded corners. At 2400 the same edge moves ~1%, which stays
 * inside. `dev/ui-sidebar-layout-check.mjs` asserts no clipping.
 */
export const PERSPECTIVE_PX = 2400

/**
 * Panes where you are DOING something, rather than glancing at a list. These
 * take the envelope — a wider surface that fills the height it is given — while
 * the rail panes keep hugging their content, which is what makes them read as a
 * quick remote instead of a form.
 */
const ENVELOPE_PANES = ['app', 'script', 'nodes', 'meta', 'world']

export function isEnvelopePane(pane) {
  return ENVELOPE_PANES.includes(pane)
}

/**
 * An envelope pane's width: it gets more room than the rail, but it may never
 * eat the viewport — you are still building in there. The `vw` half is the
 * guarantee; the `rem` half is what actually applies on a normal desktop.
 */
export const ENVELOPE_W = 'min(32rem, 58vw)'
