import { useEffect, useState } from "react"

import { rgbToHsl } from "../../popup/color-utils"
import type { ColorEntry, HSV } from "../../popup/types"

interface ColorPickerPanelProps {
  hsv: HSV
  currentColor: ColorEntry | null
  gradientRef: React.RefObject<HTMLCanvasElement>
  hueRef: React.RefObject<HTMLCanvasElement>
  onGradientMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void
  onHueMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void
  onCopy: (text: string, field: string) => void
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
  r,
  g,
  b
}: ColorPickerPanelProps) => {
  const [gradientDimensions, setGradientDimensions] = useState({
    width: 200,
    height: 200
  })

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

      <div className="flex flex-col gap-1">
        <input
          type="text"
          value={currentColor?.rgb || ""}
          readOnly
          onClick={() => currentColor && onCopy(currentColor.rgb, "rgb-full")}
          className="flex-1 px-2 py-1 border border-gray-400 font-mono text-xs cursor-pointer bg-white"
        />
        <input
          type="text"
          value={currentColor?.hsl || rgbToHsl(r, g, b)}
          readOnly
          onClick={() =>
            onCopy(currentColor?.hsl || rgbToHsl(r, g, b), "hsl-full")
          }
          className="flex-1 px-2 py-1 border border-gray-400 font-mono text-xs cursor-pointer bg-white"
        />
        <input
          type="text"
          value={currentColor?.hex || ""}
          readOnly
          onClick={() => currentColor && onCopy(currentColor.hex, "hex")}
          className="w-full px-1 py-0.5 border border-gray-400 cursor-pointer bg-white"
        />
      </div>
    </div>
  )
}
