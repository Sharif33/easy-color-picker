import type { PlasmoCSConfig } from "plasmo"

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

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle",
  all_frames: true
}

let lastContextTarget: Element | null = null
let lastContextPoint: { x: number; y: number } | null = null
const FOCUS_HIGHLIGHT_ID = "ecp-context-analytics-focus-highlight"

// In dev, hot-reloading the extension can invalidate old page contexts.
// Guard runtime calls so stale content scripts fail silently instead of throwing.
const isRuntimeContextValid = () => {
  try {
    return Boolean(chrome?.runtime?.id)
  } catch {
    return false
  }
}

window.addEventListener("error", (event) => {
  if (String(event.error).includes("Extension context invalidated")) {
    event.preventDefault()
  }
})

document.addEventListener(
  "contextmenu",
  (event) => {
    lastContextPoint = { x: event.clientX, y: event.clientY }
    lastContextTarget = resolveBestContextTarget(event)
    if (!isRuntimeContextValid()) return

    try {
      const target = lastContextTarget ?? resolveTarget()
      const data = collectContextAnalytics(target)
      chrome.runtime.sendMessage({
        type: "CONTEXT_ANALYTICS_CAPTURED",
        data
      })
    } catch {
      // Ignore transient page/runtime errors.
    }
  },
  true
)

if (isRuntimeContextValid()) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "FOCUS_CONTEXT_ANALYTICS") {
      try {
        focusAnalyzedTarget()
        sendResponse({ success: true })
      } catch {
        sendResponse({ success: false })
      }
      return true
    }

    if (message?.type !== "GET_CONTEXT_ANALYTICS") return false

    try {
      const target = resolveTarget()
      if (!target) {
        sendResponse({ success: false })
        return true
      }

      const data = collectContextAnalytics(target)
      sendResponse({ success: true, data })
    } catch {
      sendResponse({ success: false })
    }
    return true
  })
} else {
  // no-op: this content script instance is stale after extension reload
}

function resolveTarget() {
  if (lastContextTarget?.isConnected) return lastContextTarget
  if (lastContextPoint) {
    const byPoint = document.elementFromPoint(lastContextPoint.x, lastContextPoint.y)
    if (byPoint) return normalizeTarget(byPoint)
  }
  if (document.activeElement instanceof Element) return document.activeElement
  return document.body
}

function resolveBestContextTarget(event: MouseEvent) {
  const candidates: Element[] = []

  if (event.target instanceof Element) {
    candidates.push(event.target)
  } else if (event.target instanceof Node && event.target.parentElement) {
    candidates.push(event.target.parentElement)
  }

  const path = event.composedPath()
  for (const node of path) {
    if (node instanceof Element) {
      candidates.push(node)
    }
  }

  const pointElement = document.elementFromPoint(event.clientX, event.clientY)
  if (pointElement) candidates.push(pointElement)

  const selection = window.getSelection()
  if (selection && selection.toString().trim().length > 0) {
    const anchor = selection.anchorNode
    if (anchor instanceof Element) {
      candidates.push(anchor)
    } else if (anchor?.parentElement) {
      candidates.push(anchor.parentElement)
    }
  }

  const deduped = Array.from(new Set(candidates))
  const scored = deduped
    .flatMap((candidate) => expandCandidateSet(normalizeTarget(candidate)))
    .filter((candidate, index, arr) => arr.indexOf(candidate) === index)
    .filter((candidate) => isValidTarget(candidate, event.clientX, event.clientY))
    .map((candidate) => ({
      candidate,
      score: scoreCandidate(candidate, event.clientX, event.clientY)
    }))
    .sort((a, b) => b.score - a.score)

  if (scored.length > 0) return scored[0].candidate
  return pointElement ? normalizeTarget(pointElement) : document.body
}

function normalizeTarget(element: Element) {
  const semanticParent = element.closest(
    "button,a,input,select,textarea,label,summary,[role]"
  )
  if (semanticParent) return semanticParent
  return element
}

function expandCandidateSet(element: Element) {
  const expanded: Element[] = [element]
  let current: Element | null = element.parentElement
  let depth = 0
  while (current && depth < 3) {
    expanded.push(normalizeTarget(current))
    current = current.parentElement
    depth += 1
  }
  return expanded
}

function scoreCandidate(element: Element, x: number, y: number) {
  const tag = element.tagName.toLowerCase()
  if (tag === "html") return -100
  if (tag === "body") return -40

  const rect = element.getBoundingClientRect()
  const area = rect.width * rect.height
  const containsPoint =
    x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
  const style = getComputedStyle(element)

  let score = 0
  if (containsPoint) score += 10
  if (isInteractiveElement(element)) score += 8
  if (element.id || element.classList.length > 0) score += 3
  if (style.backgroundColor && style.backgroundColor !== "rgba(0, 0, 0, 0)") {
    score += 2
  }
  if (
    parseFloat(style.borderTopWidth) > 0 ||
    parseFloat(style.borderRightWidth) > 0 ||
    parseFloat(style.borderBottomWidth) > 0 ||
    parseFloat(style.borderLeftWidth) > 0
  ) {
    score += 2
  }
  if (area > 36 && area < window.innerWidth * window.innerHeight * 0.7) {
    score += 2
  } else if (area >= window.innerWidth * window.innerHeight * 0.7) {
    score -= 4
  }
  if (tag === "span" || tag === "strong" || tag === "em") score -= 2

  return score
}

