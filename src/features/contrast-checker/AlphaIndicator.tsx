interface AlphaIndicatorProps {
  fgAlpha: number
  bgAlpha: number
  effectiveForeground: string
  effectiveBackground: string
}

export function AlphaIndicator({
  fgAlpha,
  bgAlpha,
  effectiveForeground,
  effectiveBackground
}: AlphaIndicatorProps) {
  const hasAlpha = fgAlpha < 1 || bgAlpha < 1
  if (!hasAlpha) return null

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
      <p className="text-xs font-medium text-blue-700">
        Alpha blending active
      </p>
      <div className="flex items-center gap-4 text-[11px] text-blue-600">
        {fgAlpha < 1 && (
          <span className="flex items-center gap-1.5">
            <span
              className="block size-3 rounded-sm border border-blue-300"
              style={{ backgroundColor: effectiveForeground }}
            />
            FG {Math.round(fgAlpha * 100)}% → {effectiveForeground}
          </span>
        )}
        {bgAlpha < 1 && (
          <span className="flex items-center gap-1.5">
            <span
              className="block size-3 rounded-sm border border-blue-300"
              style={{ backgroundColor: effectiveBackground }}
            />
            BG {Math.round(bgAlpha * 100)}% → {effectiveBackground}
          </span>
        )}
      </div>
      <p className="text-[10px] text-blue-400">
        Contrast is computed on the composited opaque colors.
      </p>
    </div>
  )
}
