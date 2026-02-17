import { useEffect, useState } from "react"

import type { PaletteSource } from "~lib/constants"

import {
  getHistoryHexes,
  getWebpageHexes,
  uniqueNormalizedHexes
} from "../utils/color-utils"

export const usePaletteColors = (paletteSource: PaletteSource) => {
  const [historyHexes, setHistoryHexes] = useState<string[]>([])
  const [webpageHexes, setWebpageHexes] = useState<string[]>([])

  useEffect(() => {
    chrome.storage.local.get(["colorHistory", "WEBPAGES_COLORS"], (result) => {
      setHistoryHexes(getHistoryHexes(result.colorHistory))
      setWebpageHexes(getWebpageHexes(result.WEBPAGES_COLORS))
    })

    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area !== "local") return
      if (changes.colorHistory) {
        setHistoryHexes(getHistoryHexes(changes.colorHistory.newValue))
      }
      if (changes.WEBPAGES_COLORS) {
        setWebpageHexes(getWebpageHexes(changes.WEBPAGES_COLORS.newValue))
      }
    }

    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  const swatches =
    paletteSource === "color-history"
      ? historyHexes
      : paletteSource === "webpage-colors"
        ? webpageHexes
        : uniqueNormalizedHexes([...historyHexes, ...webpageHexes])

  return swatches
}
