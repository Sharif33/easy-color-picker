import { useMemo } from "react"
import {
  getContrastRatio,
  getReadableTextColor,
  normalizeHex,
  withAlpha,
  DEFAULT_FOREGROUND,
  DEFAULT_BACKGROUND
} from "../utils/color-utils"
import { calculateWCAGCompliance, isLargeText } from "../utils/wcag-utils"

export const useContrastInfo = (
  foregroundInput: string,
  backgroundInput: string,
  fontSize: number,
  isBold: boolean
) => {
  const foreground = useMemo(
    () => normalizeHex(foregroundInput, DEFAULT_FOREGROUND),
    [foregroundInput]
  )
  
  const background = useMemo(
    () => normalizeHex(backgroundInput, DEFAULT_BACKGROUND),
    [backgroundInput]
  )

  const ratio = useMemo(
    () => getContrastRatio(foreground, background),
    [foreground, background]
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
    () => getReadableTextColor(background),
    [background]
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

  return {
    foreground,
    background,
    ratio,
    foregroundTextColor,
    backgroundTextColor,
    previewUiColor,
    previewMetaColor,
    wcag,
    largeText
  }
}
