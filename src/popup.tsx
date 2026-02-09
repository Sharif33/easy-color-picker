import { useCallback, useEffect, useState } from "react"

import "~style.css"

import logo from "data-base64:~assets/color-hub-logo.png"
import {
  AlertTriangle,
  BrushCleaning,
  ChevronDown,
  ChevronRight,
  Heart,
  History,
  NotepadText,
  Palette,
  Pipette
} from "lucide-react"

import { ColorHistoryPanel } from "./features/color-history/ColorHistoryPanel"
import { useColorHistory } from "./features/color-history/useColorHistory"
import { ColorPickerPanel } from "./features/color-picker/ColorPickerPanel"
import { useColorPicker } from "./features/color-picker/useColorPicker"
import { pickOutsideBrowserColor } from "./features/pick-outside-browser-color"
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
    analyzer.cancel()
    setExpandedFeatures("saved-webpage-colors")
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
      label: "Pick Color",
      icon: Pipette,
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
      label: "Picked Color History",
      icon: History,
      onClick: () => {
        setExpandedFeatures(
          expandedFeatures === "color-history" ? null : "color-history"
        )
      },
      disabled: false,
      secondaryIcon:
        expandedFeatures === "color-history" ? ChevronDown : ChevronRight
    },
    {
      label: "Saved Webpage Colors",
      icon: NotepadText,
      onClick: () => {
        setExpandedFeatures(
          expandedFeatures === "saved-webpage-colors"
            ? null
            : "saved-webpage-colors"
        )
      },
      disabled: Object.keys(analyzer.savedWebpageColors).length === 0,
      secondaryIcon:
        expandedFeatures === "saved-webpage-colors" ? ChevronDown : ChevronRight
    },
    {
      label: "Color Picker Panel",
      icon: Palette,
      secondaryIcon:
        expandedFeatures === "color-picker" ? ChevronDown : ChevronRight,
      onClick: () => {
        setExpandedFeatures(
          expandedFeatures === "color-picker" ? null : "color-picker"
        )
      },
      disabled: false
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
      <div className="w-[220px] bg-gray-100 px-2 py-1 font-sans text-sm">
        <div className="text-sm font-semibold">Pick colors from anywhere</div>
      </div>
    )
  }

  return (
    <div className="w-[300px] bg-gray-100 font-sans">
      <div className="bg-gray-900 flex items-center gap-1 p-3">
        <img src={logo} alt="Color Hub" className="size-6" />
        <h1 className="text-white/90 text-lg font-mono tracking-wider">
          color_hub
        </h1>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex-1 flex flex-col gap-3">
          {/* New / Current Color */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col w-full">
              {FEATURES.map(
                ({
                  label,
                  icon: Icon,
                  onClick,
                  disabled,
                  secondaryIcon: SecondaryIcon
                }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={onClick}
                    disabled={disabled}
                    className="w-full px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-between gap-1 border-b border-dashed border-gray-300">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon className="size-3" />
                      {label}
                    </span>
                    {disabled && <AlertTriangle className="size-3" />}
                    {!disabled && SecondaryIcon && (
                      <SecondaryIcon className="size-3" />
                    )}
                  </button>
                )
              )}
            </div>
          </div>
        </div>

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
            onColorChange={colorPicker.setHsv}
            onAddToHistory={handleAddToHistory}
            firstHistoryColor={colorHistory[0] || null}
            copiedField={copiedField}
            r={r}
            g={g}
            b={b}
          />
          {renderColorHistory()}
        </div>

        {expandedFeatures === "color-history" && (
          <div className="px-3">{renderColorHistory()}</div>
        )}

        <AnalyzerPanel
          showSavedWebpageColors={expandedFeatures === "saved-webpage-colors"}
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
      {/* footer */}
      <div className="p-3 text-xs text-gray-500 flex items-center justify-center gap-1">
        <Heart className="size-3" fill="currentColor" /> by{" "}
        <a
          href="https://github.com/Sharif33"
          className="text-sky-500 hover:underline underline-offset-2"
          target="_blank"
          rel="noopener noreferrer">
          Sharif Rashed
        </a>
      </div>
    </div>
  )
}

export default IndexPopup