function isInteractiveElement(element: Element) {
  const tag = element.tagName.toLowerCase()
  if (
    tag === "button" ||
    tag === "a" ||
    tag === "input" ||
    tag === "select" ||
    tag === "textarea" ||
    tag === "summary" ||
    tag === "label"
  ) {
    return true
  }
  const role = element.getAttribute("role")
  if (role === "button" || role === "link" || role === "menuitem") return true
  const html = element as HTMLElement
  return html.tabIndex >= 0
}

function isValidTarget(element: Element, x: number, y: number) {
  const tag = element.tagName.toLowerCase()
  if (tag === "html") return false
  const rect = element.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return false
  const containsPoint =
    x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
  if (containsPoint) return true
  return tag !== "body"
}

function collectContextAnalytics(target: Element): ContextAnalyticsData {
  const computed = getComputedStyle(target)
  const rect = target.getBoundingClientRect()

  return {
    selector: buildSelector(target),
    width: rect.width,
    height: rect.height,
    color: computed.color,
    background: findEffectiveBackgroundColor(target),
    font: `${computed.fontSize} ${computed.fontFamily}`,
    padding: `${computed.paddingTop} ${computed.paddingRight} ${computed.paddingBottom} ${computed.paddingLeft}`,
    role: resolveRole(target),
    name: resolveAccessibleName(target),
    keyboardFocusable: isKeyboardFocusable(target),
    timestamp: Date.now()
  }
}

function focusAnalyzedTarget() {
  const target = resolveTarget()
  if (!target) return

  target.scrollIntoView({
    block: "center",
    inline: "nearest",
    behavior: "smooth"
  })

  const html = target as HTMLElement
  if (typeof html.focus === "function") {
    const previousTabIndex = html.getAttribute("tabindex")
    if (html.tabIndex < 0) {
      html.setAttribute("tabindex", "-1")
    }
    html.focus({ preventScroll: true })
    window.setTimeout(() => {
      if (previousTabIndex === null) {
        html.removeAttribute("tabindex")
      } else {
        html.setAttribute("tabindex", previousTabIndex)
      }
    }, 2500)
  }

  renderFocusHighlight(target)
}

function renderFocusHighlight(target: Element) {
  const existing = document.getElementById(FOCUS_HIGHLIGHT_ID)
  if (existing) existing.remove()

  const rect = target.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return

  const highlight = document.createElement("div")
  highlight.id = FOCUS_HIGHLIGHT_ID
  highlight.style.position = "fixed"
  highlight.style.left = `${rect.left}px`
  highlight.style.top = `${rect.top}px`
  highlight.style.width = `${rect.width}px`
  highlight.style.height = `${rect.height}px`
  highlight.style.border = "2px solid #2563eb"
  highlight.style.background = "rgba(37, 99, 235, 0.12)"
  highlight.style.boxSizing = "border-box"
  highlight.style.borderRadius = "4px"
  highlight.style.pointerEvents = "none"
  highlight.style.zIndex = "2147483646"
  document.documentElement.appendChild(highlight)

  // Highlight stays visible until popup closes
  // No automatic timeout - cleanup handled by popup close event
}

function buildSelector(element: Element) {
  const tag = element.tagName.toLowerCase()
  const id = element.id ? `#${element.id}` : ""
  const classes = Array.from(element.classList).slice(0, 8)
  const classText = classes.length ? `.${classes.join(".")}` : ""
  return `${tag}${id}${classText}` || tag
}

function findEffectiveBackgroundColor(element: Element) {
  let node: Element | null = element
  while (node) {
    const bg = getComputedStyle(node).backgroundColor
    if (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") {
      return bg
    }
    node = node.parentElement
  }
  // Fallback to document background or white
  const docBg = getComputedStyle(document.documentElement).backgroundColor
  if (docBg && docBg !== "transparent" && docBg !== "rgba(0, 0, 0, 0)") {
    return docBg
  }
  return "rgb(255, 255, 255)"
}

function resolveRole(element: Element) {
  const explicitRole = element.getAttribute("role")
  if (explicitRole) return explicitRole
  const tag = element.tagName.toLowerCase()
  if (tag === "button") return "button"
  if (tag === "a" && (element as HTMLAnchorElement).href) return "link"
  return tag
}

function resolveAccessibleName(element: Element) {
  const ariaLabel = element.getAttribute("aria-label")
  if (ariaLabel?.trim()) return ariaLabel.trim()
  
  const ariaLabelledBy = element.getAttribute("aria-labelledby")
  if (ariaLabelledBy) {
    const labelElement = document.getElementById(ariaLabelledBy)
    const labelText = labelElement?.textContent?.replace(/\s+/g, " ").trim()
    if (labelText) return labelText.slice(0, 120)
  }
  
  const title = element.getAttribute("title")
  if (title?.trim()) return title.trim().slice(0, 120)
  
  const text = element.textContent?.replace(/\s+/g, " ").trim()
  return text ? text.slice(0, 120) : "--"
}

function isKeyboardFocusable(element: Element) {
  const html = element as HTMLElement
  if (html.tabIndex >= 0) return true
  const tag = element.tagName.toLowerCase()
  if (tag === "button" || tag === "select" || tag === "textarea") return true
  if (tag === "input") return !(element as HTMLInputElement).disabled
  if (tag === "a") return Boolean((element as HTMLAnchorElement).href)
  return element.getAttribute("contenteditable") === "true"
}
