import { useState } from "react"

import "~style.css"

import ColorHubLogo from "~components/color hub/logo"
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
  const [fontSize, setFontSize] = useState(24)
  const [isBold, setIsBold] = useState(false)
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
      style={{ fontFamily: "'Inter', sans-serif" }}>
      <nav className="sticky top-0 z-10 flex items-center justify-between gap-4 h-20">
        <div className="container mx-auto">
          <ColorHubLogo size={32} className="text-2xl font-medium" />
        </div>
      </nav>

      <div className="container mx-auto flex flex-col gap-6 mt-2">
        <h2 className="text-sm font-semibold tracking-[0.2em] uppercase text-slate-900">
          Color Contrast Checker
        </h2>
        <div className="flex gap-6">
          <div className="flex flex-col gap-6 bg-white p-6 w-3/4">
            <div className="flex items-center justify-between gap-3">
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

              <div className="flex pt-20">
                <SwapButton onSwap={handleSwapColors} />
              </div>

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
            <TypographyControls
              fontSize={fontSize}
              isBold={isBold}
              largeText={largeText}
              onFontSizeChange={setFontSize}
              onBoldToggle={() => setIsBold((prev) => !prev)}
            />
          </div>

          <div className="flex flex-col gap-6 w-full">
            <WCAGCompliancePanel
              ratio={ratio}
              wcag={wcag}
              largeText={largeText}
            />
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
        </div>
      </div>
    </div>
  )
}

export default ContrastCheckerPage
