import { useEffect, useState } from "react"

import type { ColorEntry } from "../../popup/types"

interface UseColorHistoryOptions {
  onPickedColor: (color: ColorEntry) => void
}

export const useColorHistory = ({
  onPickedColor
}: UseColorHistoryOptions) => {
  const [colorHistory, setColorHistory] = useState<ColorEntry[]>([])

  useEffect(() => {
    chrome.storage.local.get(["colorHistory", "lastPickedColor"], (result) => {
      if (Array.isArray(result.colorHistory)) setColorHistory(result.colorHistory)
      if (result.lastPickedColor?.hex) {
        onPickedColor(result.lastPickedColor as ColorEntry)
        chrome.storage.local.remove("lastPickedColor")
      }
    })

    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area !== "local") return
      if (changes.colorHistory?.newValue)
        setColorHistory(changes.colorHistory.newValue)
      if (changes.lastPickedColor?.newValue) {
        onPickedColor(changes.lastPickedColor.newValue as ColorEntry)
        chrome.storage.local.remove("lastPickedColor")
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [onPickedColor])

  return {
    colorHistory,
    setColorHistory
  }
}
