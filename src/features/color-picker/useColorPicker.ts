import { useCallback, useEffect, useRef, useState } from "react"

import type { HSV } from "../../popup/types"
import { hsvToRgb } from "../../popup/color-utils"

export const useColorPicker = (initial: HSV) => {
  const [hsv, setHsv] = useState<HSV>(initial)
  const gradientRef = useRef<HTMLCanvasElement>(null)
  const hueRef = useRef<HTMLCanvasElement>(null)
  const [isDraggingGradient, setIsDraggingGradient] = useState(false)
  const [isDraggingHue, setIsDraggingHue] = useState(false)

  const drawGradient = useCallback(() => {
    const canvas = gradientRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { width, height } = canvas
    const hueColor = hsvToRgb(hsv.h, 100, 100)
    ctx.fillStyle = `rgb(${hueColor.r}, ${hueColor.g}, ${hueColor.b})`
    ctx.fillRect(0, 0, width, height)

    const whiteGradient = ctx.createLinearGradient(0, 0, width, 0)
    whiteGradient.addColorStop(0, "rgba(255, 255, 255, 1)")
    whiteGradient.addColorStop(1, "rgba(255, 255, 255, 0)")
    ctx.fillStyle = whiteGradient
    ctx.fillRect(0, 0, width, height)

    const blackGradient = ctx.createLinearGradient(0, 0, 0, height)
    blackGradient.addColorStop(0, "rgba(0, 0, 0, 0)")
    blackGradient.addColorStop(1, "rgba(0, 0, 0, 1)")
    ctx.fillStyle = blackGradient
    ctx.fillRect(0, 0, width, height)
  }, [hsv.h])

  const drawHueSlider = useCallback(() => {
    const canvas = hueRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { height } = canvas
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, "#ff0000")
    gradient.addColorStop(0.17, "#ff00ff")
    gradient.addColorStop(0.33, "#0000ff")
    gradient.addColorStop(0.5, "#00ffff")
    gradient.addColorStop(0.67, "#00ff00")
    gradient.addColorStop(0.83, "#ffff00")
    gradient.addColorStop(1, "#ff0000")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, height)
  }, [])

  const handleGradientInteraction = (
    e: React.MouseEvent<HTMLCanvasElement>
  ) => {
    const canvas = gradientRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
    setHsv((prev) => ({
      ...prev,
      s: (x / rect.width) * 100,
      v: (1 - y / rect.height) * 100
    }))
  }

  const handleHueInteraction = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = hueRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
    setHsv((prev) => ({ ...prev, h: (y / rect.height) * 360 }))
  }

  useEffect(() => {
    drawGradient()
    drawHueSlider()
  }, [drawGradient, drawHueSlider])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingGradient) {
        const canvas = gradientRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
        const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
        setHsv((prev) => ({
          ...prev,
          s: (x / rect.width) * 100,
          v: (1 - y / rect.height) * 100
        }))
      }
      if (isDraggingHue) {
        const canvas = hueRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
        setHsv((prev) => ({ ...prev, h: (y / rect.height) * 360 }))
      }
    }
    const handleMouseUp = () => {
      setIsDraggingGradient(false)
      setIsDraggingHue(false)
    }
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDraggingGradient, isDraggingHue])

  return {
    hsv,
    setHsv,
    gradientRef,
    hueRef,
    isDraggingGradient,
    isDraggingHue,
    setIsDraggingGradient,
    setIsDraggingHue,
    handleGradientInteraction,
    handleHueInteraction
  }
}
