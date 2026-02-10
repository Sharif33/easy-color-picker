import { getContrastTextColor } from "~utils/get-contrast-text-color"

import type { AnalyzedColor } from "./index"

interface AnalyzerPanelProps {
  showSavedWebpageColors: boolean
  analyzedColors: AnalyzedColor[]
  selectedAnalyzedColor: AnalyzedColor | null
  isAnalyzing: boolean
  isSaving: boolean
  savedWebpageColors: Record<string, AnalyzedColor[]>
  showAnalyzeButton?: boolean
  onAnalyze: () => void
  onSelectColor: (color: AnalyzedColor) => void
  onSave: () => void
  onCancel: () => void
  onDeleteDomain: (domain: string) => void
  onPickSaved: (color: AnalyzedColor, key: string) => void
  onCopy: (text: string, field: string) => void
}

export const AnalyzerPanel = ({
  showSavedWebpageColors,
  analyzedColors,
  selectedAnalyzedColor,
  isAnalyzing,
  isSaving,
  savedWebpageColors,
  showAnalyzeButton = true,
  onAnalyze,
  onSelectColor,
  onSave,
  onCancel,
  onDeleteDomain,
  onPickSaved,
  onCopy
}: AnalyzerPanelProps) => {
  return (
    <div className="px-3 flex flex-col gap-3">
      {showAnalyzeButton && (
        <button
          onClick={onAnalyze}
          className="w-full px-3 py-1 bg-white border border-gray-400 rounded text-xs cursor-pointer hover:bg-gray-50"
          disabled={isAnalyzing}>
          {isAnalyzing ? "Analyzing..." : "Analyze Webpage Colors"}
        </button>
      )}

      {analyzedColors.length > 0 && (
        <div className="rounded border border-gray-300 bg-white p-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-600 mb-1">
            CSS Colors on This Page
          </div>
          <div className="grid grid-cols-10 rounded border border-gray-200 bg-gray-50 p-1">
            {analyzedColors.map((color, index) => {
              const isSelected = selectedAnalyzedColor?.hex === color.hex
              return (
                <button
                  key={`${color.hex}-${index}`}
                  type="button"
                  onClick={() => onSelectColor(color)}
                  title={color.hex}
                  className={`h-6 w-full border ${
                    isSelected ? "border-red-500" : "border-gray-200"
                  }`}
                  style={{ backgroundColor: color.hex }}
                />
              )
            })}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              readOnly
              value={selectedAnalyzedColor?.rgb || ""}
              onClick={() =>
                selectedAnalyzedColor?.rgb &&
                onCopy(selectedAnalyzedColor.rgb, "analyzed-rgb")
              }
              className="flex-1 px-2 py-1 border border-gray-300 font-mono text-[11px] bg-gray-50 cursor-pointer hover:bg-gray-100"
              title="Click to copy RGB value"
            />
            <input
              type="text"
              readOnly
              value={selectedAnalyzedColor?.hex || ""}
              onClick={() =>
                selectedAnalyzedColor?.hex &&
                onCopy(selectedAnalyzedColor.hex, "analyzed-hex")
              }
              className="w-24 px-2 py-1 border border-gray-300 font-mono text-[11px] bg-gray-50 cursor-pointer hover:bg-gray-100"
              title="Click to copy HEX value"
            />
          </div>
          {selectedAnalyzedColor?.selectors?.length ? (
            <div className="mt-2 max-h-28 overflow-auto rounded border border-gray-200 bg-gray-50 p-1 flex flex-wrap gap-0.5">
              {selectedAnalyzedColor.selectors.map((selector, idx) => (
                <div
                  key={`${selector}-${idx}`}
                  title={selector}
                  className="rounded border bg-white p-0.5 text-[9px] font-mono text-gray-700 w-fit flex items-center justify-center leading-none">
                  {selector}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-[11px] text-gray-500">
              No elements recorded for this color.
            </div>
          )}
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="px-3 py-1 text-[11px] rounded border border-gray-400 bg-white hover:bg-gray-50 disabled:opacity-60">
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1 text-[11px] rounded border border-gray-400 bg-white hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {showSavedWebpageColors && Object.keys(savedWebpageColors).length > 0 && (
        <div className="rounded border border-gray-300 bg-white p-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-600 mb-1">
            Saved Webpage Colors
          </div>
          <div className="space-y-2 max-h-40 overflow-auto">
            {Object.entries(savedWebpageColors).map(([domain, colors]) => (
              <div
                key={domain}
                className="rounded border border-gray-200 bg-gray-50 p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] font-semibold text-gray-700 truncate">
                    {domain}
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteDomain(domain)}
                    className="px-2 py-0.5 text-[10px] rounded border border-red-300 text-red-600 bg-white hover:bg-red-50">
                    Delete
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-4">
                  {colors.map((color, idx) => (
                    <button
                      key={`${domain}-${color.hex}-${idx}`}
                      type="button"
                      onClick={() => onPickSaved(color, `${domain}-${idx}`)}
                      title={color.hex}
                      className="h-10 border-gray-300 border-[0.5px] flex items-end justify-center"
                      style={{
                        backgroundColor: color.hex,
                        color: getContrastTextColor(color.hex) || "#000"
                      }}>
                      <span className="text-[9px] font-mono font-medium w-full text-center">
                        {color.hex}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
