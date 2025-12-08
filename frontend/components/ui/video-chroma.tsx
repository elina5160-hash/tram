"use client"

import { useEffect, useRef, useState } from "react"

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

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(Math.max((x - edge0) / Math.max(edge1 - edge0, 1e-6), 0), 1)
  return t * t * (3 - 2 * t)
}

export default function VideoChroma({
  src,
  width,
  height,
  lightThreshold = 0.15,
  feather = 0.10,
  responsive = true,
  className,
  style,
}: {
  src: string
  width: number
  height: number
  lightThreshold?: number
  feather?: number
  responsive?: boolean
  className?: string
  style?: React.CSSProperties
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const video = document.createElement("video")
    video.src = src
    video.muted = true
    video.loop = true
    video.autoplay = true
    video.playsInline = true
    videoRef.current = video

    let rafId = 0
    const getDims = () => {
      if (!responsive) return { w: width, h: height }
      const parent = canvas.parentElement
      const w = parent ? parent.clientWidth : width
      let h = 120
      if (w < 640) h = 60
      else if (w < 1024) h = 90
      return { w, h }
    }

    const render = () => {
      if (!videoRef.current || !ctx) return
      if (!videoRef.current.paused && !videoRef.current.ended) {
        const { w, h } = getDims()
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w
          canvas.height = h
        }
        ctx.drawImage(videoRef.current, 0, 0, w, h)
        const imageData = ctx.getImageData(0, 0, w, h)
        const data = imageData.data
        const edge0 = lightThreshold
        const edge1 = Math.min(lightThreshold + feather, 0.99)
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const { l } = rgbToHsl(r, g, b)
          const m = smoothstep(edge0, edge1, l)
          data[i + 3] = Math.round(data[i + 3] * m)
        }
        ctx.putImageData(imageData, 0, 0)
      }
      rafId = requestAnimationFrame(render)
    }

    const onLoaded = () => {
      const { w, h } = getDims()
      canvas.width = w
      canvas.height = h
      setReady(true)
      video.play().catch(() => {})
      rafId = requestAnimationFrame(render)
    }

    video.addEventListener("loadeddata", onLoaded)
    video.load()

    let ro: ResizeObserver | null = null
    if (responsive && canvas.parentElement) {
      ro = new ResizeObserver(() => {
        const { w, h } = getDims()
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w
          canvas.height = h
        }
      })
      ro.observe(canvas.parentElement)
    }

    return () => {
      cancelAnimationFrame(rafId)
      video.pause()
      video.removeEventListener("loadeddata", onLoaded)
      if (ro) ro.disconnect()
    }
  }, [src, width, height, lightThreshold, feather, responsive])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={style}
      aria-hidden={!ready}
    />
  )
}
