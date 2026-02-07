import { useCallback, useEffect, useRef, useState } from "react"

import "~style.css"

import {
  colorToHsv,
  getColorFromHsv,
  hsvToRgb,
  rgbToHsl
} from "./popup/color-utils"
import { pickColorInPage } from "./popup/pick-color"
import type { ColorEntry, HSV } from "./popup/types"

function IndexPopup() {
  const [colorHistory, setColorHistory] = useState<ColorEntry[]>([])
  const [currentColor, setCurrentColor] = useState<ColorEntry | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [hsv, setHsv] = useState<HSV>({ h: 220, s: 66, v: 16 })

  const gradientRef = useRef<HTMLCanvasElement>(null)
  const hueRef = useRef<HTMLCanvasElement>(null)
  const [isDraggingGradient, setIsDraggingGradient] = useState(false)
  const [isDraggingHue, setIsDraggingHue] = useState(false)

  const getCurrentColorFromHsv = useCallback((): ColorEntry => {
    return getColorFromHsv(hsv)
  }, [hsv])

  const drawGradient = useCallback(() => {
    const canvas = gradientRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { width, height } = canvas
    const hueColor = hsvToRgb(hsv.h, 100, 100)
    ctx.fillStyle = `rgb(${hueColor.r}, ${hueColor.g}, ${hueColor.b})`
    ctx.fillRect(0, 0, width, height)

    const whiteGradient = ctx.createLinearGradient(0, 0, width, 0)
    whiteGradient.addColorStop(0, "rgba(255, 255, 255, 1)")
    whiteGradient.addColorStop(1, "rgba(255, 255, 255, 0)")
    ctx.fillStyle = whiteGradient
    ctx.fillRect(0, 0, width, height)

    const blackGradient = ctx.createLinearGradient(0, 0, 0, height)
    blackGradient.addColorStop(0, "rgba(0, 0, 0, 0)")
    blackGradient.addColorStop(1, "rgba(0, 0, 0, 1)")
    ctx.fillStyle = blackGradient
    ctx.fillRect(0, 0, width, height)
  }, [hsv.h])

  const drawHueSlider = useCallback(() => {
    const canvas = hueRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { height } = canvas
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, "#ff0000")
    gradient.addColorStop(0.17, "#ff00ff")
    gradient.addColorStop(0.33, "#0000ff")
    gradient.addColorStop(0.5, "#00ffff")
    gradient.addColorStop(0.67, "#00ff00")
    gradient.addColorStop(0.83, "#ffff00")
    gradient.addColorStop(1, "#ff0000")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, height)
  }, [])

  const handleGradientInteraction = (
    e: React.MouseEvent<HTMLCanvasElement>
  ) => {
    const canvas = gradientRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
    setHsv((prev) => ({
      ...prev,
      s: (x / rect.width) * 100,
      v: (1 - y / rect.height) * 100
    }))
  }

  const handleHueInteraction = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = hueRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
    setHsv((prev) => ({ ...prev, h: (y / rect.height) * 360 }))
  }

  useEffect(() => {
    setCurrentColor(getCurrentColorFromHsv())
  }, [hsv, getCurrentColorFromHsv])

  useEffect(() => {
    drawGradient()
    drawHueSlider()
  }, [drawGradient, drawHueSlider])

  useEffect(() => {
    chrome.storage.local.get(["colorHistory", "lastPickedColor"], (result) => {
      if (Array.isArray(result.colorHistory))
        setColorHistory(result.colorHistory)
      if (result.lastPickedColor?.hex) {
        const picked = result.lastPickedColor as ColorEntry
        const nextHsv = colorToHsv(picked)
        if (nextHsv) setHsv(nextHsv)
        setCurrentColor(picked)
        void copyToClipboard(picked.hex, "hex")
        chrome.storage.local.remove("lastPickedColor")
      }
    })

    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area !== "local") return
      if (changes.colorHistory?.newValue)
        setColorHistory(changes.colorHistory.newValue)
      if (changes.lastPickedColor?.newValue) {
        const picked = changes.lastPickedColor.newValue as ColorEntry
        const nextHsv = colorToHsv(picked)
        if (nextHsv) setHsv(nextHsv)
        setCurrentColor(picked)
        void copyToClipboard(picked.hex, "hex")
        chrome.storage.local.remove("lastPickedColor")
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingGradient) {
        const canvas = gradientRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
        const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
        setHsv((prev) => ({
          ...prev,
          s: (x / rect.width) * 100,
          v: (1 - y / rect.height) * 100
        }))
      }
      if (isDraggingHue) {
        const canvas = hueRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
        setHsv((prev) => ({ ...prev, h: (y / rect.height) * 360 }))
      }
    }
    const handleMouseUp = () => {
      setIsDraggingGradient(false)
      setIsDraggingHue(false)
    }
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDraggingGradient, isDraggingHue])

  const activatePicker = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs?.[0]
      if (!tab?.id) return

      // Inject EyeDropper directly from the user gesture context
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: pickColorInPage
      })

      // Close popup so user can pick from the page
      window.close()
    })
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 1500)
    } catch (error) {
      console.warn("Clipboard write failed:", error)
    }
  }

  const handleAddToHistory = () => {
    if (!currentColor) return
    const updated = [
      currentColor,
      ...colorHistory.filter((c) => c.hex !== currentColor.hex)
    ].slice(0, 35)
    setColorHistory(updated)
    chrome.storage.local.set({ colorHistory: updated })
  }

  const clearHistory = () => {
    setColorHistory([])
    chrome.storage.local.set({ colorHistory: [] })
  }

  const { r, g, b } = hsvToRgb(hsv.h, hsv.s, hsv.v)

  return (
    <div className="w-[460px] bg-gray-200 p-3 font-sans text-sm">
      <div className="flex gap-4">
        {/* LEFT: Color Picker */}
        <div className="flex gap-2">
          {/* Gradient Square */}
          <div className="flex flex-col gap-2">
            <div className="relative">
              <canvas
                ref={gradientRef}
                width={200}
                height={200}
                className="cursor-crosshair block"
                onMouseDown={(e) => {
                  setIsDraggingGradient(true)
                  handleGradientInteraction(e)
                }}
              />
              <div
                className="absolute w-3.5 h-3.5 border-2 border-white rounded-full shadow pointer-events-none"
                style={{
                  left: `${(hsv.s / 100) * 200 - 7}px`,
                  top: `${(1 - hsv.v / 100) * 200 - 7}px`
                }}
              />
            </div>
            {/* Bottom: RGB and HSL display */}
            <div className="flex flex-col gap-1">
              <input
                type="text"
                value={currentColor?.rgb || ""}
                readOnly
                onClick={() =>
                  currentColor && copyToClipboard(currentColor.rgb, "rgb-full")
                }
                className="flex-1 px-2 py-1 border border-gray-400 font-mono text-xs cursor-pointer bg-white"
              />
              <input
                type="text"
                value={currentColor?.hsl || rgbToHsl(r, g, b)}
                readOnly
                onClick={() =>
                  copyToClipboard(
                    currentColor?.hsl || rgbToHsl(r, g, b),
                    "hsl-full"
                  )
                }
                className="flex-1 px-2 py-1 border border-gray-400 font-mono text-xs cursor-pointer bg-white"
              />

              <input
                type="text"
                value={currentColor?.hex || ""}
                readOnly
                onClick={() =>
                  currentColor && copyToClipboard(currentColor.hex, "hex")
                }
                className="w-full px-1 py-0.5 border border-gray-400 cursor-pointer bg-white"
              />
              {copiedField && <span className="text-green-600 text-xs">✓</span>}
            </div>
          </div>

          {/* Hue Slider */}
          <div className="relative">
            <canvas
              ref={hueRef}
              width={20}
              height={200}
              className="cursor-pointer block"
              onMouseDown={(e) => {
                setIsDraggingHue(true)
                handleHueInteraction(e)
              }}
            />
            <div
              className="absolute w-6 h-1.5 border border-gray-700 pointer-events-none -left-0.5"
              style={{ top: `${(hsv.h / 360) * 200 - 3}px` }}>
              <div className="absolute -left-1.5 top-0 border-y-[3px] border-y-transparent border-l-[5px] border-l-gray-700" />
              <div className="absolute -right-1.5 top-0 border-y-[3px] border-y-transparent border-r-[5px] border-r-gray-700" />
            </div>
          </div>
        </div>

        {/* RIGHT: Color Info & History */}
        <div className="flex-1 flex flex-col gap-3">
          {/* New / Current Color */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1 w-full">
              <button
                onClick={activatePicker}
                className="w-full px-3 py-1 bg-white border border-gray-400 rounded text-xs cursor-pointer hover:bg-gray-50">
                Pick Color
              </button>
              <button
                onClick={handleAddToHistory}
                className="w-full px-3 py-1 bg-white border border-gray-400 rounded text-xs cursor-pointer hover:bg-gray-50">
                Add to History
              </button>
            </div>
            <div className="flex items-center w-full">
              <div className="text-center w-full">
                <div className="text-xs text-gray-500 mb-0.5">new</div>
                <div
                  className="w-full h-10"
                  style={{ backgroundColor: currentColor?.hex || "#000" }}
                />
              </div>
              <div className="text-center w-full">
                <div className="text-xs text-gray-500 mb-0.5">current</div>
                <div
                  className="w-full h-10"
                  style={{ backgroundColor: colorHistory[0]?.hex || "#333" }}
                />
              </div>
            </div>
          </div>
          {/* Color History */}
          <div>
            <div className="text-xs text-gray-700 mb-1">Color history:</div>
            <div className="flex items-end gap-1">
              <div className="grid grid-cols-8 border border-gray-300 bg-white">
                {Array.from({ length: 56 }).map((_, index) => {
                  const color = colorHistory[index]
                  return (
                    <div
                      key={index}
                      onClick={() => {
                        if (color) {
                          const nextHsv = colorToHsv(color)
                          if (nextHsv) setHsv(nextHsv)
                          setCurrentColor(color)
                          copyToClipboard(color.hex, `history-${index}`)
                        }
                      }}
                      className={`size-5 border-r border-b border-gray-300 ${color ? "cursor-pointer" : ""}`}
                      style={{ backgroundColor: color?.hex || "#f5f5f5" }}
                      title={color?.hex || ""}
                    />
                  )
                })}
              </div>
              <button
                onClick={clearHistory}
                className="size-5 bg-white border border-red-300 flex items-center justify-center cursor-pointer hover:bg-red-50"
                title="Clear history">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M1 1L9 9M1 9L9 1"
                    stroke="#cc4444"
                    strokeWidth="1.5"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IndexPopup
