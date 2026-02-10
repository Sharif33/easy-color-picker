export {}

interface ColorEntry {
  hex: string
  rgb: string
  hsl?: string
  timestamp: number
}

import { isRestrictedUrl } from "./utils/restricted-urls"

void initializeBadgeState()

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

chrome.runtime.onInstalled.addListener(() => {
  void initializeBadgeState()
})

chrome.runtime.onStartup.addListener(() => {
  void initializeBadgeState()
})

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return
  if (!Object.prototype.hasOwnProperty.call(changes, "lastPickedColor")) return
  const nextColor = (changes.lastPickedColor?.newValue as ColorEntry | undefined) ?? null
  void updateBadgeColor(nextColor)
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

async function initializeBadgeState() {
  try {
    const data = await chrome.storage.local.get(["lastPickedColor"])
    const color = (data.lastPickedColor as ColorEntry | undefined) ?? null
    await updateBadgeColor(color)
  } catch (error) {
    console.error("Error initializing badge:", error)
  }
}

async function updateBadgeColor(color: ColorEntry | null) {
  try {
    if (!color?.hex) {
      await chrome.action.setBadgeText({ text: "" })
      await chrome.action.setTitle({ title: "Color Hub" })
      return
    }

    const { r, g, b } = hexToRgb(color.hex)
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
    const textColor: [number, number, number, number] =
      luminance > 0.6 ? [0, 0, 0, 255] : [255, 255, 255, 255]

    await chrome.action.setBadgeText({ text: " " })
    await chrome.action.setBadgeBackgroundColor({ color: [r, g, b, 255] })
    await chrome.action.setBadgeTextColor({ color: textColor })
    await chrome.action.setTitle({ title: `Color Hub • Last picked ${color.hex}` })
  } catch (error) {
    console.error("Error updating badge:", error)
  }
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "").trim()
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((ch) => `${ch}${ch}`)
          .join("")
      : normalized

  const r = parseInt(value.slice(0, 2), 16) || 0
  const g = parseInt(value.slice(2, 4), 16) || 0
  const b = parseInt(value.slice(4, 6), 16) || 0

  return { r, g, b }
}
