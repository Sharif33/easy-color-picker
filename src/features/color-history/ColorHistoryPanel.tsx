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
      <div className="text-xs uppercase text-gray-700 font-semibold tracking-wide mb-1 flex items-center justify-between gap-1">
        <span>Color history:</span>
        <button
          onClick={onClear}
          className="text-[11px] font-normal text-red-600 tracking-wide flex items-center bg-white border border-red-300 rounded px-2 py-1 cursor-pointer hover:bg-red-50"
          title="Clear history">
          Clear history
        </button>
      </div>
      <div className="flex items-end gap-1">
        <div className="flex flex-wrap border border-gray-300 bg-white">
          {Array.from({ length: 56 }).map((_, index) => {
            const color = colorHistory[index]
            return (
              <div
                key={index}
                onClick={() => {
                  if (color) onPick(color, index)
                }}
                className={`min-w-[31px] min-h-[20px] border-r border-b border-gray-300 ${color ? "cursor-pointer" : ""}`}
                style={{ backgroundColor: color?.hex || "#f5f5f5" }}
                title={color?.hex || ""}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
