export interface ColorEntry {
  hex: string
  rgb: string
  hsl?: string
  timestamp: number
}

export interface HSV {
  h: number
  s: number
  v: number
}

export const DEFAULT_FOREGROUND = "#f8fafc"
export const DEFAULT_BACKGROUND = "#111827"

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n))

const toHexByte = (n: number) =>
  clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0")

export const rgbToHex = (r: number, g: number, b: number): string =>
  `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`

export const hslToRgb = (
  h: number,
  s: number,
  l: number
): { r: number; g: number; b: number } => {
  const hue = ((h % 360) + 360) % 360
  const sat = clamp(s, 0, 100) / 100
  const lit = clamp(l, 0, 100) / 100
  const a = sat * Math.min(lit, 1 - lit)
  const f = (n: number) => {
    const k = (n + hue / 30) % 12
    return lit - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
  }
  return {
    r: Math.round(f(0) * 255),
    g: Math.round(f(8) * 255),
    b: Math.round(f(4) * 255)
  }
}

export const hslToHex = (h: number, s: number, l: number): string => {
  const { r, g, b } = hslToRgb(h, s, l)
  return rgbToHex(r, g, b)
}

export const rgbToHsl = (
  r: number,
  g: number,
  b: number
): { h: number; s: number; l: number } => {
  const rN = r / 255
  const gN = g / 255
  const bN = b / 255
  const max = Math.max(rN, gN, bN)
  const min = Math.min(rN, gN, bN)
  const l = (max + min) / 2

  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) }

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  switch (max) {
    case rN:
      h = ((gN - bN) / d + (gN < bN ? 6 : 0)) / 6
      break
    case gN:
      h = ((bN - rN) / d + 2) / 6
      break
    case bN:
      h = ((rN - gN) / d + 4) / 6
      break
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  }
}

export const formatHsl = (r: number, g: number, b: number): string => {
  const { h, s, l } = rgbToHsl(r, g, b)
  return `hsl(${h}, ${s}%, ${l}%)`
}

const RGB_RE =
  /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)/i
const HSL_RE =
  /^hsla?\(\s*([\d.]+)[\s,]+([\d.]+)%?[\s,]+([\d.]+)%?(?:[\s,/]+([\d.]+%?))?\s*\)/i
const HEX8_RE = /^#?([0-9a-fA-F]{8})$/
const HEX4_RE = /^#?([0-9a-fA-F]{4})$/

export interface ParsedColor {
  hex: string
  alpha: number
}

const parseAlphaToken = (token: string | undefined): number => {
  if (!token) return 1
  return token.endsWith("%")
    ? clamp(parseFloat(token) / 100, 0, 1)
    : clamp(parseFloat(token), 0, 1)
}

/**
 * Parse a color string and return both the opaque hex and the alpha channel.
 * Supports hex (3/4/6/8), rgb(a), and hsl(a).
 */
export const parseColorWithAlpha = (input: string): ParsedColor | null => {
  const raw = input.trim()
  if (!raw) return null

  const rgbMatch = raw.match(RGB_RE)
  if (rgbMatch) {
    return {
      hex: rgbToHex(
        parseFloat(rgbMatch[1]),
        parseFloat(rgbMatch[2]),
        parseFloat(rgbMatch[3])
      ),
      alpha: parseAlphaToken(rgbMatch[4])
    }
  }

  const hslMatch = raw.match(HSL_RE)
  if (hslMatch) {
    return {
      hex: hslToHex(
        parseFloat(hslMatch[1]),
        parseFloat(hslMatch[2]),
        parseFloat(hslMatch[3])
      ),
      alpha: parseAlphaToken(hslMatch[4])
    }
  }

  const hex8Match = raw.match(HEX8_RE)
  if (hex8Match) {
    const h = hex8Match[1]
    const hex = `#${h.slice(0, 6)}`.toLowerCase()
    const alpha = clamp(parseInt(h.slice(6, 8), 16) / 255, 0, 1)
    return { hex, alpha }
  }

  const hex4Match = raw.match(HEX4_RE)
  if (hex4Match) {
    const [r, g, b, a] = hex4Match[1]
    const hex = `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
    const alpha = clamp(parseInt(`${a}${a}`, 16) / 255, 0, 1)
    return { hex, alpha }
  }

  const withHash = raw.startsWith("#") ? raw : `#${raw}`
  const cleaned = `#${withHash.slice(1).replace(/[^0-9a-fA-F]/g, "")}`
  if (cleaned.length === 4) {
    const [, r, g, b] = cleaned
    return { hex: `#${r}${r}${g}${g}${b}${b}`.toLowerCase(), alpha: 1 }
  }
  if (cleaned.length === 7) return { hex: cleaned.toLowerCase(), alpha: 1 }

  return null
}

/**
 * Attempts to parse a color string in hex, rgb(), or hsl() format.
 * Returns a normalized 7-char hex string, or `null` if unparseable.
 */
export const parseColor = (input: string): string | null => {
  const result = parseColorWithAlpha(input)
  return result ? result.hex : null
}

/**
 * Alpha-composite a foreground RGBA over an opaque background,
 * returning the resulting opaque hex.
 */
export const alphaBlend = (
  fgHex: string,
  fgAlpha: number,
  bgHex: string
): string => {
  if (fgAlpha >= 1) return fgHex
  const fg = hexToRgb(fgHex)
  const bg = hexToRgb(bgHex)
  const a = clamp(fgAlpha, 0, 1)
  return rgbToHex(
    Math.round(fg.r * a + bg.r * (1 - a)),
    Math.round(fg.g * a + bg.g * (1 - a)),
    Math.round(fg.b * a + bg.b * (1 - a))
  )
}

export const normalizeHex = (value: string, fallback: string): string =>
  parseColor(value) ?? fallback

export const normalizeWithAlpha = (
  value: string,
  fallback: string
): ParsedColor => {
  const parsed = parseColorWithAlpha(value)
  return parsed ?? { hex: fallback, alpha: 1 }
}

export const isValidPartialHex = (value: string): boolean => {
  if (!value.startsWith("#")) return false
  return /^#[0-9a-fA-F]{0,8}$/.test(value)
}

export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const value = normalizeHex(hex, DEFAULT_FOREGROUND).slice(1)
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return { r, g, b }
}

