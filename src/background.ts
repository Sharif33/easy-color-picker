export {}

interface ColorEntry {
  hex: string
  rgb: string
  hsl?: string
  timestamp: number
}

import { isRestrictedUrl } from "./utils/restricted-urls"

const COPY_COLOR_CURRENT_MENU_ID = "copy-color-context-menu"
const COPY_COLOR_BASE_MENU_ID = "copy-color-base-context-menu"
const COPY_TEXT_COLOR_MENU_ID = "copy-text-color-context-menu"
const COPY_BACKGROUND_COLOR_MENU_ID = "copy-background-color-context-menu"
const COPY_BORDER_COLOR_MENU_ID = "copy-border-color-context-menu"
const COPY_OUTLINE_COLOR_MENU_ID = "copy-outline-color-context-menu"

const COPY_COLOR_CURRENT_TITLE = "Copy Color (Current)"
const COPY_COLOR_BASE_TITLE = "Copy Color (Base)"
const COPY_TEXT_COLOR_TITLE = "Copy Text Color"
const COPY_BACKGROUND_COLOR_TITLE = "Copy Background Color"
const COPY_BORDER_COLOR_TITLE = "Copy Border Color"
const COPY_OUTLINE_COLOR_TITLE = "Copy Outline Color"

const CONTEXT_COLOR_MAX_AGE_MS = 5 * 60 * 1000

interface ContextMenuColorSet {
  eventId: number
  timestamp: number
  hasSelection: boolean
  smart: ColorEntry | null
  baseSmart: ColorEntry | null
  text: ColorEntry | null
  background: ColorEntry | null
  border: ColorEntry | null
  outline: ColorEntry | null
}

type ColorCopyMode =
  | "smartCurrent"
  | "smartBase"
  | "text"
  | "background"
  | "border"
  | "outline"

const contextMenuColorsByTab = new Map<number, ContextMenuColorSet>()

void initializeBadgeState()
void initializeContextMenu()

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
  if (message.type === "CONTEXT_MENU_COLORS_DETECTED" && message.colors) {
    const tabId = sender.tab?.id
    if (typeof tabId === "number") {
      const colors = normalizeContextMenuColorSet(message.colors as Partial<ContextMenuColorSet>)
      const previous = contextMenuColorsByTab.get(tabId) ?? null
      const next = mergeContextMenuColorSet(previous, colors)
      contextMenuColorsByTab.set(tabId, next)
      void updateCopyColorMenuTitles(next)
    }
    sendResponse({ success: true })
  }
  if (message.type === "CONTEXT_MENU_BASE_SMART_DETECTED") {
    const tabId = sender.tab?.id
    if (typeof tabId === "number") {
      const previous = contextMenuColorsByTab.get(tabId) ?? null
      if (previous && typeof message.eventId === "number" && previous.eventId === message.eventId) {
        const baseSmart = sanitizeColorEntry(message.baseSmart)
        const next = {
          ...previous,
          baseSmart,
          timestamp: Date.now()
        }
        contextMenuColorsByTab.set(tabId, next)
        void updateCopyColorMenuTitles(next)
      }
    }
    sendResponse({ success: true })
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

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === COPY_COLOR_CURRENT_MENU_ID) {
    void handleCopyColorMenuClick(tab?.id, "smartCurrent")
    return
  }
  if (info.menuItemId === COPY_COLOR_BASE_MENU_ID) {
    void handleCopyColorMenuClick(tab?.id, "smartBase")
    return
  }
  if (info.menuItemId === COPY_TEXT_COLOR_MENU_ID) {
    void handleCopyColorMenuClick(tab?.id, "text")
    return
  }
  if (info.menuItemId === COPY_BACKGROUND_COLOR_MENU_ID) {
    void handleCopyColorMenuClick(tab?.id, "background")
    return
  }
  if (info.menuItemId === COPY_BORDER_COLOR_MENU_ID) {
    void handleCopyColorMenuClick(tab?.id, "border")
    return
  }
  if (info.menuItemId === COPY_OUTLINE_COLOR_MENU_ID) {
    void handleCopyColorMenuClick(tab?.id, "outline")
  }
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

async function initializeContextMenu() {
  try {
    await chrome.contextMenus.removeAll()
    chrome.contextMenus.create({
      id: COPY_COLOR_CURRENT_MENU_ID,
      title: COPY_COLOR_CURRENT_TITLE,
      contexts: ["all"]
    })
    chrome.contextMenus.create({
      id: COPY_COLOR_BASE_MENU_ID,
      title: COPY_COLOR_BASE_TITLE,
      contexts: ["all"]
    })
    chrome.contextMenus.create({
      id: COPY_TEXT_COLOR_MENU_ID,
      title: COPY_TEXT_COLOR_TITLE,
      contexts: ["all"]
    })
    chrome.contextMenus.create({
      id: COPY_BACKGROUND_COLOR_MENU_ID,
      title: COPY_BACKGROUND_COLOR_TITLE,
      contexts: ["all"]
    })
    chrome.contextMenus.create({
      id: COPY_BORDER_COLOR_MENU_ID,
      title: COPY_BORDER_COLOR_TITLE,
      contexts: ["all"]
    })
    chrome.contextMenus.create({
      id: COPY_OUTLINE_COLOR_MENU_ID,
      title: COPY_OUTLINE_COLOR_TITLE,
      contexts: ["all"]
    })
  } catch (error) {
    console.error("Error initializing context menu:", error)
  }
}

