import { Check, Copy } from "lucide-react"
import { useEffect, useState } from "react"

import { getContrastTextColor } from "~utils/get-contrast-text-color"

import { hexToRgb, rgbToHsl, rgbToHsv } from "../../popup/color-utils"
import type { ColorEntry, HSV } from "../../popup/types"

interface ColorPickerPanelProps {
  hsv: HSV
  currentColor: ColorEntry | null
  gradientRef: React.RefObject<HTMLCanvasElement>
  hueRef: React.RefObject<HTMLCanvasElement>
  onGradientMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void
  onHueMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void
  onCopy: (text: string, field: string) => void
  onColorChange: (hsv: HSV) => void
  onAddToHistory: () => void
  firstHistoryColor: ColorEntry | null
  copiedField: string | null
  r: number
  g: number
  b: number
}

export const ColorPickerPanel = ({
  hsv,
  currentColor,
  gradientRef,
  hueRef,
  onGradientMouseDown,
  onHueMouseDown,
  onCopy,
  onColorChange,
  onAddToHistory,
  firstHistoryColor,
  copiedField,
  r,
  g,
  b
}: ColorPickerPanelProps) => {
  const [gradientDimensions, setGradientDimensions] = useState({
    width: 200,
    height: 200
  })
  const [rValue, setRValue] = useState(r.toString())
  const [gValue, setGValue] = useState(g.toString())
  const [bValue, setBValue] = useState(b.toString())
  const [hValue, setHValue] = useState("")
  const [sValue, setSValue] = useState("")
  const [lValue, setLValue] = useState("")
  const [hexValue, setHexValue] = useState("")

  useEffect(() => {
    setRValue(r.toString())
    setGValue(g.toString())
    setBValue(b.toString())
    setHexValue(currentColor?.hex || "")

    // Parse HSL from string
    const hslString = currentColor?.hsl || rgbToHsl(r, g, b)
    const hslMatch = hslString.match(
      /hsl\s*\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?\s*\)/i
    )
    if (hslMatch) {
      setHValue(hslMatch[1])
      setSValue(hslMatch[2])
      setLValue(hslMatch[3])
    }
  }, [currentColor, r, g, b])

  useEffect(() => {
    const updateDimensions = () => {
      if (gradientRef.current) {
        const rect = gradientRef.current.getBoundingClientRect()
        setGradientDimensions({ width: rect.width, height: rect.height })
      }
    }

    updateDimensions()
    window.addEventListener("resize", updateDimensions)
    return () => window.removeEventListener("resize", updateDimensions)
  }, [gradientRef])

  const handleRgbChange = (component: "r" | "g" | "b", value: string) => {
    const numValue = parseInt(value, 10)

    if (component === "r") setRValue(value)
    if (component === "g") setGValue(value)
    if (component === "b") setBValue(value)

    if (!isNaN(numValue) && numValue >= 0 && numValue <= 255) {
      const newR = component === "r" ? numValue : parseInt(rValue, 10)
      const newG = component === "g" ? numValue : parseInt(gValue, 10)
      const newB = component === "b" ? numValue : parseInt(bValue, 10)

      if (!isNaN(newR) && !isNaN(newG) && !isNaN(newB)) {
        const newHsv = rgbToHsv(newR, newG, newB)
        onColorChange(newHsv)
      }
    }
  }

  const handleHslChange = (component: "h" | "s" | "l", value: string) => {
    const numValue = parseInt(value, 10)

    if (component === "h") setHValue(value)
    if (component === "s") setSValue(value)
    if (component === "l") setLValue(value)

    const maxVal = component === "h" ? 360 : 100
    if (!isNaN(numValue) && numValue >= 0 && numValue <= maxVal) {
      const newH = component === "h" ? numValue : parseInt(hValue, 10)
      const newS = component === "s" ? numValue : parseInt(sValue, 10)
      const newL = component === "l" ? numValue : parseInt(lValue, 10)

      if (!isNaN(newH) && !isNaN(newS) && !isNaN(newL)) {
        // Convert HSL to RGB
        const hNorm = newH / 360
        const sNorm = newS / 100
        const lNorm = newL / 100

        const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm
        const x = c * (1 - Math.abs(((hNorm * 6) % 2) - 1))
        const m = lNorm - c / 2

        let r = 0,
          g = 0,
          b = 0
        if (hNorm < 1 / 6) {
          r = c
          g = x
          b = 0
        } else if (hNorm < 2 / 6) {
          r = x
          g = c
          b = 0
        } else if (hNorm < 3 / 6) {
          r = 0
          g = c
          b = x
        } else if (hNorm < 4 / 6) {
          r = 0
          g = x
          b = c
        } else if (hNorm < 5 / 6) {
          r = x
          g = 0
          b = c
        } else {
          r = c
          g = 0
          b = x
        }

        const rFinal = Math.round((r + m) * 255)
        const gFinal = Math.round((g + m) * 255)
        const bFinal = Math.round((b + m) * 255)

        const newHsv = rgbToHsv(rFinal, gFinal, bFinal)
        onColorChange(newHsv)
      }
    }
  }

  const handleHexChange = (value: string) => {
    setHexValue(value)
    const rgb = hexToRgb(value)
    if (rgb) {
      const newHsv = rgbToHsv(rgb.r, rgb.g, rgb.b)
      onColorChange(newHsv)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3">
        <div className="relative">
          <canvas
            ref={gradientRef}
            className="cursor-crosshair block flex-1 w-full h-[200px]"
            onMouseDown={onGradientMouseDown}
          />
          <div
            className="absolute w-3.5 h-3.5 border-2 border-white rounded-full shadow pointer-events-none"
            style={{
              left: `${(hsv.s / 100) * gradientDimensions.width - 7}px`,
              top: `${(1 - hsv.v / 100) * gradientDimensions.height - 7}px`
            }}
          />
        </div>
        <div className="relative">
          <canvas
            ref={hueRef}
            width={20}
            height={200}
            className="cursor-pointer block"
            onMouseDown={onHueMouseDown}
          />
          <div
            className="absolute w-6 h-1.5 border border-gray-700 pointer-events-none -left-0.5"
            style={{ top: `${(hsv.h / 360) * 200 - 3}px` }}>
            <div className="absolute -left-1.5 top-0 border-y-[3px] border-y-transparent border-l-[5px] border-l-gray-700" />
            <div className="absolute -right-1.5 top-0 border-y-[3px] border-y-transparent border-r-[5px] border-r-gray-700" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {/* RGB Inputs */}
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium w-8">RGB:</span>
          <div className="flex gap-1 flex-1">
            <div className="relative flex-1">
              <input
                type="number"
                min="0"
                max="255"
                value={rValue}
                onChange={(e) => handleRgbChange("r", e.target.value)}
                className="w-full px-1.5 py-1 border border-gray-400 text-xs bg-white"
                placeholder="R"
              />
            </div>
            <div className="relative flex-1">
              <input
                type="number"
                min="0"
                max="255"
                value={gValue}
                onChange={(e) => handleRgbChange("g", e.target.value)}
                className="w-full px-1.5 py-1 border border-gray-400 text-xs bg-white"
                placeholder="G"
              />
            </div>
            <div className="relative flex-1">
              <input
                type="number"
                min="0"
                max="255"
                value={bValue}
                onChange={(e) => handleRgbChange("b", e.target.value)}
                className="w-full px-1.5 py-1 border border-gray-400 text-xs bg-white"
                placeholder="B"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => onCopy(`rgb(${r}, ${g}, ${b})`, "rgb-full")}
            className="p-1 hover:bg-gray-100 rounded">
            {copiedField === "rgb-full" ? (
              <Check className="w-3 h-3 text-green-600" />
            ) : (
              <Copy className="w-3 h-3 text-gray-600" />
            )}
          </button>
        </div>

        {/* HSL Inputs */}
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium w-8">HSL:</span>
          <div className="flex gap-1 flex-1">
            <div className="relative flex-1">
              <input
                type="number"
                min="0"
                max="360"
                value={hValue}
                onChange={(e) => handleHslChange("h", e.target.value)}
                className="w-full px-1.5 py-1 border border-gray-400 text-xs bg-white"
                placeholder="H"
              />
            </div>
            <div className="relative flex-1">
              <input
                type="number"
                min="0"
                max="100"
                value={sValue}
                onChange={(e) => handleHslChange("s", e.target.value)}
                className="w-full px-1.5 py-1 border border-gray-400 text-xs bg-white"
                placeholder="S"
              />
            </div>
            <div className="relative flex-1">
              <input
                type="number"
                min="0"
                max="100"
                value={lValue}
                onChange={(e) => handleHslChange("l", e.target.value)}
                className="w-full px-1.5 py-1 border border-gray-400 text-xs bg-white"
                placeholder="L"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => onCopy(rgbToHsl(r, g, b), "hsl-full")}
            className="p-1 hover:bg-gray-100 rounded">
            {copiedField === "hsl-full" ? (
              <Check className="w-3 h-3 text-green-600" />
            ) : (
              <Copy className="w-3 h-3 text-gray-600" />
            )}
          </button>
        </div>

        {/* HEX Input */}
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium w-8">HEX:</span>
          <div className="relative flex-1">
            <input
              type="text"
              value={hexValue}
              onChange={(e) => handleHexChange(e.target.value)}
              className="w-full px-1.5 py-1 border border-gray-400 text-xs bg-white"
              placeholder="#000000"
            />
          </div>
          <button
            type="button"
            onClick={() => onCopy(hexValue, "hex")}
            className="p-1 hover:bg-gray-100 rounded">
            {copiedField === "hex" ? (
              <Check className="w-3 h-3 text-green-600" />
            ) : (
              <Copy className="w-3 h-3 text-gray-600" />
            )}
          </button>
        </div>

        {/* New and Current Color Buttons */}
        <div className="flex items-center w-full">
          <button
            type="button"
            onClick={onAddToHistory}
            className="w-full h-10 cursor-pointer flex items-center justify-center"
            style={{ backgroundColor: currentColor?.hex || "#000" }}
            title={currentColor?.hex || ""}>
            <span
              className="text-xs"
              style={{
                color: getContrastTextColor(currentColor?.hex || "#000")
              }}>
              new
            </span>
          </button>

          <button
            type="button"
            className="w-full h-10 cursor-default flex items-center justify-center"
            style={{ backgroundColor: firstHistoryColor?.hex || "#333" }}
            title={firstHistoryColor?.hex || ""}>
            <span
              className="text-xs"
              style={{
                color: getContrastTextColor(firstHistoryColor?.hex || "#000")
              }}>
              current
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