export const getRelativeLuminance = ({
  r,
  g,
  b
}: {
  r: number
  g: number
  b: number
}): number => {
  const toLinear = (channel: number) => {
    const normalized = channel / 255
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4)
  }
  const R = toLinear(r)
  const G = toLinear(g)
  const B = toLinear(b)
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

export const getContrastRatio = (
  foreground: string,
  background: string
): number => {
  const fgLum = getRelativeLuminance(hexToRgb(foreground))
  const bgLum = getRelativeLuminance(hexToRgb(background))
  const lighter = Math.max(fgLum, bgLum)
  const darker = Math.min(fgLum, bgLum)
  return (lighter + 0.05) / (darker + 0.05)
}

export const getReadableTextColor = (background: string): string => {
  const whiteRatio = getContrastRatio("#ffffff", background)
  const blackRatio = getContrastRatio("#000000", background)
  return whiteRatio >= blackRatio ? "#f8fafc" : "#0f172a"
}

export const withAlpha = (hex: string, alpha: number): string => {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export const uniqueNormalizedHexes = (values: string[]): string[] => {
  const seen = new Set<string>()
  const result: string[] = []
  values.forEach((value) => {
    const normalized = normalizeHex(value, "").toLowerCase()
    if (!/^#[0-9a-f]{6}$/.test(normalized)) return
    if (seen.has(normalized)) return
    seen.add(normalized)
    result.push(normalized)
  })
  return result
}

export const getHistoryHexes = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return uniqueNormalizedHexes(
    value.map((entry) => (entry as { hex?: string })?.hex || "").filter(Boolean)
  )
}

export const getWebpageHexes = (value: unknown): string[] => {
  if (!value || typeof value !== "object") return []
  const entries = Object.values(value as Record<string, unknown>)
  const hexes = entries.flatMap((domainColors) => {
    if (!Array.isArray(domainColors)) return []
    return domainColors
      .map((entry) => (entry as { hex?: string })?.hex || "")
      .filter(Boolean)
  })
  return uniqueNormalizedHexes(hexes)
}

// --- HSV conversions ---

export const hsvToRgb = (
  h: number,
  s: number,
  v: number
): { r: number; g: number; b: number } => {
  const sat = s / 100
  const val = v / 100
  const c = val * sat
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = val - c
  let r = 0
  let g = 0
  let b = 0

  if (h < 60) {
    r = c; g = x
  } else if (h < 120) {
    r = x; g = c
  } else if (h < 180) {
    g = c; b = x
  } else if (h < 240) {
    g = x; b = c
  } else if (h < 300) {
    r = x; b = c
  } else {
    r = c; b = x
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  }
}

export const rgbToHsv = (r: number, g: number, b: number): HSV => {
  const rN = r / 255
  const gN = g / 255
  const bN = b / 255
  const max = Math.max(rN, gN, bN)
  const min = Math.min(rN, gN, bN)
  const d = max - min

  let h = 0
  if (d !== 0) {
    switch (max) {
      case rN:
        h = ((gN - bN) / d + (gN < bN ? 6 : 0)) * 60
        break
      case gN:
        h = ((bN - rN) / d + 2) * 60
        break
      case bN:
        h = ((rN - gN) / d + 4) * 60
        break
    }
  }

  const s = max === 0 ? 0 : (d / max) * 100
  const v = max * 100
  return { h, s, v }
}

export const getColorFromHsv = (hsv: HSV): ColorEntry => {
  const { r, g, b } = hsvToRgb(hsv.h, hsv.s, hsv.v)
  return {
    hex: rgbToHex(r, g, b),
    rgb: `rgb(${r}, ${g}, ${b})`,
    hsl: formatHsl(r, g, b),
    timestamp: Date.now()
  }
}

export const colorToHsv = (color: ColorEntry): HSV => {
  const { r, g, b } = hexToRgb(color.hex)
  return rgbToHsv(r, g, b)
}
