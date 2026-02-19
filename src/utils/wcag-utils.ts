import {
  getContrastRatio,
  getRelativeLuminance,
  hexToRgb,
  rgbToHex,
  rgbToHsl
} from "./color-utils"

export interface WCAGCompliance {
  normalAA: boolean
  normalAAA: boolean
  largeAA: boolean
  largeAAA: boolean
  graphicsAA: boolean
}

export const calculateWCAGCompliance = (ratio: number): WCAGCompliance => ({
  normalAA: ratio >= 4.5,
  normalAAA: ratio >= 7,
  largeAA: ratio >= 3,
  largeAAA: ratio >= 4.5,
  graphicsAA: ratio >= 3
})

export const isLargeText = (fontSize: number, isBold: boolean): boolean => {
  return fontSize >= 24 || (isBold && fontSize >= 18.66)
}

export type SuggestionTarget = "foreground" | "background"

export interface ColorSuggestion {
  hex: string
  ratio: number
  direction: "darker" | "lighter"
  level: "AA" | "AAA"
  target: SuggestionTarget
  /** CIE76 ΔE distance from the original color (lower = closer) */
  distance: number
}

const NORMAL_TARGETS = [
  { ratio: 4.5, level: "AA" as const },
  { ratio: 7, level: "AAA" as const }
]

// ---------------------------------------------------------------------------
// sRGB ↔ CIE Lab for perceptual distance
// ---------------------------------------------------------------------------

const toLinear = (c: number): number => {
  const n = c / 255
  return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4)
}

interface Lab { L: number; a: number; b: number }

const rgbToLab = (r: number, g: number, b: number): Lab => {
  const rl = toLinear(r), gl = toLinear(g), bl = toLinear(b)
  let x = (0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl) / 0.95047
  let y = 0.2126729 * rl + 0.7151522 * gl + 0.0721750 * bl
  let z = (0.0193339 * rl + 0.1191920 * gl + 0.9503041 * bl) / 1.08883
  const f = (t: number) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116
  x = f(x); y = f(y); z = f(z)
  return { L: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z) }
}

const deltaE = (
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number
): number => {
  const a = rgbToLab(r1, g1, b1)
  const b_ = rgbToLab(r2, g2, b2)
  return Math.sqrt((a.L - b_.L) ** 2 + (a.a - b_.a) ** 2 + (a.b - b_.b) ** 2)
}

// ---------------------------------------------------------------------------
// Core: binary search on luminance, then snap to nearest sRGB
// ---------------------------------------------------------------------------

/**
 * Given a target relative luminance, find the sRGB color that preserves the
 * original hue and saturation (in fractional HSL) as closely as possible.
 *
 * Uses binary search on fractional lightness (0–1, 1000 steps of precision)
 * to find the lightness whose resulting sRGB color has the closest luminance
 * to `targetLum`.
 */
const luminanceToRgb = (
  hFrac: number,
  sFrac: number,
  targetLum: number
): { r: number; g: number; b: number } => {
  let lo = 0, hi = 1
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    const rgb = hslFracToRgb(hFrac, sFrac, mid)
    const lum = getRelativeLuminance(rgb)
    if (lum < targetLum) lo = mid; else hi = mid
  }
  return hslFracToRgb(hFrac, sFrac, (lo + hi) / 2)
}

/** HSL with all values in [0,1] range → clamped sRGB */
const hslFracToRgb = (
  h: number, s: number, l: number
): { r: number; g: number; b: number } => {
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h * 12) % 12
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
  }
  return {
    r: Math.round(Math.min(Math.max(f(0), 0), 1) * 255),
    g: Math.round(Math.min(Math.max(f(8), 0), 1) * 255),
    b: Math.round(Math.min(Math.max(f(4), 0), 1) * 255)
  }
}

/**
 * Compute the exact target luminance needed for `sourceColor` to achieve
 * `targetRatio` against `otherLum`, in both directions (darker / lighter).
 */
const targetLuminances = (
  otherLum: number,
  targetRatio: number
): { darker: number; lighter: number } => ({
  darker: (otherLum + 0.05) / targetRatio - 0.05,
  lighter: targetRatio * (otherLum + 0.05) - 0.05
})

