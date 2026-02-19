import { useMemo } from "react"

import {
  alphaBlend,
  getContrastRatio,
  getReadableTextColor,
  normalizeWithAlpha,
  withAlpha,
  DEFAULT_FOREGROUND,
  DEFAULT_BACKGROUND
} from "../utils/color-utils"
import {
  calculateWCAGCompliance,
  isLargeText,
  suggestAccessibleColors
} from "../utils/wcag-utils"

export const useContrastInfo = (
  foregroundInput: string,
  backgroundInput: string,
  fontSize: number,
  isBold: boolean
) => {
  const fgParsed = useMemo(
    () => normalizeWithAlpha(foregroundInput, DEFAULT_FOREGROUND),
    [foregroundInput]
  )

  const bgParsed = useMemo(
    () => normalizeWithAlpha(backgroundInput, DEFAULT_BACKGROUND),
    [backgroundInput]
  )

  const foreground = fgParsed.hex
  const background = bgParsed.hex
  const fgAlpha = fgParsed.alpha
  const bgAlpha = bgParsed.alpha

  const effectiveForeground = useMemo(
    () => alphaBlend(foreground, fgAlpha, background),
    [foreground, fgAlpha, background]
  )

  const effectiveBackground = useMemo(
    () => alphaBlend(background, bgAlpha, "#ffffff"),
    [background, bgAlpha]
  )

  const ratio = useMemo(
    () => getContrastRatio(effectiveForeground, effectiveBackground),
    [effectiveForeground, effectiveBackground]
  )

  const foregroundTextColor = useMemo(
    () => getReadableTextColor(foreground),
    [foreground]
  )

  const backgroundTextColor = useMemo(
    () => getReadableTextColor(background),
    [background]
  )

  const previewUiColor = useMemo(
    () => getReadableTextColor(effectiveBackground),
    [effectiveBackground]
  )

  const previewMetaColor = useMemo(
    () => withAlpha(previewUiColor, 0.68),
    [previewUiColor]
  )

  const wcag = useMemo(() => calculateWCAGCompliance(ratio), [ratio])

  const largeText = useMemo(
    () => isLargeText(fontSize, isBold),
    [fontSize, isBold]
  )

  const suggestions = useMemo(
    () => suggestAccessibleColors(effectiveForeground, effectiveBackground),
    [effectiveForeground, effectiveBackground]
  )

  return {
    foreground,
    background,
    fgAlpha,
    bgAlpha,
    effectiveForeground,
    effectiveBackground,
    ratio,
    foregroundTextColor,
    backgroundTextColor,
    previewUiColor,
    previewMetaColor,
    wcag,
    largeText,
    suggestions
  }
}
