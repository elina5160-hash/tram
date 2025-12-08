"use client"

import { useEffect, useRef, useState } from "react"

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "")
  const bigint = parseInt(clean, 16)
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 }
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      default:
        h = (r - g) / d + 4
    }
    h /= 6
  }
  return { h: h * 360, s, l }
}

export default function ChromaImage({
  src,
  width,
  height,
  keyColor = "#800080",
  tolerance = 80,
  hueTolerance = 25,
  satMin = 0.2,
  lightMin = 0.05,
  lightMax = 0.97,
  feather = 10,
  autoKey = false,
  fallbackSrc,
  cacheBust = false,
  className,
  style,
}: {
  src: string
  width: number
  height: number
  keyColor?: string
  tolerance?: number
  hueTolerance?: number
  satMin?: number
  lightMin?: number
  lightMax?: number
  feather?: number
  autoKey?: boolean
  fallbackSrc?: string
  cacheBust?: boolean
  className?: string
  style?: React.CSSProperties
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [ready, setReady] = useState(false)
  const depKey = `${src}|${width}|${height}|${keyColor}|${tolerance}|${hueTolerance}|${satMin}|${lightMin}|${lightMax}|${feather}|${autoKey}`

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    const assetSrc = cacheBust ? `${src}?v=${Date.now()}` : src
    img.src = assetSrc
    img.onerror = () => {
      if (fallbackSrc) {
        img.src = fallbackSrc
      }
    }
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      ctx.drawImage(img, 0, 0, width, height)
      const imageData = ctx.getImageData(0, 0, width, height)
      const data = imageData.data
      let { r: kr, g: kg, b: kb } = hexToRgb(keyColor)
      if (autoKey) {
        const sample = ctx.getImageData(0, 0, Math.min(10, width), Math.min(10, height)).data
        let sr = 0, sg = 0, sb = 0, n = 0
        for (let i = 0; i < sample.length; i += 4) {
          sr += sample[i]
          sg += sample[i + 1]
          sb += sample[i + 2]
          n++
        }
        kr = Math.round(sr / n)
        kg = Math.round(sg / n)
        kb = Math.round(sb / n)
      }
      const keyHsl = rgbToHsl(kr, kg, kb)
      const tolHue = hueTolerance
      const inner = Math.max((tolHue as number) - feather, 0)

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const { h, s, l } = rgbToHsl(r, g, b)
        const dh = Math.abs(h - keyHsl.h)
        const hueDiff = Math.min(dh, 360 - dh)
        const inRange = s >= satMin && l >= lightMin && l <= lightMax
        if (inRange && hueDiff < (tolHue as number)) {
          let mask = 1
          if (hueDiff < inner) mask = 0
          else mask = (hueDiff - inner) / feather
          if (mask < 0) mask = 0
          if (mask > 1) mask = 1
          data[i + 3] = Math.round(data[i + 3] * mask)
        }
      }

      ctx.putImageData(imageData, 0, 0)
      setReady(true)
    }
  }, [depKey])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={style}
      aria-hidden={!ready}
    />
  )
}