const collectSuggestions = (
  sourceHex: string,
  otherHex: string,
  target: SuggestionTarget,
  failingTargets: { ratio: number; level: "AA" | "AAA" }[]
): ColorSuggestion[] => {
  const src = hexToRgb(sourceHex)
  const srcLum = getRelativeLuminance(src)
  const otherLum = getRelativeLuminance(hexToRgb(otherHex))

  const { h: hInt, s: sInt } = rgbToHsl(src.r, src.g, src.b)
  const hFrac = hInt / 360
  const sFrac = sInt / 100

  const results: ColorSuggestion[] = []
  const seen = new Set<string>()

  for (const { ratio: targetRatio, level } of failingTargets) {
    const targets = targetLuminances(otherLum, targetRatio)

    for (const candidateLum of [targets.darker, targets.lighter]) {
      if (candidateLum < 0 || candidateLum > 1) continue
      if (candidateLum === srcLum) continue

      const rgb = luminanceToRgb(hFrac, sFrac, candidateLum)
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b)
      const actualRatio = getContrastRatio(hex, otherHex)
      const resultLum = getRelativeLuminance(rgb)
      const direction: "darker" | "lighter" =
        resultLum < srcLum ? "darker" : "lighter"

      if (actualRatio < targetRatio) {
        const nudged = nudgeToMeetRatio(rgb, direction, otherHex, targetRatio)
        if (!nudged) continue
        const nudgedHex = rgbToHex(nudged.r, nudged.g, nudged.b)
        const nudgedRatio = getContrastRatio(nudgedHex, otherHex)
        const key = `${nudgedHex}-${level}`
        if (seen.has(key)) continue
        seen.add(key)
        results.push({
          hex: nudgedHex,
          ratio: nudgedRatio,
          direction,
          level,
          target,
          distance: deltaE(src.r, src.g, src.b, nudged.r, nudged.g, nudged.b)
        })
      } else {
        const key = `${hex}-${level}`
        if (seen.has(key)) continue
        seen.add(key)
        results.push({
          hex,
          ratio: actualRatio,
          direction,
          level,
          target,
          distance: deltaE(src.r, src.g, src.b, rgb.r, rgb.g, rgb.b)
        })
      }
    }
  }

  return results
}

/**
 * When binary search lands on an sRGB color that just barely misses the
 * target (due to 8-bit quantization), nudge lightness by ±1/255 steps
 * until the ratio is met.
 */
const nudgeToMeetRatio = (
  rgb: { r: number; g: number; b: number },
  direction: "darker" | "lighter",
  otherHex: string,
  targetRatio: number
): { r: number; g: number; b: number } | null => {
  const { h: hInt, s: sInt, l: lInt } = rgbToHsl(rgb.r, rgb.g, rgb.b)
  const hFrac = hInt / 360
  const sFrac = sInt / 100
  const step = direction === "darker" ? -0.001 : 0.001
  let l = lInt / 100

  for (let i = 0; i < 50; i++) {
    l += step
    if (l < 0 || l > 1) return null
    const candidate = hslFracToRgb(hFrac, sFrac, l)
    const hex = rgbToHex(candidate.r, candidate.g, candidate.b)
    if (getContrastRatio(hex, otherHex) >= targetRatio) {
      return candidate
    }
  }
  return null
}

/**
 * Suggest the nearest accessible foreground and background colors that
 * reach AA (4.5:1) and AAA (7:1) levels, in both darker and lighter directions.
 *
 * Algorithm:
 * 1. Compute the exact target luminance needed for each WCAG threshold
 * 2. Binary search on fractional HSL lightness to find the sRGB color
 *    at that luminance while preserving hue and saturation
 * 3. Nudge by tiny lightness steps if 8-bit quantization causes a miss
 * 4. Sort results by CIE76 ΔE (perceptual distance) — smallest change first
 */
export const suggestAccessibleColors = (
  fgHex: string,
  bgHex: string
): ColorSuggestion[] => {
  const currentRatio = getContrastRatio(fgHex, bgHex)
  const failingTargets = NORMAL_TARGETS.filter((t) => currentRatio < t.ratio)
  if (failingTargets.length === 0) return []

  const fgSuggestions = collectSuggestions(
    fgHex, bgHex, "foreground", failingTargets
  )
  const bgSuggestions = collectSuggestions(
    bgHex, fgHex, "background", failingTargets
  )

  return [...fgSuggestions, ...bgSuggestions].sort(
    (a, b) => a.distance - b.distance
  )
}
