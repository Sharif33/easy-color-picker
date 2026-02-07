export {}

interface ColorEntry {
  hex: string
  rgb: string
  hsl?: string
  timestamp: number
}

import { isRestrictedUrl } from "./utils/restricted-urls"

// Listen for color picked events from injected script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "COLOR_PICKED" && message.color) {
    void savePickedColor(message.color as ColorEntry)
    sendResponse({ success: true })
  }
  if (message.type === "CLEAR_WEBPAGE_HIGHLIGHTS" && message.tabId) {
    void clearWebpageHighlights(message.tabId as number)
    sendResponse({ success: true })
  }
  return false
})

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "popup") return
  port.onDisconnect.addListener(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs?.[0]
      if (!tab?.id) return
      void clearWebpageHighlights(tab.id)
    })
  })
})

async function clearWebpageHighlights(tabId: number) {
  try {
    const tab = await chrome.tabs.get(tabId)
    const url = tab.url || tab.pendingUrl || ""
    if (isRestrictedUrl(url)) {
      return
    }
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const existing = document.querySelectorAll(
          "[data-ecp-highlight=\"true\"]"
        )
        existing.forEach((node) => node.remove())
        const root = document.getElementById("ecp-highlight-root")
        if (root) root.remove()
      }
    })
  } catch (error) {
    console.error("Error clearing highlights:", error)
  }
}

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
