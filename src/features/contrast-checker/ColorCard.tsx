import { Pipette } from "lucide-react"

import { isValidPartialHex } from "~utils/color-utils"

interface ColorCardProps {
  label: "Foreground" | "Background"
  color: string
  textColor: string
  inputValue: string
  onColorChange: (color: string) => void
  onInputChange: (value: string) => void
  swatches: string[]
}

export function ColorCard({
  label,
  color,
  textColor,
  inputValue,
  onColorChange,
  onInputChange,
  swatches
}: ColorCardProps) {
  const handleInputChange = (value: string) => {
    const next = value.startsWith("#") ? value : `#${value}`
    if (isValidPartialHex(next)) {
      onInputChange(next.toLowerCase())
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="rounded-3xl border border-slate-400/70 p-5"
        style={{
          background: color,
          color: textColor
        }}>
        <div className="mb-16 flex justify-end">
          <label className="relative inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-transparent">
            <Pipette className="size-5" />
            <input
              type="color"
              value={color}
              onChange={(event) => onColorChange(event.target.value)}
              aria-label={`${label} color`}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </div>
        <p className="text-base font-medium">{label}</p>
        <p className="mt-2 text-lg font-semibold leading-none tracking-tight">
          {color}
        </p>
      </div>
      <input
        value={inputValue}
        onChange={(event) => handleInputChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-2 ring-transparent transition focus:border-slate-400 focus:ring-slate-300"
      />
      <div className="flex flex-wrap gap-2">
        {swatches.map((swatch) => (
          <button
            key={`${label.toLowerCase()}-${swatch}`}
            type="button"
            onClick={() => onInputChange(swatch)}
            aria-label={`Set ${label.toLowerCase()} ${swatch}`}
            className={`flex-none rounded border size-6 ${
              color === swatch ? "border-blue-600" : "border-slate-400"
            }`}
            style={{ backgroundColor: swatch }}
          />
        ))}
      </div>
      {swatches.length === 0 && (
        <p className="text-xs text-slate-500">
          No colors available for this source.
        </p>
      )}
    </div>
  )
}