async function updateCopyColorMenuTitles(colors?: ContextMenuColorSet) {
  try {
    const smartCurrentTitle = formatMenuTitle(
      COPY_COLOR_CURRENT_TITLE,
      colors?.smart?.hex
    )
    const smartBaseTitle = formatMenuTitle(
      COPY_COLOR_BASE_TITLE,
      colors?.baseSmart?.hex
    )
    const textTitle = formatMenuTitle(COPY_TEXT_COLOR_TITLE, colors?.text?.hex)
    const backgroundTitle = formatMenuTitle(
      COPY_BACKGROUND_COLOR_TITLE,
      colors?.background?.hex
    )
    const borderTitle = formatMenuTitle(COPY_BORDER_COLOR_TITLE, colors?.border?.hex)
    const outlineTitle = formatMenuTitle(COPY_OUTLINE_COLOR_TITLE, colors?.outline?.hex)

    await chrome.contextMenus.update(COPY_COLOR_CURRENT_MENU_ID, {
      title: smartCurrentTitle
    })
    await chrome.contextMenus.update(COPY_COLOR_BASE_MENU_ID, {
      title: smartBaseTitle
    })
    await chrome.contextMenus.update(COPY_TEXT_COLOR_MENU_ID, { title: textTitle })
    await chrome.contextMenus.update(COPY_BACKGROUND_COLOR_MENU_ID, {
      title: backgroundTitle
    })
    await chrome.contextMenus.update(COPY_BORDER_COLOR_MENU_ID, { title: borderTitle })
    await chrome.contextMenus.update(COPY_OUTLINE_COLOR_MENU_ID, { title: outlineTitle })
  } catch (error) {
    console.error("Error updating context menu title:", error)
  }
}

function formatMenuTitle(baseTitle: string, hex?: string) {
  return hex ? `${baseTitle} (${hex})` : baseTitle
}

async function handleCopyColorMenuClick(tabId: number | undefined, mode: ColorCopyMode) {
  if (typeof tabId !== "number") return

  const colors = getFreshContextMenuColors(tabId)
  const color = pickColorByMode(colors, mode)
  if (!color) {
    contextMenuColorsByTab.set(tabId, createEmptyContextMenuColorSet(false))
    await updateCopyColorMenuTitles()
    return
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      args: [color.hex],
      func: async (hex: string) => {
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(hex)
            return
          }
        } catch {
          // Fallback below.
        }

        const textarea = document.createElement("textarea")
        textarea.value = hex
        textarea.style.position = "fixed"
        textarea.style.top = "-9999px"
        textarea.style.left = "-9999px"
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        document.execCommand("copy")
        textarea.remove()
      }
    })

    await savePickedColor(color)
    await updateCopyColorMenuTitles(colors ?? undefined)
  } catch (error) {
    console.error("Error copying context menu color:", error)
  }
}

function pickColorByMode(colors: ContextMenuColorSet | null, mode: ColorCopyMode) {
  if (!colors) return null
  if (mode === "smartCurrent") return colors.smart
  if (mode === "smartBase") return colors.baseSmart
  if (mode === "text") return colors.text
  if (mode === "background") return colors.background
  if (mode === "border") return colors.border
  if (mode === "outline") return colors.outline
  return null
}

function createEmptyContextMenuColorSet(hasSelection: boolean): ContextMenuColorSet {
  return {
    eventId: 0,
    timestamp: Date.now(),
    hasSelection,
    smart: null,
    baseSmart: null,
    text: null,
    background: null,
    border: null,
    outline: null
  }
}

function normalizeContextMenuColorSet(
  payload: Partial<ContextMenuColorSet>
): ContextMenuColorSet {
  const empty = createEmptyContextMenuColorSet(Boolean(payload.hasSelection))

  return {
    ...empty,
    eventId: typeof payload.eventId === "number" ? payload.eventId : empty.eventId,
    timestamp:
      typeof payload.timestamp === "number" ? payload.timestamp : empty.timestamp,
    smart: sanitizeColorEntry(payload.smart),
    baseSmart: sanitizeColorEntry(payload.baseSmart),
    text: sanitizeColorEntry(payload.text),
    background: sanitizeColorEntry(payload.background),
    border: sanitizeColorEntry(payload.border),
    outline: sanitizeColorEntry(payload.outline)
  }
}

function mergeContextMenuColorSet(
  previous: ContextMenuColorSet | null,
  incoming: ContextMenuColorSet
): ContextMenuColorSet {
  if (!previous) return incoming
  if (incoming.eventId > previous.eventId) return incoming
  if (incoming.eventId < previous.eventId) return previous

  return {
    ...previous,
    ...incoming,
    smart: incoming.smart ?? previous.smart,
    baseSmart: incoming.baseSmart ?? previous.baseSmart,
    text: incoming.text ?? previous.text,
    background: incoming.background ?? previous.background,
    border: incoming.border ?? previous.border,
    outline: incoming.outline ?? previous.outline
  }
}

function sanitizeColorEntry(value: unknown): ColorEntry | null {
  if (!value || typeof value !== "object") return null
  const candidate = value as Partial<ColorEntry>
  if (typeof candidate.hex !== "string" || typeof candidate.rgb !== "string") {
    return null
  }
  return {
    hex: candidate.hex,
    rgb: candidate.rgb,
    timestamp:
      typeof candidate.timestamp === "number" ? candidate.timestamp : Date.now(),
    hsl: typeof candidate.hsl === "string" ? candidate.hsl : undefined
  }
}

function getFreshContextMenuColors(tabId: number) {
  const colors = contextMenuColorsByTab.get(tabId)
  if (!colors) return null
  if (Date.now() - colors.timestamp > CONTEXT_COLOR_MAX_AGE_MS) {
    contextMenuColorsByTab.delete(tabId)
    return null
  }
  return colors
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
