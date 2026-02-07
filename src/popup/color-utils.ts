import type { ColorEntry, HSV } from "./types"

export const hsvToRgb = (
  h: number,
  s: number,
  v: number
): { r: number; g: number; b: number } => {
  s = s / 100
  v = v / 100
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0
  let g = 0
  let b = 0

  if (h < 60) {
    r = c
    g = x
    b = 0
  } else if (h < 120) {
    r = x
    g = c
    b = 0
  } else if (h < 180) {
    r = 0
    g = c
    b = x
  } else if (h < 240) {
    r = 0
    g = x
    b = c
  } else if (h < 300) {
    r = x
    g = 0
    b = c
  } else {
    r = c
    g = 0
    b = x
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  }
}

export const rgbToHex = (r: number, g: number, b: number): string => {
  return (
    "#" +
    [r, g, b]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  )
}

export const rgbToHsl = (r: number, g: number, b: number): string => {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`
}

export const getColorFromHsv = (hsv: HSV): ColorEntry => {
  const { r, g, b } = hsvToRgb(hsv.h, hsv.s, hsv.v)
  return {
    hex: rgbToHex(r, g, b),
    rgb: `rgb(${r}, ${g}, ${b})`,
    hsl: rgbToHsl(r, g, b),
    timestamp: Date.now()
  }
}

export const hexToRgb = (
  hex: string
): { r: number; g: number; b: number } | null => {
  const normalized = hex.trim().replace(/^#/, "")
  if (normalized.length !== 6) return null
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null
  return { r, g, b }
}

export const rgbToHsv = (r: number, g: number, b: number): HSV => {
  const rNorm = r / 255
  const gNorm = g / 255
  const bNorm = b / 255
  const max = Math.max(rNorm, gNorm, bNorm)
  const min = Math.min(rNorm, gNorm, bNorm)
  const d = max - min

  let h = 0
  if (d !== 0) {
    switch (max) {
      case rNorm:
        h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) * 60
        break
      case gNorm:
        h = ((bNorm - rNorm) / d + 2) * 60
        break
      case bNorm:
        h = ((rNorm - gNorm) / d + 4) * 60
        break
    }
  }

  const s = max === 0 ? 0 : (d / max) * 100
  const v = max * 100
  return { h, s, v }
}

export const colorToHsv = (color: ColorEntry): HSV | null => {
  const rgbFromHex = hexToRgb(color.hex)
  if (rgbFromHex) {
    return rgbToHsv(rgbFromHex.r, rgbFromHex.g, rgbFromHex.b)
  }

  const match = color.rgb.match(/rgb\\s*\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)\\s*\\)/i)
  if (!match) return null
  const r = parseInt(match[1], 10)
  const g = parseInt(match[2], 10)
  const b = parseInt(match[3], 10)
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null
  return rgbToHsv(r, g, b)
}
