/** Version 2: moving light over a steady material. Safe to snapshot without imports. */
const REST = 50;
const SETTLE = 0.05;
const RESPONSE_MS = 85;
const MIN_LIGHT = 8;
const MAX_LIGHT = 92;
const INPUTS = ["--hraness-foil-x", "--hraness-foil-y"] as const;
type Light = { x: number; y: number };
const clampLight = (value: number) => Math.max(MIN_LIGHT, Math.min(MAX_LIGHT, value));

/**
 * One damped light source per outermost [data-foil] lockup. Nested marks inherit
 * its coordinates. Shapes and material direction never rotate. Resting CSS is
 * complete without this enhancement; touch, reduced motion and forced colors
 * leave it untouched. Return the cleanup function when the owning root unmounts.
 */
export function attachFoil(root: HTMLElement): () => void {
  const document = root.ownerDocument;
  const view = document.defaultView;
  if (!view || typeof view.matchMedia !== "function"
    || typeof view.requestAnimationFrame !== "function"
    || typeof view.cancelAnimationFrame !== "function") return () => {};
  const preference = view.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) and (forced-colors: none)");
  const states = new Map<HTMLElement, Light>();
  let targets: HTMLElement[] = [];
  let needsTargets = true;
  let pointer: Light | undefined;
  let frame: number | null = null;
  let previousTime: number | undefined;
  let detached = false;
  const restore = (target: HTMLElement) => {
    for (const input of INPUTS) target.style.removeProperty(input);
  };
  const reset = () => {
    if (frame !== null) view.cancelAnimationFrame(frame);
    frame = null;
    previousTime = undefined;
    pointer = undefined;
    for (const target of states.keys()) restore(target);
    states.clear();
    targets = [];
    needsTargets = true;
  };
  const refreshTargets = () => {
    targets = [...(root.matches("[data-foil]") ? [root] : []), ...root.querySelectorAll<HTMLElement>("[data-foil]")]
      .filter((target) => {
        const ancestor = target.parentElement?.closest("[data-foil]");
        return !ancestor || !root.contains(ancestor);
      });
    const live = new Set(targets);
    for (const target of states.keys()) {
      if (!live.has(target)) { restore(target); states.delete(target); }
    }
    needsTargets = false;
  };
  const paint = (time: number) => {
    frame = null;
    if (detached || !preference.matches || document.hidden || !pointer) { reset(); return; }
    if (needsTargets) refreshTargets();
    const elapsed = previousTime === undefined ? 1000 / 60 : Math.max(0, Math.min(64, time - previousTime));
    previousTime = time;
    const ease = 1 - Math.exp(-elapsed / RESPONSE_MS);
    // Read every rectangle before writing styles; there is no read/write/read loop.
    const measured = targets.map((target) => ({ target, bounds: target.getBoundingClientRect() }));
    let moving = false;
    for (const { target, bounds } of measured) {
      if (!target.isConnected || !root.contains(target) || bounds.width <= 0 || bounds.height <= 0
        || bounds.bottom <= 0 || bounds.right <= 0 || bounds.top >= view.innerHeight || bounds.left >= view.innerWidth) {
        if (states.has(target)) { restore(target); states.delete(target); }
        continue;
      }
      // A minimum light field avoids tiny marks behaving like a pointer joystick.
      const goal = {
        x: clampLight(REST + (pointer.x - bounds.left - bounds.width / 2) / Math.max(160, bounds.width) * 60),
        y: clampLight(REST + (pointer.y - bounds.top - bounds.height / 2) / Math.max(120, bounds.height) * 50),
      };
      const light = states.get(target) ?? { x: REST, y: REST };
      for (const axis of ["x", "y"] as const) {
        const distance = goal[axis] - light[axis];
        if (Math.abs(distance) > SETTLE) { light[axis] += distance * ease; moving = true; }
        else light[axis] = goal[axis];
      }
      states.set(target, light);
      for (const axis of ["x", "y"] as const) {
        const input = `--hraness-foil-${axis}`;
        const value = `${light[axis].toFixed(2)}%`;
        if (target.style.getPropertyValue(input) !== value) target.style.setProperty(input, value);
      }
    }
    if (moving) frame = view.requestAnimationFrame(paint);
    else previousTime = undefined;
  };
  const move = (event: PointerEvent) => {
    if (!preference.matches || document.hidden || event.pointerType === "touch") { reset(); return; }
    if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
    pointer = { x: event.clientX, y: event.clientY };
    needsTargets = true;
    if (frame === null) frame = view.requestAnimationFrame(paint);
  };
  const leave = (event: PointerEvent) => { if (event.relatedTarget === null) reset(); };
  const visibility = () => { if (document.hidden) reset(); };
  view.addEventListener("pointermove", move, { passive: true });
  view.addEventListener("pointerdown", move, { passive: true });
  view.addEventListener("pointerout", leave, { passive: true });
  view.addEventListener("pointercancel", reset);
  view.addEventListener("blur", reset);
  view.addEventListener("scroll", reset, { passive: true, capture: true });
  view.addEventListener("resize", reset, { passive: true });
  document.addEventListener("visibilitychange", visibility);
  preference.addEventListener("change", reset);
  return () => {
    detached = true;
    reset();
    view.removeEventListener("pointermove", move);
    view.removeEventListener("pointerdown", move);
    view.removeEventListener("pointerout", leave);
    view.removeEventListener("pointercancel", reset);
    view.removeEventListener("blur", reset);
    view.removeEventListener("scroll", reset, true);
    view.removeEventListener("resize", reset);
    document.removeEventListener("visibilitychange", visibility);
    preference.removeEventListener("change", reset);
  };
}
