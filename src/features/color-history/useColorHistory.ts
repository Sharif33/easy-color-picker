import { useEffect, useState } from "react"

import type { ColorEntry } from "../../popup/types"

interface UseColorHistoryOptions {
  onPickedColor: (color: ColorEntry, source: "hydrate" | "storage") => void
}

export const useColorHistory = ({
  onPickedColor
}: UseColorHistoryOptions) => {
  const [colorHistory, setColorHistory] = useState<ColorEntry[]>([])
  const [lastPickedColor, setLastPickedColor] = useState<ColorEntry | null>(null)

  useEffect(() => {
    chrome.storage.local.get(["colorHistory", "lastPickedColor"], (result) => {
      if (Array.isArray(result.colorHistory)) setColorHistory(result.colorHistory)
      if (result.lastPickedColor?.hex) {
        const picked = result.lastPickedColor as ColorEntry
        setLastPickedColor(picked)
        onPickedColor(picked, "hydrate")
      }
    })

    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area !== "local") return
      if (changes.colorHistory) {
        const nextHistory = changes.colorHistory.newValue
        setColorHistory(Array.isArray(nextHistory) ? nextHistory : [])
      }
      if (changes.lastPickedColor?.newValue) {
        const picked = changes.lastPickedColor.newValue as ColorEntry
        setLastPickedColor(picked)
        onPickedColor(picked, "storage")
      }
      if (
        changes.lastPickedColor &&
        changes.lastPickedColor.newValue === undefined
      ) {
        setLastPickedColor(null)
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [onPickedColor])

  return {
    colorHistory,
    setColorHistory,
    lastPickedColor
  }
}
