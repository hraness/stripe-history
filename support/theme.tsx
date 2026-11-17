"use client";

// The appearance provider and the header's icon menu. Adapted from the retired
// @hraness/design-kit (v0.36.3); the palette paint itself is CSS keyed on the
// root's data-palette and data-theme (support/hraness/palette-system.css).
import { AppearanceIcon, cn } from "@hraness/ui";
import * as stylex from "@stylexjs/stylex";
import { type AnchorHTMLAttributes, createContext, type ReactNode, useContext, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";

import {
  designPaletteLabels,
  designPalettes,
  designThemeLabel,
  designThemes,
  parseDesignPalettePreference,
  type DesignPalette,
  type DesignPalettePreference,
  type DesignTheme,
} from "./hraness/appearance";
import { designPaletteSnapshot, initDesignPalette, type DesignPaletteController, type DesignPaletteSnapshot } from "./hraness/appearance-controller";
import { sitePalettePreference } from "./appearance-config";
import { paletteMenuStyles } from "./hraness/appearance-menu.stylex";


export interface DesignPaletteMenuButtonProps {
  readonly "aria-label"?: string;
  readonly className?: string;
  readonly labels?: Readonly<Partial<Record<DesignTheme, string>>>;
  readonly size?: "compact" | "default";
  readonly onChange?: (mode: DesignTheme) => void;
  readonly value?: DesignTheme;
}

export interface DesignPaletteContextValue extends DesignPaletteSnapshot {
  readonly ready: boolean;
  readonly setPreference: (preference: DesignPalettePreference) => void;
  readonly setPalette: (palette: DesignPalette) => void;
  readonly setMode: (mode: DesignTheme) => void;
}

const DesignPaletteContext = createContext<DesignPaletteContextValue | null>(null);
const noSubscribe = (): (() => void) => () => undefined;
const inertPalette: DesignPaletteContextValue = Object.freeze({
  ...designPaletteSnapshot(sitePalettePreference, false),
  ready: false,
  setPreference: () => undefined,
  setPalette: () => undefined,
  setMode: () => undefined,
});

function isNode(target: EventTarget | null): target is Node {
  return target !== null && "nodeType" in target;
}

export interface DesignPaletteProviderProps {
  readonly children: ReactNode;
  /** Pass a stable (module-level) value; a new object re-attaches the controller. */
  readonly defaultPreference?: DesignPalettePreference;
  readonly legacyStorageKey?: string | null;
  readonly modeMirrorKey?: string | null;
}

/** Appearance boundary. The head bootstrap installs the same controller before hydration. */
export function DesignPaletteProvider({
  children,
  defaultPreference = sitePalettePreference,
  legacyStorageKey,
  modeMirrorKey = null,
}: DesignPaletteProviderProps) {
  const fallback = useMemo(() => parseDesignPalettePreference(defaultPreference) ?? sitePalettePreference, [defaultPreference]);
  const serverSnapshot = useMemo(() => designPaletteSnapshot(fallback, false), [fallback]);
  const [controller, setController] = useState<DesignPaletteController | null>(null);
  useEffect(() => {
    const current = initDesignPalette({
      defaultPreference: fallback,
      ...(legacyStorageKey === undefined ? {} : { legacyStorageKey }),
      modeMirrorKey,
    });
    // The controller is an external store that only exists in the browser;
    // adopting it after hydration keeps server and first client render equal.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setController(current);
    return () => { current.dispose(); };
  }, [fallback, legacyStorageKey, modeMirrorKey]);
  const snapshot = useSyncExternalStore(
    controller?.subscribe ?? noSubscribe,
    controller?.getSnapshot ?? (() => serverSnapshot),
    () => serverSnapshot,
  );
  const value = useMemo<DesignPaletteContextValue>(() => ({
    ...snapshot,
    ready: controller !== null,
    setPreference: (preference) => { controller?.setPreference(preference); },
    setPalette: (palette) => { controller?.setPreference({ ...controller.getSnapshot().preference, palette }); },
    setMode: (mode) => { controller?.setPreference({ ...controller.getSnapshot().preference, mode }); },
  }), [snapshot, controller]);
  return <DesignPaletteContext.Provider value={value}>{children}</DesignPaletteContext.Provider>;
}

/** Returns null outside the opt-in provider; legacy appearance remains independent. */
export function useDesignPalette(): DesignPaletteContextValue | null {
  return useContext(DesignPaletteContext);
}

export function DesignPaletteMenuButton({
  "aria-label": ariaLabel = "Appearance",
  className,
  labels,
  size = "compact",
  onChange,
  value: controlledMode,
}: DesignPaletteMenuButtonProps) {
  // Outside the provider (isolated server renders) the menu stays inert.
  const palette = useDesignPalette() ?? inertPalette;
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const pointerInside = useRef(false);
  const groupId = useId();
  // The trigger keeps its hover wash while the menu is open, as on rough.day.
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const details = detailsRef.current;
    if (details === null) return;
    const document = details.ownerDocument;
    let settlement: ReturnType<typeof setTimeout> | undefined;
    const clearSettlement = (): void => { clearTimeout(settlement); settlement = undefined; };
    const outside = (event: PointerEvent): void => {
      clearSettlement();
      pointerInside.current = isNode(event.target) && details.contains(event.target);
      if (details.open && !pointerInside.current) details.open = false;
    };
    const settlePointer = (): void => {
      if (!pointerInside.current) return;
      clearSettlement();
      // A label first focuses its focusable ancestor, then its input during
      // native activation. Keep the disclosure mounted through that sequence.
      settlement = setTimeout(() => {
        settlement = undefined;
        pointerInside.current = false;
        if (details.open && !details.contains(document.activeElement)) details.open = false;
      }, 0);
    };
    const releasePointer = (event: PointerEvent): void => {
      // Touch compatibility mouse events may follow pointerup in a later task.
      // An inside release stays guarded until native click activation completes.
      if (event.button !== 0 || !isNode(event.target) || !details.contains(event.target)) settlePointer();
    };
    const escape = (event: KeyboardEvent): void => {
      if (event.key === "Tab") {
        clearSettlement();
        pointerInside.current = false;
        return;
      }
      if (event.key !== "Escape" || !details.open) return;
      event.preventDefault();
      clearSettlement();
      pointerInside.current = false;
      details.open = false;
      details.querySelector("summary")?.focus();
    };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("pointerup", releasePointer, true);
    document.addEventListener("click", settlePointer, true);
    document.addEventListener("pointercancel", settlePointer, true);
    document.defaultView?.addEventListener("blur", settlePointer);
    details.addEventListener("keydown", escape);
    return () => {
      clearSettlement();
      pointerInside.current = false;
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("pointerup", releasePointer, true);
      document.removeEventListener("click", settlePointer, true);
      document.removeEventListener("pointercancel", settlePointer, true);
      document.defaultView?.removeEventListener("blur", settlePointer);
      details.removeEventListener("keydown", escape);
    };
  }, []);
  const mode = controlledMode ?? palette.preference.mode;
  const ready = palette.ready && !palette.isForced;
  const title = `${ariaLabel}: ${designPaletteLabels[palette.preference.palette]}, ${designThemeLabel(mode, labels)}`;
  return <details
    {...stylex.props(paletteMenuStyles.root)}
    className={cn("hraness-design-theme-toggle", "hraness-design-palette-menu", stylex.props(paletteMenuStyles.root).className, className)}
    data-hraness-appearance-menu=""
    data-presentation="menu"
    data-ready={ready ? "true" : "false"}
    ref={detailsRef}
    onToggle={(event) => { setOpen(event.currentTarget.open); }}
    onBlur={(event) => {
      if (!pointerInside.current && isNode(event.relatedTarget)
        && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
    }}
  >
    <summary
      {...stylex.props(paletteMenuStyles.trigger, size === "default" && paletteMenuStyles.triggerDefault, open && paletteMenuStyles.triggerOpen)}
      aria-disabled={!ready || undefined}
      aria-label={title}
      onClick={(event) => { if (!ready) event.preventDefault(); }}
      tabIndex={ready ? 0 : -1}
      title={title}
    ><AppearanceIcon name={mode} xstyle={paletteMenuStyles.icon} /></summary>
    <div {...stylex.props(paletteMenuStyles.panel)}>
      <fieldset {...stylex.props(paletteMenuStyles.group)} disabled={!ready}>
        <legend {...stylex.props(paletteMenuStyles.legend)}>Theme</legend>
        {designPalettes.map((id) => <label {...stylex.props(paletteMenuStyles.choice)} key={id}>
          <input {...stylex.props(paletteMenuStyles.radio)} checked={palette.preference.palette === id} name={`${groupId}-palette`} onChange={() => palette.setPalette(id)} type="radio" value={id} />
          <span>{designPaletteLabels[id]}</span>
        </label>)}
      </fieldset>
      <fieldset {...stylex.props(paletteMenuStyles.group)} disabled={!ready}>
        <legend {...stylex.props(paletteMenuStyles.legend)}>Appearance</legend>
        {designThemes.map((id) => <label {...stylex.props(paletteMenuStyles.choice)} key={id}>
          <input {...stylex.props(paletteMenuStyles.radio)} checked={mode === id} name={`${groupId}-mode`} onChange={() => {
            if (onChange === undefined) palette.setMode(id);
            else onChange(id);
          }} type="radio" value={id} />
          <span>{designThemeLabel(id, labels)}</span>
        </label>)}
      </fieldset>
    </div>
  </details>;
}

export function SkipLink({
  children,
  className,
  href = "#main-content",
  ...props
}: Readonly<AnchorHTMLAttributes<HTMLAnchorElement>>) {
  return (
    <a
      {...props}
      className={["stripe-history-skip-link", className]
        .filter(Boolean)
        .join(" ")}
      href={href}
    >
      {children}
    </a>
  );
}

export function ThemeMenuButton({
  "aria-label": ariaLabel = "Appearance",
}: Readonly<{ "aria-label"?: string }>) {
  return <DesignPaletteMenuButton aria-label={ariaLabel} />;
}
