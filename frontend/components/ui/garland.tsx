"use client"

import { useEffect, useRef } from "react"

export default function Garland() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Setup canvas size
    const updateSize = () => {
      canvas.width = window.innerWidth
      // Height can be adjusted. Original was 200, we use 150 to be less intrusive
      canvas.height = 160 
    }
    updateSize()
    window.addEventListener('resize', updateSize)

    // Light class ported from provided file
    class Light {
      x: number
      y: number
      radius: number
      color: string
      originalColor: string
      speed: number
      time: number
      currentRadius: number
      brightness: number

      constructor(x: number, y: number, radius: number, color: string, speed: number) {
        this.x = x
        this.y = y
        this.radius = radius
        this.color = color
        this.originalColor = color
        this.speed = speed
        this.time = Math.random() * Math.PI * 2
        this.currentRadius = radius
        this.brightness = 1
      }

      update() {
        this.time += this.speed
        // Pulsation logic from file
        const pulse = Math.sin(this.time) * 0.3 + 0.7
        this.currentRadius = this.radius * pulse
        this.brightness = pulse
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2)

        // Gradient for 3D effect
        const gradient = ctx.createRadialGradient(
            this.x - this.currentRadius/3,
            this.y - this.currentRadius/3,
            0,
            this.x,
            this.y,
            this.currentRadius
        )

        gradient.addColorStop(0, 'white')
        gradient.addColorStop(0.3, this.color)
        // Modified last stop to be transparent for overlay usage, 
        // avoiding dark artifacts on light background while keeping some depth
        gradient.addColorStop(1, 'rgba(0,0,0,0)') 

        ctx.fillStyle = gradient
        ctx.fill()

        // Glow effect
        ctx.shadowColor = this.color
        ctx.shadowBlur = 15 * this.brightness
        ctx.fill()
        ctx.shadowBlur = 0
      }
    }

    const lights: Light[] = []
    const colors = ['#FF4757', '#2ED573', '#1E90FF', '#FFD700', '#9B59B6']
    
    // Initialize lights
    const initLights = () => {
        lights.length = 0
        // Adjust count based on width
        const lightCount = Math.floor(canvas.width / 50) 
        const spacing = canvas.width / (lightCount + 1)
        
        for(let i = 0; i < lightCount; i++) {
            const x = spacing * (i + 1)
            // Sine wave position
            const y = canvas.height / 3 + Math.sin(i * 0.5) * 20
            const color = colors[i % colors.length]
            const speed = 0.05 + Math.random() * 0.03
            lights.push(new Light(x, y, 12, color, speed))
        }
    }
    initLights()
    window.addEventListener('resize', initLights)

    let animationFrameId: number

    const animate = () => {
        // Use clearRect instead of fillRect for transparent overlay
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Draw wire
        if (lights.length > 0) {
            ctx.beginPath()
            ctx.moveTo(lights[0].x, lights[0].y)
            for(let i = 1; i < lights.length; i++) {
                ctx.lineTo(lights[i].x, lights[i].y)
            }
            ctx.strokeStyle = '#FFD700'
            ctx.lineWidth = 2
            ctx.stroke()
        }

        // Update and draw lights
        lights.forEach(light => {
            light.update()
            light.draw(ctx)
        })

        animationFrameId = requestAnimationFrame(animate)
    }
    animate()

    // Click interaction
    const handleClick = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        lights.forEach(light => {
            const distance = Math.sqrt((x - light.x) ** 2 + (y - light.y) ** 2)
            // Increased click radius for easier interaction
            if(distance < light.radius * 3) {
                const newColor = colors[Math.floor(Math.random() * colors.length)]
                light.color = newColor
            }
        })
    }
    canvas.addEventListener('click', handleClick)

    return () => {
        window.removeEventListener('resize', updateSize)
        window.removeEventListener('resize', initLights)
        canvas.removeEventListener('click', handleClick)
        cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <div className="fixed top-0 left-0 w-full pointer-events-none z-40" style={{ height: '160px' }}>
      <canvas 
        ref={canvasRef} 
        className="w-full h-full pointer-events-auto"
      />
    </div>
  )
}
