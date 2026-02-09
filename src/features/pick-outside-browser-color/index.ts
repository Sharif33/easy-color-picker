import { hexToRgb, rgbToHsl } from "../../popup/color-utils"
import type { ColorEntry } from "../../popup/types"

export const pickOutsideBrowserColor = async (): Promise<ColorEntry | null> => {
  if (!("EyeDropper" in window)) {
    console.warn("EyeDropper is not supported in this context")
    return null
  }

  try {
    // @ts-ignore
    const eyeDropper = new EyeDropper()
    const result = await eyeDropper.open()
    const hex = result.sRGBHex.toUpperCase()
    const rgbParsed = hexToRgb(hex)
    if (!rgbParsed) return null

    const { r, g, b } = rgbParsed
    const color: ColorEntry = {
      hex,
      rgb: `rgb(${r}, ${g}, ${b})`,
      hsl: rgbToHsl(r, g, b),
      timestamp: Date.now()
    }

    try {
      await navigator.clipboard.writeText(hex)
    } catch (error) {
      console.warn("Clipboard write failed:", error)
    }

    try {
      chrome.runtime.sendMessage({ type: "COLOR_PICKED", color })
    } catch (error) {
      console.warn("Failed to send color message:", error)
    }

    return color
  } catch (error) {
    const isUserCancelled =
      error instanceof DOMException && error.name === "AbortError"
    if (!isUserCancelled) {
      console.warn("EyeDropper failed:", error)
    }
    return null
  }
}
