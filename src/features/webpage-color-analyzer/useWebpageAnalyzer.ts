import { useEffect, useState } from "react"

import type { AnalyzedColor } from "./index"
import {
  analyzeWebpageColors,
  clearWebpageHighlights,
  highlightWebpageColor
} from "./index"

interface UseWebpageAnalyzerOptions {
  onSelectColor: (color: AnalyzedColor) => void
}

export const useWebpageAnalyzer = ({
  onSelectColor
}: UseWebpageAnalyzerOptions) => {
  const [analyzedColors, setAnalyzedColors] = useState<AnalyzedColor[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [selectedAnalyzedColor, setSelectedAnalyzedColor] =
    useState<AnalyzedColor | null>(null)
  const [analyzedDomain, setAnalyzedDomain] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [savedWebpageColors, setSavedWebpageColors] = useState<
    Record<string, AnalyzedColor[]>
  >({})

  useEffect(() => {
    chrome.storage.local.get(["WEBPAGES_COLORS"], (result) => {
      setSavedWebpageColors(result.WEBPAGES_COLORS || {})
    })
  }, [])

  useEffect(() => {
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area !== "local") return
      if (changes.WEBPAGES_COLORS?.newValue) {
        setSavedWebpageColors(changes.WEBPAGES_COLORS.newValue || {})
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  const analyze = async () => {
    setIsAnalyzing(true)
    const domain = await new Promise<string | null>((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs?.[0]
        if (!tab?.url) {
          resolve(null)
          return
        }
        try {
          const url = new URL(tab.url)
          resolve(url.hostname)
        } catch {
          resolve(null)
        }
      })
    })
    const colors = await analyzeWebpageColors()
    setAnalyzedColors(colors)
    setSelectedAnalyzedColor(colors[0] ?? null)
    setAnalyzedDomain(domain)
    setIsAnalyzing(false)
  }

  const selectColor = async (color: AnalyzedColor) => {
    setSelectedAnalyzedColor(color)
    void highlightWebpageColor(color)
    onSelectColor(color)
  }

  const save = async () => {
    if (!analyzedDomain || analyzedColors.length === 0) return
    setIsSaving(true)
    const existing = await chrome.storage.local.get(["WEBPAGES_COLORS"])
    const next = {
      ...(existing.WEBPAGES_COLORS || {}),
      [analyzedDomain]: analyzedColors
    }
    await chrome.storage.local.set({ WEBPAGES_COLORS: next })
    setIsSaving(false)
    void clearWebpageHighlights()
  }

  const cancel = () => {
    setAnalyzedColors([])
    setSelectedAnalyzedColor(null)
    setAnalyzedDomain(null)
    void clearWebpageHighlights()
  }

  const deleteDomain = async (domain: string) => {
    const confirmed = confirm(
      "Are you sure you want to delete the saved colors for this domain?"
    )
    if (!confirmed) return
    const existing = await chrome.storage.local.get(["WEBPAGES_COLORS"])
    const next = { ...(existing.WEBPAGES_COLORS || {}) }
    delete next[domain]
    await chrome.storage.local.set({ WEBPAGES_COLORS: next })
  }

  return {
    analyzedColors,
    selectedAnalyzedColor,
    isAnalyzing,
    analyzedDomain,
    isSaving,
    savedWebpageColors,
    analyze,
    selectColor,
    save,
    cancel,
    deleteDomain
  }
}
