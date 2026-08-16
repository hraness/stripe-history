"use client";

import Moon02Icon from "@hugeicons/core-free-icons/Moon02Icon";
import Sun03Icon from "@hugeicons/core-free-icons/Sun03Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { useEffect, useSyncExternalStore } from "react";

const THEME_STORAGE_KEY = "stripe-history-theme-v1";
const THEME_BOOTSTRAP = `(()=>{try{const value=localStorage.getItem("${THEME_STORAGE_KEY}");document.documentElement.dataset.theme=value==="dark"?"dark":"light"}catch{document.documentElement.dataset.theme="light"}})();`;

export function DesignThemeProvider({
  children,
}: Readonly<{ children: ReactNode; storageKey?: string }>) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }}
        data-theme-bootstrap=""
        suppressHydrationWarning
      />
      {children}
    </>
  );
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

export function ThemeColorSync({
  darkColor,
  lightColor,
}: Readonly<{ darkColor: string; lightColor: string }>) {
  useEffect(() => {
    const root = document.documentElement;
    const update = (): void => {
      const color = root.dataset.theme === "dark" ? darkColor : lightColor;
      let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (meta === null) {
        meta = document.createElement("meta");
        meta.name = "theme-color";
        document.head.append(meta);
      }
      meta.content = color;
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributeFilter: ["data-theme"], attributes: true });
    return () => observer.disconnect();
  }, [darkColor, lightColor]);
  return null;
}

function currentTheme(): "dark" | "light" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribeToTheme(onStoreChange: () => void): () => void {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributeFilter: ["data-theme"],
    attributes: true,
  });
  return () => observer.disconnect();
}

export function ThemeToggle({
  "aria-label": ariaLabel = "Appearance",
}: Readonly<{ "aria-label"?: string }>) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    currentTheme,
    () => "light",
  );

  const nextTheme = theme === "dark" ? "light" : "dark";
  const icon = theme === "dark" ? Sun03Icon : Moon02Icon;
  return (
    <button
      aria-label={`${ariaLabel}: ${theme}`}
      className="stripe-history-theme-toggle"
      onClick={() => {
        document.documentElement.dataset.theme = nextTheme;
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      }}
      title={`Use ${nextTheme} appearance`}
      type="button"
    >
      <HugeiconsIcon
        aria-hidden="true"
        className="stripe-history-theme-icon"
        color="currentColor"
        icon={icon}
        size={17}
        strokeWidth={1.8}
      />
    </button>
  );
}
