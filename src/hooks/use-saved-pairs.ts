import { useCallback, useEffect, useState } from "react"

export interface SavedPair {
  id: string
  foreground: string
  background: string
}

const STORAGE_KEY = "savedContrastPairs"

const parsePairs = (value: unknown): SavedPair[] => {
  if (!Array.isArray(value)) return []
  return value.filter(
    (p): p is SavedPair =>
      typeof p === "object" &&
      p !== null &&
      typeof p.id === "string" &&
      typeof p.foreground === "string" &&
      typeof p.background === "string"
  )
}

export const useSavedPairs = () => {
  const [pairs, setPairs] = useState<SavedPair[]>([])

  useEffect(() => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      setPairs(parsePairs(result[STORAGE_KEY]))
    })

    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area !== "local") return
      if (changes[STORAGE_KEY]) {
        setPairs(parsePairs(changes[STORAGE_KEY].newValue))
      }
    }

    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  const isDuplicate = useCallback(
    (foreground: string, background: string) =>
      pairs.some(
        (p) => p.foreground === foreground && p.background === background
      ),
    [pairs]
  )

  const savePair = useCallback((foreground: string, background: string) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const existing = parsePairs(result[STORAGE_KEY])
      const duplicate = existing.some(
        (p) => p.foreground === foreground && p.background === background
      )
      if (duplicate) return

      const updated = [
        { id: crypto.randomUUID(), foreground, background },
        ...existing
      ]
      chrome.storage.local.set({ [STORAGE_KEY]: updated })
    })
  }, [])

  const removePair = useCallback((id: string) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const existing = parsePairs(result[STORAGE_KEY])
      const updated = existing.filter((p) => p.id !== id)
      chrome.storage.local.set({ [STORAGE_KEY]: updated })
    })
  }, [])

  return { pairs, savePair, removePair, isDuplicate }
}
