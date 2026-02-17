export {}

interface ColorEntry {
  hex: string
  rgb: string
  hsl?: string
  timestamp: number
}

interface ContextAnalyticsData {
  selector: string
  width: number
  height: number
  color: string
  background: string
  font: string
  padding: string
  role: string
  name: string
  keyboardFocusable: boolean
  timestamp: number
}

import { isRestrictedUrl } from "./utils/restricted-urls"

const OPEN_POPUP_MENU_ID = "color-hub-open-popup-context-menu"
const OPEN_POPUP_MENU_TITLE = "Color Hub Analytics"
const CONTEXT_ANALYTICS_STORAGE_KEY = "CONTEXT_ANALYTICS_DATA"
const CONTEXT_ANALYTICS_MAX_AGE_MS = 20 * 1000
const latestContextAnalyticsByTab = new Map<number, ContextAnalyticsData>()

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CONTEXT_ANALYTICS_CAPTURED" && message.data) {
    const tabId = sender.tab?.id
    if (typeof tabId === "number") {
      const normalized = sanitizeContextAnalyticsData(message.data)
      if (normalized) {
        latestContextAnalyticsByTab.set(tabId, normalized)
      }
    }
    sendResponse({ success: true })
    return false
  }

  if (message.type === "COLOR_PICKED" && message.color) {
    void savePickedColor(message.color as ColorEntry)
    sendResponse({ success: true })
    return false
  }

  if (message.type === "CLEAR_WEBPAGE_HIGHLIGHTS" && message.tabId) {
    void clearWebpageHighlights(message.tabId as number)
    sendResponse({ success: true })
    return false
  }

  return false
})

chrome.runtime.onInstalled.addListener(() => {
  void initializeBadgeState()
  void initializeContextMenu()
})

chrome.runtime.onStartup.addListener(() => {
  void initializeBadgeState()
  void initializeContextMenu()
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

chrome.tabs.onRemoved.addListener((tabId) => {
  latestContextAnalyticsByTab.delete(tabId)
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== OPEN_POPUP_MENU_ID) return
  void handleOpenPopupWithAnalytics(tab)
})

async function handleOpenPopupWithAnalytics(tab?: chrome.tabs.Tab) {
  const tabId = tab?.id
  let analytics: ContextAnalyticsData | null = null

  if (typeof tabId === "number") {
    await focusContextAnalyticsTarget(tabId)
    analytics =
      getFreshCapturedContextAnalytics(tabId) ?? (await getContextAnalytics(tabId))
  }

  await chrome.storage.local.set({
    [CONTEXT_ANALYTICS_STORAGE_KEY]: analytics
  })

  const windowId = tab?.windowId
  if (typeof windowId === "number") {
    await chrome.action.openPopup({ windowId })
    return
  }
  await chrome.action.openPopup()
}

async function focusContextAnalyticsTarget(tabId: number) {
  try {
    await new Promise<void>((resolve) => {
      chrome.tabs.sendMessage(tabId, { type: "FOCUS_CONTEXT_ANALYTICS" }, () => {
        resolve()
      })
    })
  } catch {
    // Best-effort only.
  }
}

async function getContextAnalytics(tabId: number): Promise<ContextAnalyticsData | null> {
  try {
    const tab = await chrome.tabs.get(tabId)
    const url = tab.url || tab.pendingUrl || ""
    if (isRestrictedUrl(url)) return null

    const messageResponse = await new Promise<{
      success?: boolean
      data?: ContextAnalyticsData
    } | null>((resolve) => {
      chrome.tabs.sendMessage(tabId, { type: "GET_CONTEXT_ANALYTICS" }, (response) => {
        if (chrome.runtime.lastError) {
          resolve(null)
          return
        }
        resolve(response ?? null)
      })
    })

    if (messageResponse?.success && messageResponse.data) {
      return sanitizeContextAnalyticsData(messageResponse.data)
    }

    const execution = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const target =
          document.activeElement instanceof Element
            ? document.activeElement
            : document.body
        const rect = target.getBoundingClientRect()
        const computed = getComputedStyle(target)
        const tag = target.tagName.toLowerCase()
        const id = target.id ? `#${target.id}` : ""
        const classes = Array.from(target.classList).slice(0, 8)
        const selector = `${tag}${id}${classes.length ? `.${classes.join(".")}` : ""}`
        const role = target.getAttribute("role") || tag

        return {
          selector,
          width: rect.width,
          height: rect.height,
          color: computed.color,
          background: computed.backgroundColor,
          font: `${computed.fontSize} ${computed.fontFamily}`,
          padding: `${computed.paddingTop} ${computed.paddingRight} ${computed.paddingBottom} ${computed.paddingLeft}`,
          role,
          name:
            target.getAttribute("aria-label") ||
            target.textContent?.replace(/\s+/g, " ").trim() ||
            "--",
          keyboardFocusable: (target as HTMLElement).tabIndex >= 0,
          timestamp: Date.now()
        }
      }
    })

    const fallback = (execution?.[0]?.result as ContextAnalyticsData | undefined) ?? null
    return sanitizeContextAnalyticsData(fallback)
  } catch (error) {
    console.error("Error collecting context analytics:", error)
    return null
  }
}

