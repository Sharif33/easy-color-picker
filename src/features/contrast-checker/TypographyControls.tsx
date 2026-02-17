interface TypographyControlsProps {
  fontSize: number
  isBold: boolean
  onFontSizeChange: (size: number) => void
  onBoldToggle: () => void
}

export function TypographyControls({
  fontSize,
  isBold,
  onFontSizeChange,
  onBoldToggle
}: TypographyControlsProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.35)]">
      <h2 className="text-lg font-semibold text-slate-900">
        Typography Controls
      </h2>
      <div className="mt-4 flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Font size ({fontSize}px)
          <input
            type="range"
            min={12}
            max={48}
            value={fontSize}
            onChange={(event) => onFontSizeChange(Number(event.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-300"
          />
        </label>
        <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Bold text
          <button
            type="button"
            onClick={onBoldToggle}
            className={`rounded-full px-4 py-1 text-xs font-semibold transition ${
              isBold
                ? "bg-slate-900 text-white"
                : "bg-slate-200 text-slate-700"
            }`}>
            {isBold ? "On" : "Off"}
          </button>
        </label>
      </div>
    </div>
  )
}
