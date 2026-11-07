import { Alexandria, Readex_Pro } from "next/font/google";
import type { FontKey } from "./types";

export const alexandria = Alexandria({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-alexandria",
  adjustFontFallback: true,
});

export const readex = Readex_Pro({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-readex",
  adjustFontFallback: true,
});

const FACE: Partial<Record<FontKey, string>> = {
  alexandria: "var(--font-alexandria), 'Alexandria', sans-serif",
  readex: "var(--font-readex), 'Readex Pro', sans-serif",
};

export const fontVar = (k: FontKey, fallback: FontKey) => FACE[k] || FACE[fallback] || FACE.readex;
