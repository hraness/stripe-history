"use client";

import { attachFoil } from "@/support/hraness/foil";
import { useEffect } from "react";

/** Drives the shared --hraness-foil-* pointer inputs on [data-foil] elements. */
export function FoilController() {
  useEffect(() => attachFoil(document.documentElement), []);
  return null;
}
