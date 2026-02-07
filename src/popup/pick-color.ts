import type { ColorEntry } from "./types"

export const pickColorInPage = () => {
  const sendMessage = (payload: {
    type: string
    color?: ColorEntry
    error?: string
  }) => {
    try {
      chrome.runtime.sendMessage(payload)
    } catch (error) {
      console.error("Failed to send color message:", error)
    }
  }

  if (!("EyeDropper" in window)) {
    sendMessage({ type: "COLOR_PICKED", error: "unsupported" })
    return
  }

  try {
    // @ts-ignore
    const eyeDropper = new EyeDropper()
    eyeDropper
      .open()
      .then((result: { sRGBHex: string }) => {
        const hex = result.sRGBHex.toUpperCase()
        const r = parseInt(hex.slice(1, 3), 16)
        const g = parseInt(hex.slice(3, 5), 16)
        const b = parseInt(hex.slice(5, 7), 16)
        const rgb = `rgb(${r}, ${g}, ${b})`

        const rNorm = r / 255
        const gNorm = g / 255
        const bNorm = b / 255
        const max = Math.max(rNorm, gNorm, bNorm)
        const min = Math.min(rNorm, gNorm, bNorm)
        let h = 0
        let s = 0
        const l = (max + min) / 2
        if (max !== min) {
          const d = max - min
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
          switch (max) {
            case rNorm:
              h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6
              break
            case gNorm:
              h = ((bNorm - rNorm) / d + 2) / 6
              break
            case bNorm:
              h = ((rNorm - gNorm) / d + 4) / 6
              break
          }
        }
        const hsl = `hsl(${Math.round(h * 360)}, ${Math.round(
          s * 100
        )}%, ${Math.round(l * 100)}%)`

        try {
          navigator.clipboard.writeText(hex)
        } catch (error) {
          console.warn("Clipboard write failed in page:", error)
        }

        sendMessage({
          type: "COLOR_PICKED",
          color: { hex, rgb, hsl, timestamp: Date.now() }
        })
      })
      .catch(() => {
        sendMessage({ type: "COLOR_PICKED", error: "cancelled" })
      })
  } catch (error) {
    console.error("EyeDropper failed:", error)
    sendMessage({ type: "COLOR_PICKED", error: "failed" })
  }
}
