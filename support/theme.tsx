"use client";

import { ThemeMenuButton as SharedThemeMenuButton } from "@hraness/design-kit/react";
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
  return (
    <SharedThemeMenuButton
      aria-label={ariaLabel}
    />
  );
}
