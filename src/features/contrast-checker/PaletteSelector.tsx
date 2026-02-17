import { ChevronDown } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import type { PaletteSource } from "~lib/constants"

interface PaletteSelectorProps {
  value: PaletteSource
  onChange: (value: PaletteSource) => void
  options: Array<{ value: PaletteSource; label: string }>
}

export function PaletteSelector({
  value,
  onChange,
  options
}: PaletteSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((option) => option.value === value)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelect = (option: PaletteSource) => {
    onChange(option)
    setIsOpen(false)
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none ring-2 ring-transparent transition hover:border-slate-400 focus:border-slate-400 focus:ring-slate-300">
        <span>{selectedOption?.label}</span>
        <ChevronDown
          className={`size-4 text-slate-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-max overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-slate-50 ${
                option.value === value
                  ? "bg-slate-50 text-slate-900 font-medium"
                  : "text-slate-700"
              }`}>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
