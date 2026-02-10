import { getContrastTextColor } from "~utils/get-contrast-text-color"

import type { ColorEntry } from "../../popup/types"

interface ColorHistoryPanelProps {
  colorHistory: ColorEntry[]
  onPick: (color: ColorEntry, index: number) => void
  onClear: () => void
}

export const ColorHistoryPanel = ({
  colorHistory,
  onPick,
  onClear
}: ColorHistoryPanelProps) => {
  return (
    <div>
      <div className="flex flex-col gap-1.5 bg-white border py-2 border-gray-300 rounded px-2 w-full">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase text-gray-700 font-semibold tracking-wide leading-none">
            Color history
          </span>
          <button
            onClick={onClear}
            className="text-[11px] font-normal text-red-600 tracking-wide flex items-center bg-white border border-red-300 rounded px-2 py-0.5 cursor-pointer hover:bg-red-50"
            title="Clear history">
            Clear
          </button>
        </div>
        <div className="grid grid-cols-5 w-full">
          {colorHistory.map((color, index) => {
            return (
              <div
                key={index}
                onClick={() => {
                  if (color) onPick(color, index)
                }}
                className={`h-12 border-[0.5px] border-gray-300 flex items-end justify-center ${color ? "cursor-pointer" : ""}`}
                style={{ backgroundColor: color?.hex || "#f5f5f5" }}
                title={color?.hex || ""}>
                <span
                  style={{
                    color: color ? getContrastTextColor(color.hex) : "#000"
                  }}
                  className="text-[9px] font-mono font-medium">
                  {color?.hex}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
