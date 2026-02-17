export type PaletteSource =
  | "color-history"
  | "webpage-colors"
  | "combined-colors"

export const PALETTE_OPTIONS: Array<{ value: PaletteSource; label: string }> = [
  { value: "color-history", label: "Color History" },
  { value: "webpage-colors", label: "Webpage Colors" },
  { value: "combined-colors", label: "Combined Colors" }
]
