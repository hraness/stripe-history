"use client";

import { ThemeToggle as SharedThemeToggle } from "@hraness/design-kit/react";
import type { AnchorHTMLAttributes } from "react";

export function SkipLink({
  children,
  className,
  href = "#main-content",
  ...props
}: Readonly<AnchorHTMLAttributes<HTMLAnchorElement>>) {
  return (
    <a
      {...props}
      className={["stripedex-skip-link", className]
        .filter(Boolean)
        .join(" ")}
      href={href}
    >
      {children}
    </a>
  );
}

export function ThemeToggle({
  "aria-label": ariaLabel = "Appearance",
}: Readonly<{ "aria-label"?: string }>) {
  return (
    <SharedThemeToggle
      aria-label={ariaLabel}
      className="stripedex-theme-toggle"
      presentation="menu"
      size="compact"
    />
  );
}
