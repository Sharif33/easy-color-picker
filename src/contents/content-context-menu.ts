import type { PlasmoCSConfig } from "plasmo"

interface ContextColorPayload {
  hex: string
  rgb: string
  timestamp: number
}

interface ContextMenuColorSet {
  eventId: number
  timestamp: number
  hasSelection: boolean
  smart: ContextColorPayload | null
  baseSmart: ContextColorPayload | null
  text: ContextColorPayload | null
  background: ContextColorPayload | null
  border: ContextColorPayload | null
  outline: ContextColorPayload | null
}

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle",
  all_frames: true
}

let contextEventId = 0

document.addEventListener(
  "contextmenu",
  (event) => {
    contextEventId += 1
    const eventId = contextEventId

    const { targetElement, hasSelection } = resolveTargetElement(event)
    const payload = targetElement
      ? detectContextColors(targetElement, hasSelection, eventId)
      : createEmptyColorSet(hasSelection, eventId)

    chrome.runtime.sendMessage({
      type: "CONTEXT_MENU_COLORS_DETECTED",
      colors: payload
    })

    if (!targetElement) return

    // Capture a second sample after the native context menu opens. In many pages
    // this reflects non-hover styles once pointer focus leaves the element.
    window.setTimeout(() => {
      const baseColors = detectContextColors(targetElement, hasSelection, eventId)
      chrome.runtime.sendMessage({
        type: "CONTEXT_MENU_BASE_SMART_DETECTED",
        eventId,
        baseSmart: baseColors.smart
      })
    }, 120)
  },
  true
)

function resolveTargetElement(event: MouseEvent) {
  const selection = window.getSelection()
  if (selection && selection.toString().trim().length > 0) {
    const anchorNode = selection.anchorNode
    if (anchorNode instanceof Element) {
      return { targetElement: anchorNode, hasSelection: true }
    }
    if (anchorNode?.parentElement) {
      return { targetElement: anchorNode.parentElement, hasSelection: true }
    }
  }

  if (event.target instanceof Element) {
    return { targetElement: event.target, hasSelection: false }
  }
  if (event.target instanceof Node) {
    return { targetElement: event.target.parentElement, hasSelection: false }
  }
  return { targetElement: null, hasSelection: false }
}

function createEmptyColorSet(
  hasSelection: boolean,
  eventId: number
): ContextMenuColorSet {
  return {
    eventId,
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

function detectContextColors(
  element: Element,
  hasSelection: boolean,
  eventId: number
): ContextMenuColorSet {
  const text = readSingleStyleColor(element, "color")
  const background = findNonTransparentColorInTree(element, "backgroundColor")
  const border = readBorderColor(element)
  const outline = readSingleStyleColor(element, "outlineColor")

  const smart = hasSelection ? text ?? background ?? border ?? outline : background ?? text ?? border ?? outline

  return {
    ...createEmptyColorSet(hasSelection, eventId),
    smart,
    text,
    background,
    border,
    outline
  }
}

function readSingleStyleColor(
  element: Element,
  styleKey: "color" | "backgroundColor" | "outlineColor"
) {
  const computed = window.getComputedStyle(element)
  return toContextColor(computed[styleKey])
}

function readBorderColor(element: Element) {
  const computed = window.getComputedStyle(element)
  const keys = [
    "borderTopColor",
    "borderRightColor",
    "borderBottomColor",
    "borderLeftColor",
    "stroke",
    "fill"
  ] as const

  for (const key of keys) {
    const color = toContextColor(computed[key])
    if (color) return color
  }

  return null
}

function findNonTransparentColorInTree(
  element: Element,
  styleKey: "backgroundColor"
) {
  let current: Element | null = element
  while (current) {
    const computed = window.getComputedStyle(current)
    const color = toContextColor(computed[styleKey])
    if (color) return color
    current = current.parentElement
  }
  return null
}

function toContextColor(input: string): ContextColorPayload | null {
  const parsed = parseCssColor(input)
  if (!parsed || parsed.a <= 0) return null
  return {
    hex: rgbToHex(parsed.r, parsed.g, parsed.b),
    rgb: `rgb(${parsed.r}, ${parsed.g}, ${parsed.b})`,
    timestamp: Date.now()
  }
}

function parseCssColor(input: string) {
  if (!input || input === "transparent" || input === "inherit") return null

  const canvas = document.createElement("canvas")
  canvas.width = 1
  canvas.height = 1
  const context = canvas.getContext("2d")
  if (!context) return null

  context.clearRect(0, 0, 1, 1)
  context.fillStyle = "#000"
  context.fillStyle = input
  const normalized = context.fillStyle
  if (!normalized) return null

  if (normalized.startsWith("#")) {
    const rgba = hexToRgba(normalized)
    if (!rgba) return null
    return rgba
  }

  if (normalized.startsWith("rgb")) {
    const match = normalized.match(/rgba?\(([^)]+)\)/i)
    if (!match) return null
    const [r, g, b, a] = match[1]
      .split(",")
      .map((part) => part.trim())
      .map((part) => Number(part))

    if ([r, g, b].some((value) => Number.isNaN(value))) return null
    return {
      r: clampChannel(r),
      g: clampChannel(g),
      b: clampChannel(b),
      a: Number.isNaN(a) ? 1 : Math.min(Math.max(a, 0), 1)
    }
  }

  return null
}

function hexToRgba(hex: string) {
  const normalized = hex.replace("#", "").trim()
  if (![3, 4, 6, 8].includes(normalized.length)) return null

  const expanded =
    normalized.length <= 4
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized

  const r = parseInt(expanded.slice(0, 2), 16)
  const g = parseInt(expanded.slice(2, 4), 16)
  const b = parseInt(expanded.slice(4, 6), 16)
  const alphaHex = expanded.length === 8 ? expanded.slice(6, 8) : "ff"
  const alphaInt = parseInt(alphaHex, 16)

  if ([r, g, b, alphaInt].some((value) => Number.isNaN(value))) return null

  return {
    r,
    g,
    b,
    a: Math.min(Math.max(alphaInt / 255, 0), 1)
  }
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (channel: number) =>
    clampChannel(channel).toString(16).padStart(2, "0")
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

function clampChannel(value: number) {
  return Math.min(255, Math.max(0, Math.round(value)))
}
