import { useCallback, useEffect, useState } from "react"

import "~style.css"

import {
  AlertTriangle,
  BrushCleaning,
  ChevronDown,
  ChevronRight,
  Disc,
  Pipette
} from "lucide-react"

import { ColorHistoryPanel } from "./features/color-history/ColorHistoryPanel"
import { useColorHistory } from "./features/color-history/useColorHistory"
import { ColorPickerPanel } from "./features/color-picker/ColorPickerPanel"
import { useColorPicker } from "./features/color-picker/useColorPicker"
import { pickOutsideBrowserColor } from "./features/pick-outside-browser-color"
import { startPickPageColor } from "./features/pick-page-color"
import { AnalyzerPanel } from "./features/webpage-color-analyzer/AnalyzerPanel"
import { useWebpageAnalyzer } from "./features/webpage-color-analyzer/useWebpageAnalyzer"
import { colorToHsv, getColorFromHsv, hsvToRgb } from "./popup/color-utils"
import type { ColorEntry } from "./popup/types"
import { isRestrictedUrl } from "./utils/restricted-urls"

function IndexPopup() {
  const [currentColor, setCurrentColor] = useState<ColorEntry | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [outsidePickActive, setOutsidePickActive] = useState(false)
  const [pageRestricted, setPageRestricted] = useState(false)
  const [expandedFeatures, setExpandedFeatures] = useState<string | null>(null)
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

  const FEATURES = [
    {
      label: "Pick Active Page Color",
      icon: Pipette,
      onClick: activatePicker,
      disabled: pageRestricted
    },
    {
      label: "Pick Outside Browser Color",
      icon: Disc,
      onClick: activateOutsidePicker,
      disabled: false
    },
    {
      label: "Analyze Webpage Colors",
      icon: BrushCleaning,
      onClick: analyzer.analyze,
      disabled: analyzer.isAnalyzing || pageRestricted
    },
    {
      label: "Color Picker",
      icon: expandedFeatures === "color-picker" ? ChevronDown : ChevronRight,
      onClick: () => {
        setExpandedFeatures(
          expandedFeatures === "color-picker" ? null : "color-picker"
        )
      },
      disabled: false
    },
    {
      label: "Picked Color History",
      icon: expandedFeatures === "color-history" ? ChevronDown : ChevronRight,
      onClick: () => {
        setExpandedFeatures(
          expandedFeatures === "color-history" ? null : "color-history"
        )
      },
      disabled: false
    },
    {
      label: "Saved Webpage Colors",
      icon:
        expandedFeatures === "saved-webpage-colors"
          ? ChevronDown
          : ChevronRight,
      onClick: () => {
        setExpandedFeatures(
          expandedFeatures === "saved-webpage-colors"
            ? null
            : "saved-webpage-colors"
        )
      },
      disabled: Object.keys(analyzer.savedWebpageColors).length === 0
    }
  ]

  const renderColorHistory = () => {
    return (
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
    )
  }

  if (outsidePickActive) {
    return (
      <div className="w-[220px] bg-gray-200 px-2 py-1 font-sans text-sm">
        <div className="text-sm font-semibold">Pick colors from anywhere</div>
      </div>
    )
  }

  return (
    <div className="w-[280px] bg-gray-200 font-sans py-3">
      <div className="flex flex-col gap-4">
        <div className="flex-1 flex flex-col gap-3">
          {/* New / Current Color */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1 w-full">
              {FEATURES.map((feature) => (
                <button
                  key={feature.label}
                  type="button"
                  onClick={feature.onClick}
                  disabled={feature.disabled}
                  className="w-full px-3 py-1 text-sm cursor-pointer hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 flex items-center gap-1">
                  <span className="inline-flex items-center gap-1.5">
                    <feature.icon className="size-3" />
                    {feature.label}
                  </span>
                  {feature.disabled && <AlertTriangle className="size-3" />}
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* LEFT: Color Picker */}

        <div
          className={`flex flex-col items-center gap-2 px-3 ${expandedFeatures === "color-picker" ? "block" : "hidden"}`}>
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
          <div className="flex items-center w-full">
            <button
              type="button"
              onClick={handleAddToHistory}
              className="w-full h-10 cursor-pointer flex items-center justify-center"
              style={{ backgroundColor: currentColor?.hex || "#000" }}
              title={currentColor?.hex || ""}>
              <span className="text-xs text-gray-500">new</span>
            </button>

            <button
              type="button"
              className="w-full h-10 cursor-default flex items-center justify-center"
              style={{ backgroundColor: colorHistory[0]?.hex || "#333" }}
              title={colorHistory[0]?.hex || ""}>
              <span className="text-xs text-gray-500">current</span>
            </button>
          </div>
          {renderColorHistory()}
        </div>
        {/* RIGHT: Color Info & History */}
      </div>
      {/* Color History */}
      {expandedFeatures === "color-history" && renderColorHistory()}
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
