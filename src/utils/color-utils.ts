export const DEFAULT_FOREGROUND = "#111827"
export const DEFAULT_BACKGROUND = "#f8fafc"

export const normalizeHex = (value: string, fallback: string): string => {
  const raw = value.trim()
  if (!raw) return fallback
  const withHash = raw.startsWith("#") ? raw : `#${raw}`
  const cleaned = `#${withHash.slice(1).replace(/[^0-9a-fA-F]/g, "")}`
  if (cleaned.length === 4) {
    const r = cleaned[1]
    const g = cleaned[2]
    const b = cleaned[3]
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  if (cleaned.length === 7) return cleaned.toLowerCase()
  return fallback
}

export const isValidPartialHex = (value: string): boolean => {
  if (!value.startsWith("#")) return false
  return /^#[0-9a-fA-F]{0,6}$/.test(value)
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
