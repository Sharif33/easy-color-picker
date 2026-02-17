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
