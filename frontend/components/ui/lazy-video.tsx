"use client"
import { useEffect, useRef, useState } from "react"

interface LazyVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string
}

export default function LazyVideo({ src, className, ...props }: LazyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setHasLoaded(true)
            // Small timeout to ensure src is set before playing
            setTimeout(() => {
                videoRef.current?.play().catch(() => {
                    // Auto-play might be blocked
                })
            }, 50)
          } else {
            videoRef.current?.pause()
          }
        })
      },
      { threshold: 0.1, rootMargin: "100px" } // Load slightly before it comes into view
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
      src={hasLoaded ? src : undefined}
      className={className}
      muted
      playsInline
      loop
      preload="metadata"
      {...props}
    />
  )
}
