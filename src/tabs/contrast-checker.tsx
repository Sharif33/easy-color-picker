import { AlertCircle, Check, Save } from "lucide-react"
import { useCallback, useRef, useState } from "react"

import "~style.css"

import ColorHubLogo from "~components/color hub/logo"
import { AlphaIndicator } from "~features/contrast-checker/AlphaIndicator"
import { ColorCard } from "~features/contrast-checker/ColorCard"
import { ColorPreview } from "~features/contrast-checker/ColorPreview"
import { ColorSuggestions } from "~features/contrast-checker/ColorSuggestions"
import { PaletteSelector } from "~features/contrast-checker/PaletteSelector"
import { SavedPairsGrid } from "~features/contrast-checker/SavedPairsGrid"
import { SwapButton } from "~features/contrast-checker/SwapButton"
import { TypographyControls } from "~features/contrast-checker/TypographyControls"
import { WCAGCompliancePanel } from "~features/contrast-checker/WCAGCompliancePanel"
import { useContrastInfo } from "~hooks/use-contrast-info"
import { usePaletteColors } from "~hooks/use-palette-colors"
import { useSavedPairs } from "~hooks/use-saved-pairs"
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
  const { pairs, savePair, removePair, isDuplicate } = useSavedPairs()
  const {
    foreground,
    background,
    fgAlpha,
    bgAlpha,
    effectiveForeground,
    effectiveBackground,
    ratio,
    foregroundTextColor,
    backgroundTextColor,
    previewMetaColor,
    wcag,
    largeText,
    suggestions
  } = useContrastInfo(foregroundInput, backgroundInput, fontSize, isBold)

  const handleSwapColors = () => {
    setForegroundInput(backgroundInput)
    setBackgroundInput(foregroundInput)
  }

  const handleApplySuggestion = (hex: string, target: "foreground" | "background") => {
    if (target === "foreground") {
      setForegroundInput(hex)
    } else {
      setBackgroundInput(hex)
    }
  }

  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saved" | "duplicate"
  >("idle")
  const statusTimer = useRef<ReturnType<typeof setTimeout>>()

  const handleSavePair = useCallback(() => {
    clearTimeout(statusTimer.current)
    if (isDuplicate(foreground, background)) {
      setSaveStatus("duplicate")
      statusTimer.current = setTimeout(() => setSaveStatus("idle"), 2000)
      return
    }
    savePair(foreground, background)
    setSaveStatus("saved")
    statusTimer.current = setTimeout(() => setSaveStatus("idle"), 1500)
  }, [foreground, background, savePair, isDuplicate])

  const handleSelectPair = (fg: string, bg: string) => {
    setForegroundInput(fg)
    setBackgroundInput(bg)
  }

  const isSavedPairsSource = paletteSource === "saved-pairs"

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
          <div className="flex flex-col gap-4 bg-white p-6 w-2/3">
            <div className="flex items-center justify-between gap-3">
              <PaletteSelector
                value={paletteSource}
                onChange={setPaletteSource}
                options={PALETTE_OPTIONS}
              />
              <button
                type="button"
                onClick={handleSavePair}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition active:scale-95 ${
                  saveStatus === "saved"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : saveStatus === "duplicate"
                      ? "border-amber-300 bg-amber-50 text-amber-700"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                }`}>
                {saveStatus === "saved" ? (
                  <Check className="size-3.5" strokeWidth={2.5} />
                ) : saveStatus === "duplicate" ? (
                  <AlertCircle className="size-3.5" />
                ) : (
                  <Save className="size-3.5" />
                )}
                {saveStatus === "saved"
                  ? "Saved!"
                  : saveStatus === "duplicate"
                    ? "Already saved"
                    : "Save Pair"}
              </button>
            </div>

            <div className="grid items-start gap-6 lg:grid-cols-[1fr_auto_1fr]">
              <ColorCard
                label="Foreground"
                color={foreground}
                alpha={fgAlpha}
                textColor={foregroundTextColor}
                inputValue={foregroundInput}
                onColorChange={setForegroundInput}
                onInputChange={setForegroundInput}
                swatches={swatches}
                hideSwatches={isSavedPairsSource}
              />

              <div className="flex pt-20">
                <SwapButton onSwap={handleSwapColors} />
              </div>

              <ColorCard
                label="Background"
                color={background}
                alpha={bgAlpha}
                textColor={backgroundTextColor}
                inputValue={backgroundInput}
                onColorChange={setBackgroundInput}
                onInputChange={setBackgroundInput}
                swatches={swatches}
                hideSwatches={isSavedPairsSource}
              />
            </div>

            {isSavedPairsSource && (
              <SavedPairsGrid
                pairs={pairs}
                onSelect={handleSelectPair}
                onRemove={removePair}
              />
            )}

            {(fgAlpha < 1 || bgAlpha < 1) && (
              <AlphaIndicator
                fgAlpha={fgAlpha}
                bgAlpha={bgAlpha}
                effectiveForeground={effectiveForeground}
                effectiveBackground={effectiveBackground}
              />
            )}

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
              background={effectiveBackground}
              foreground={effectiveForeground}
              previewMetaColor={previewMetaColor}
              fontSize={fontSize}
              isBold={isBold}
              ratio={ratio}
              largeText={largeText}
            />
            <ColorSuggestions
              suggestions={suggestions}
              foreground={effectiveForeground}
              background={effectiveBackground}
              ratio={ratio}
              onApply={handleApplySuggestion}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ContrastCheckerPage
