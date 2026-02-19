import { Trash2 } from "lucide-react"

import type { SavedPair } from "~hooks/use-saved-pairs"
import { getContrastRatio } from "~utils/color-utils"

interface SavedPairsGridProps {
  pairs: SavedPair[]
  onSelect: (foreground: string, background: string) => void
  onRemove: (id: string) => void
}

export function SavedPairsGrid({
  pairs,
  onSelect,
  onRemove
}: SavedPairsGridProps) {
  if (pairs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-8 px-4">
        <p className="text-sm text-slate-500">No saved pairs yet</p>
        <p className="text-xs text-slate-400">
          Click "Save Pair" to store the current foreground & background.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
        Saved Pairs
      </p>
      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
        {pairs.map((pair) => {
          const ratio = getContrastRatio(pair.foreground, pair.background)
          return (
            <div
              key={pair.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(pair.foreground, pair.background)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  onSelect(pair.foreground, pair.background)
                }
              }}
              className="group relative flex items-center gap-3 rounded-lg border border-slate-200 p-2.5 text-left transition hover:border-slate-400 hover:bg-slate-50 cursor-pointer">
              <div className="flex shrink-0 overflow-hidden rounded">
                <span
                  className="block w-5 h-8"
                  style={{ backgroundColor: pair.foreground }}
                />
                <span
                  className="block w-5 h-8"
                  style={{ backgroundColor: pair.background }}
                />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <span className="text-[11px] font-medium text-slate-700 truncate">
                  {pair.foreground}
                </span>
                <span className="text-[11px] text-slate-400 truncate">
                  {pair.background}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 shrink-0">
                {ratio.toFixed(1)}:1
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(pair.id)
                }}
                aria-label={`Remove pair ${pair.foreground} / ${pair.background}`}
                className="absolute top-1 right-1 hidden group-hover:flex items-center justify-center size-5 rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition cursor-pointer">
                <Trash2 className="size-3" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
