export type PaletteSource =
  | "color-history"
  | "webpage-colors"
  | "combined-colors"
  | "saved-pairs"

export const PALETTE_OPTIONS: Array<{ value: PaletteSource; label: string }> = [
  { value: "color-history", label: "Color History" },
  { value: "webpage-colors", label: "Webpage Colors" },
  { value: "combined-colors", label: "Combined Colors" },
  { value: "saved-pairs", label: "Saved Pairs" }
]