function getFreshCapturedContextAnalytics(tabId: number) {
  const data = latestContextAnalyticsByTab.get(tabId)
  if (!data) return null
  if (Date.now() - data.timestamp > CONTEXT_ANALYTICS_MAX_AGE_MS) {
    latestContextAnalyticsByTab.delete(tabId)
    return null
  }
  return data
}

function sanitizeContextAnalyticsData(
  value: unknown
): ContextAnalyticsData | null {
  if (!value || typeof value !== "object") return null
  const candidate = value as Partial<ContextAnalyticsData>
  if (typeof candidate.selector !== "string") return null
  if (typeof candidate.color !== "string") return null
  if (typeof candidate.background !== "string") return null
  if (typeof candidate.font !== "string") return null
  if (typeof candidate.padding !== "string") return null
  if (typeof candidate.role !== "string") return null
  if (typeof candidate.name !== "string") return null

  const normalized = {
    selector: candidate.selector,
    width: Number(candidate.width) || 0,
    height: Number(candidate.height) || 0,
    color: candidate.color,
    background: candidate.background,
    font: candidate.font,
    padding: candidate.padding,
    role: candidate.role,
    name: candidate.name,
    keyboardFocusable: Boolean(candidate.keyboardFocusable),
    timestamp:
      typeof candidate.timestamp === "number" ? candidate.timestamp : Date.now()
  }

  if (
    normalized.selector.toLowerCase() === "body" &&
    normalized.width === 0 &&
    normalized.height === 0
  ) {
    return null
  }

  return normalized
}

async function clearWebpageHighlights(tabId: number) {
  try {
    const tab = await chrome.tabs.get(tabId)
    const url = tab.url || tab.pendingUrl || ""
    if (isRestrictedUrl(url)) return

    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const existingHighlights = document.querySelectorAll(
          "[data-ecp-highlight=\"true\"]"
        )
        existingHighlights.forEach((node) => node.remove())
        const highlightRoot = document.getElementById("ecp-highlight-root")
        if (highlightRoot) highlightRoot.remove()

        const analyticsRoot = document.getElementById("ecp-analytics-root")
        if (analyticsRoot) analyticsRoot.remove()
        const analyticsFallbackRoot = document.getElementById(
          "ecp-analytics-fallback-root"
        )
        if (analyticsFallbackRoot) analyticsFallbackRoot.remove()
        
        // Remove context analytics focus highlight
        const contextHighlight = document.getElementById("ecp-context-analytics-focus-highlight")
        if (contextHighlight) contextHighlight.remove()
      }
    })
  } catch (error) {
    console.error("Error clearing webpage overlays:", error)
  }
}

async function initializeContextMenu() {
  try {
    await chrome.contextMenus.removeAll()
    chrome.contextMenus.create({
      id: OPEN_POPUP_MENU_ID,
      title: OPEN_POPUP_MENU_TITLE,
      contexts: ["all"]
    })
  } catch (error) {
    console.error("Error initializing context menu:", error)
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

void initializeBadgeState()
void initializeContextMenu()
