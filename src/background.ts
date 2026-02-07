export {}

interface ColorEntry {
  hex: string
  rgb: string
  hsl?: string
  timestamp: number
}

// Listen for color picked events from injected script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "COLOR_PICKED" && message.color) {
    void savePickedColor(message.color as ColorEntry)
    sendResponse({ success: true })
  }
  return false
})

async function savePickedColor(color: ColorEntry) {
  try {
    const data = await chrome.storage.local.get(["colorHistory"])
    const history: ColorEntry[] = Array.isArray(data.colorHistory)
      ? data.colorHistory
      : []
    const updated = [color, ...history.filter((c) => c.hex !== color.hex)].slice(
      0,
      35
    )

    await chrome.storage.local.set({
      colorHistory: updated,
      lastPickedColor: color
    })
  } catch (error) {
    console.error("Error saving picked color:", error)
  }
}
