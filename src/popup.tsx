import { useCallback, useEffect, useState } from "react"

import "~style.css"

import { ColorHistoryPanel } from "./features/color-history/ColorHistoryPanel"
import { useColorHistory } from "./features/color-history/useColorHistory"
import { AlertTriangle } from "lucide-react"
import { isRestrictedUrl } from "./utils/restricted-urls"
import { ColorPickerPanel } from "./features/color-picker/ColorPickerPanel"
import { useColorPicker } from "./features/color-picker/useColorPicker"
import { pickOutsideBrowserColor } from "./features/pick-outside-browser-color"
import { startPickPageColor } from "./features/pick-page-color"
import { AnalyzerPanel } from "./features/webpage-color-analyzer/AnalyzerPanel"
import { useWebpageAnalyzer } from "./features/webpage-color-analyzer/useWebpageAnalyzer"
import { colorToHsv, getColorFromHsv, hsvToRgb } from "./popup/color-utils"
import type { ColorEntry } from "./popup/types"

function IndexPopup() {
  const [currentColor, setCurrentColor] = useState<ColorEntry | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [outsidePickActive, setOutsidePickActive] = useState(false)
  const [pageRestricted, setPageRestricted] = useState(false)
  const colorPicker = useColorPicker({ h: 220, s: 66, v: 16 })

  const getCurrentColorFromHsv = useCallback((): ColorEntry => {
    return getColorFromHsv(colorPicker.hsv)
  }, [colorPicker.hsv])

  useEffect(() => {
    setCurrentColor(getCurrentColorFromHsv())
  }, [colorPicker.hsv, getCurrentColorFromHsv])

  const { colorHistory, setColorHistory } = useColorHistory({
    onPickedColor: (picked) => {
      const nextHsv = colorToHsv(picked)
      if (nextHsv) colorPicker.setHsv(nextHsv)
      setCurrentColor(picked)
      void copyToClipboard(picked.hex, "hex")
    }
  })

  useEffect(() => {
    const port = chrome.runtime.connect({ name: "popup" })
    return () => {
      port.disconnect()
    }
  }, [])

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs?.[0]
      const url = tab?.url || tab?.pendingUrl || ""
      setPageRestricted(isRestrictedUrl(url))
    })
  }, [])

  useEffect(() => {
    const handleUnload = () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs?.[0]
        if (!tab?.id) return
        chrome.runtime.sendMessage({
          type: "CLEAR_WEBPAGE_HIGHLIGHTS",
          tabId: tab.id
        })
      })
    }
    window.addEventListener("beforeunload", handleUnload)
    window.addEventListener("unload", handleUnload)
    return () => {
      window.removeEventListener("beforeunload", handleUnload)
      window.removeEventListener("unload", handleUnload)
      handleUnload()
    }
  }, [])

  const analyzer = useWebpageAnalyzer({
    onSelectColor: (color) => {
      const nextHsv = colorToHsv({
        hex: color.hex,
        rgb: color.rgb,
        hsl: undefined,
        timestamp: Date.now()
      })
      if (nextHsv) colorPicker.setHsv(nextHsv)
      setCurrentColor({
        hex: color.hex,
        rgb: color.rgb,
        hsl: undefined,
        timestamp: Date.now()
      })
      copyToClipboard(color.hex, `analyzed-${color.hex}`)
    }
  })

  const activatePicker = () => {
    if (pageRestricted) return
    startPickPageColor(() => window.close())
  }

  const activateOutsidePicker = async () => {
    setOutsidePickActive(true)
    await pickOutsideBrowserColor()
    setOutsidePickActive(false)
    window.close()
  }

  const handleAnalyzerSave = async () => {
    await analyzer.save()
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs?.[0]
      if (!tab?.id) return
      chrome.runtime.sendMessage({
        type: "CLEAR_WEBPAGE_HIGHLIGHTS",
        tabId: tab.id
      })
    })
  }

  const handleAnalyzerCancel = () => {
    analyzer.cancel()
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs?.[0]
      if (!tab?.id) return
      chrome.runtime.sendMessage({
        type: "CLEAR_WEBPAGE_HIGHLIGHTS",
        tabId: tab.id
      })
    })
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 1500)
    } catch (error) {
      console.warn("Clipboard write failed:", error)
    }
  }

  const handleAddToHistory = () => {
    if (!currentColor) return
    const updated = [
      currentColor,
      ...colorHistory.filter((c) => c.hex !== currentColor.hex)
    ].slice(0, 35)
    setColorHistory(updated)
    chrome.storage.local.set({ colorHistory: updated })
  }

  const clearHistory = () => {
    const confirmed = confirm(
      "Are you sure you want to clear the color history?"
    )
    if (!confirmed) return
    setColorHistory([])
    chrome.storage.local.set({ colorHistory: [] })
  }

  const { r, g, b } = hsvToRgb(
    colorPicker.hsv.h,
    colorPicker.hsv.s,
    colorPicker.hsv.v
  )

  if (outsidePickActive) {
    return (
      <div className="w-[220px] bg-gray-200 px-2 py-1 font-sans text-sm">
        <div className="text-sm font-semibold">Pick colors from anywhere</div>
      </div>
    )
  }

  return (
    <div className="w-[460px] bg-gray-200 p-3 font-sans text-sm">
      <div className="flex gap-4">
        {/* LEFT: Color Picker */}
        <div className="flex gap-2">
          <ColorPickerPanel
            hsv={colorPicker.hsv}
            currentColor={currentColor}
            gradientRef={colorPicker.gradientRef}
            hueRef={colorPicker.hueRef}
            onGradientMouseDown={(e) => {
              colorPicker.setIsDraggingGradient(true)
              colorPicker.handleGradientInteraction(e)
            }}
            onHueMouseDown={(e) => {
              colorPicker.setIsDraggingHue(true)
              colorPicker.handleHueInteraction(e)
            }}
            onCopy={copyToClipboard}
            r={r}
            g={g}
            b={b}
          />
          {copiedField && <span className="text-green-600 text-xs">✓</span>}
        </div>

        {/* RIGHT: Color Info & History */}
        <div className="flex-1 flex flex-col gap-3">
          {/* New / Current Color */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1 w-full">
              <button
                onClick={activatePicker}
                disabled={pageRestricted}
                className="w-full px-3 py-1 bg-white border border-gray-400 rounded text-xs cursor-pointer hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60">
                <span className="inline-flex items-center gap-1">
                  Pick Page Color
                  {pageRestricted && (
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                  )}
                </span>
              </button>
              <button
                onClick={activateOutsidePicker}
                className="w-full px-3 py-1 bg-white border border-gray-400 rounded text-xs cursor-pointer hover:bg-gray-50">
                Pick Outside Browser
              </button>
              <button
                onClick={analyzer.analyze}
                className="w-full px-3 py-1 bg-white border border-gray-400 rounded text-xs cursor-pointer hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={analyzer.isAnalyzing || pageRestricted}>
                {analyzer.isAnalyzing
                  ? "Analyzing..."
                  : "Analyze Webpage Colors"}
                {pageRestricted && (
                  <span className="ml-1 inline-flex items-center">
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                  </span>
                )}
              </button>
              <button
                onClick={handleAddToHistory}
                className="w-full px-3 py-1 bg-white border border-gray-400 rounded text-xs cursor-pointer hover:bg-gray-50">
                Add to History
              </button>
            </div>
            <div className="flex items-center w-full">
              <div className="text-center w-full">
                <div className="text-xs text-gray-500 mb-0.5">new</div>
                <div
                  className="w-full h-10"
                  style={{ backgroundColor: currentColor?.hex || "#000" }}
                />
              </div>
              <div className="text-center w-full">
                <div className="text-xs text-gray-500 mb-0.5">current</div>
                <div
                  className="w-full h-10"
                  style={{ backgroundColor: colorHistory[0]?.hex || "#333" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Color History */}
      <ColorHistoryPanel
        colorHistory={colorHistory}
        onPick={(color, index) => {
          const nextHsv = colorToHsv(color)
          if (nextHsv) colorPicker.setHsv(nextHsv)
          setCurrentColor(color)
          copyToClipboard(color.hex, `history-${index}`)
        }}
        onClear={clearHistory}
      />
      <AnalyzerPanel
        analyzedColors={analyzer.analyzedColors}
        selectedAnalyzedColor={analyzer.selectedAnalyzedColor}
        isAnalyzing={analyzer.isAnalyzing}
        isSaving={analyzer.isSaving}
        savedWebpageColors={analyzer.savedWebpageColors}
        showAnalyzeButton={false}
        onAnalyze={analyzer.analyze}
        onSelectColor={analyzer.selectColor}
        onSave={handleAnalyzerSave}
        onCancel={handleAnalyzerCancel}
        onDeleteDomain={analyzer.deleteDomain}
        onPickSaved={(color, key) => {
          const nextHsv = colorToHsv({
            hex: color.hex,
            rgb: color.rgb,
            hsl: undefined,
            timestamp: Date.now()
          })
          if (nextHsv) colorPicker.setHsv(nextHsv)
          setCurrentColor({
            hex: color.hex,
            rgb: color.rgb,
            hsl: undefined,
            timestamp: Date.now()
          })
          copyToClipboard(color.hex, `saved-${key}`)
        }}
      />
    </div>
  )
}

export default IndexPopup
