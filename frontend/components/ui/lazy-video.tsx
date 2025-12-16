"use client"
import { useEffect, useRef, useState } from "react"

interface LazyVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string
}

export default function LazyVideo({ src, className, ...props }: LazyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            videoRef.current?.play().catch(() => {
                // Auto-play might be blocked by browser policies
                // Muted attribute handles most cases, but good to be safe
            })
          } else {
            setIsVisible(false)
            videoRef.current?.pause()
          }
        })
      },
      { threshold: 0.4 } // Play when 40% visible
    )

    if (videoRef.current) {
      observer.observe(videoRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <video
      ref={videoRef}
      src={src}
      className={className}
      muted
      playsInline
      loop
      preload="metadata" // Only load metadata initially
      {...props}
    />
  )
}
