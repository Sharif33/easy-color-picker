import { useState } from "react"

import "~style.css"

import { Info } from "lucide-react"

import { ColorCard } from "~features/contrast-checker/ColorCard"
import { ColorPreview } from "~features/contrast-checker/ColorPreview"
import { PaletteSelector } from "~features/contrast-checker/PaletteSelector"
import { SwapButton } from "~features/contrast-checker/SwapButton"
import { TypographyControls } from "~features/contrast-checker/TypographyControls"
import { WCAGCompliancePanel } from "~features/contrast-checker/WCAGCompliancePanel"
import { useContrastInfo } from "~hooks/use-contrast-info"
import { usePaletteColors } from "~hooks/use-palette-colors"
import { PALETTE_OPTIONS, type PaletteSource } from "~lib/constants"
import { DEFAULT_BACKGROUND, DEFAULT_FOREGROUND } from "~utils/color-utils"

function ContrastCheckerPage() {
  const [foregroundInput, setForegroundInput] = useState(DEFAULT_FOREGROUND)
  const [backgroundInput, setBackgroundInput] = useState(DEFAULT_BACKGROUND)
  const [fontSize, setFontSize] = useState(22)
  const [isBold, setIsBold] = useState(true)
  const [paletteSource, setPaletteSource] =
    useState<PaletteSource>("color-history")

  const swatches = usePaletteColors(paletteSource)
  const {
    foreground,
    background,
    ratio,
    foregroundTextColor,
    backgroundTextColor,
    previewMetaColor,
    wcag,
    largeText
  } = useContrastInfo(foregroundInput, backgroundInput, fontSize, isBold)

  const ratioLabel = ratio.toFixed(2)

  const handleSwapColors = () => {
    setForegroundInput(background)
    setBackgroundInput(foreground)
  }

  return (
    <div
      className="min-h-screen w-full bg-[#f3f6fb] text-slate-900"
      style={{ fontFamily: "'Space Grotesk', 'Inter', system-ui" }}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.05),_transparent_55%),radial-gradient(circle_at_85%_20%,_rgba(59,130,246,0.08),_transparent_45%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.3em] text-slate-500">
              WCAG 2.2 Contrast
            </span>
            <h1 className="text-3xl font-semibold text-slate-900">
              Color Contrast Checker
            </h1>
            <p className="text-sm text-slate-600">
              Validate text contrast for AA/AAA compliance and preview the
              pairing.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600 shadow-sm">
            <Info className="size-4 text-slate-500" />
            Ratio:{" "}
            <span className="font-semibold text-slate-900">{ratioLabel}:1</span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Colors</h2>
              <PaletteSelector
                value={paletteSource}
                onChange={setPaletteSource}
                options={PALETTE_OPTIONS}
              />
            </div>

            <div className="grid items-start gap-6 lg:grid-cols-[1fr_auto_1fr]">
              <ColorCard
                label="Foreground"
                color={foreground}
                textColor={foregroundTextColor}
                inputValue={foregroundInput}
                onColorChange={setForegroundInput}
                onInputChange={setForegroundInput}
                swatches={swatches}
              />

              <SwapButton onSwap={handleSwapColors} />

              <ColorCard
                label="Background"
                color={background}
                textColor={backgroundTextColor}
                inputValue={backgroundInput}
                onColorChange={setBackgroundInput}
                onInputChange={setBackgroundInput}
                swatches={swatches}
              />
            </div>

            <ColorPreview
              background={background}
              foreground={foreground}
              previewMetaColor={previewMetaColor}
              fontSize={fontSize}
              isBold={isBold}
              ratio={ratio}
              largeText={largeText}
            />
          </div>

          <div className="flex flex-col gap-6">
            <TypographyControls
              fontSize={fontSize}
              isBold={isBold}
              onFontSizeChange={setFontSize}
              onBoldToggle={() => setIsBold((prev) => !prev)}
            />

            <WCAGCompliancePanel ratio={ratio} wcag={wcag} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ContrastCheckerPage
