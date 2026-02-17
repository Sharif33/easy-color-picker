interface ColorPreviewProps {
  background: string
  foreground: string
  previewMetaColor: string
  fontSize: number
  isBold: boolean
  ratio: number
  largeText: boolean
}

export function ColorPreview({
  background,
  foreground,
  previewMetaColor,
  fontSize,
  isBold,
  ratio,
  largeText
}: ColorPreviewProps) {
  const ratioLabel = ratio.toFixed(2)

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-5"
      style={{ background }}>
      <div
        className="flex items-center justify-between text-xs uppercase tracking-[0.2em]"
        style={{ color: previewMetaColor }}>
        <span>Preview</span>
        <span>{ratioLabel}:1</span>
      </div>
      <p
        className="text-balance font-medium"
        style={{
          color: foreground,
          fontSize: `${fontSize}px`,
          fontWeight: isBold ? 700 : 500
        }}>
        The quick brown fox jumps over the lazy dog.
      </p>
      <p className="text-xs" style={{ color: previewMetaColor }}>
        Large text: {largeText ? "Yes" : "No"}
      </p>
    </div>
  )
}
