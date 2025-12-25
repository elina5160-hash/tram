"use client"

import { useEffect, useRef } from "react"

export default function Garland() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const updateSize = () => {
      canvas.width = window.innerWidth
      canvas.height = 120 
    }
    updateSize()
    window.addEventListener('resize', updateSize)

    class Light {
      x: number
      y: number
      width: number
      height: number
      color: string
      originalColor: string
      speed: number
      time: number
      brightness: number

      constructor(x: number, y: number, color: string, speed: number) {
        this.x = x
        this.y = y
        this.width = 12 // Ширина лампочки
        this.height = 24 // Высота лампочки (удлиненная)
        this.color = color
        this.originalColor = color
        this.speed = speed
        this.time = Math.random() * Math.PI * 2
        this.brightness = 1
      }

      update() {
        this.time += this.speed
        // Более заметное мигание: диапазон яркости от 0.3 до 1.0
        const pulse = Math.sin(this.time) * 0.35 + 0.65
        this.brightness = pulse
      }

      draw(ctx: CanvasRenderingContext2D) {
        // Смещение и масштабирование для уменьшения размера
        ctx.save()
        ctx.translate(this.x, this.y + 6) // +6 чтобы провод подходил к верхушке уменьшенной лампы
        ctx.scale(0.7, 0.7) // Уменьшаем размер до 70%

        // Координаты теперь локальные (0,0 - центр цоколя)
        const centerX = 0
        const centerY = 0

        // 1. Свечение (Glow)
        ctx.save()
        ctx.globalAlpha = 0.5 * this.brightness
        const glowRadius = 40 // Чуть больше радиус относительно масштаба
        const glowGradient = ctx.createRadialGradient(
            centerX, centerY + 15, 5,
            centerX, centerY + 15, glowRadius
        )
        glowGradient.addColorStop(0, this.color)
        glowGradient.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = glowGradient
        ctx.beginPath()
        ctx.arc(centerX, centerY + 15, glowRadius, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        // 2. Цоколь (Socket)
        ctx.save()
        ctx.fillStyle = '#222'
        ctx.fillRect(centerX - 5, centerY - 6, 10, 8)
        ctx.fillStyle = '#333'
        ctx.fillRect(centerX - 6, centerY + 2, 12, 3)
        ctx.restore()

        // 3. Лампочка (Bulb)
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(centerX - 5, centerY + 5)
        ctx.bezierCurveTo(
            centerX - 8, centerY + 15, 
            centerX - 6, centerY + 28, 
            centerX, centerY + 32
        )
        ctx.bezierCurveTo(
            centerX + 6, centerY + 28, 
            centerX + 8, centerY + 15, 
            centerX + 5, centerY + 5
        )
        ctx.closePath()

        const bulbGradient = ctx.createRadialGradient(
            centerX - 2, centerY + 12, 0,
            centerX, centerY + 15, 15
        )
        bulbGradient.addColorStop(0, '#fff')
        bulbGradient.addColorStop(0.5, this.color)
        bulbGradient.addColorStop(1, this.color)
        
        ctx.fillStyle = bulbGradient
        ctx.fill()

        // Блик
        ctx.beginPath()
        ctx.ellipse(centerX - 3, centerY + 12, 1.5, 4, Math.PI / 8, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
        ctx.fill()
        
        ctx.restore()
        
        // Восстанавливаем контекст (отменяем scale и translate)
        ctx.restore()
      }
    }

    const lights: Light[] = []
    const colors = ['#FF0000', '#FFD700', '#00FF00', '#00BFFF', '#9932CC']
    
    const initLights = () => {
        lights.length = 0
        const spacing = 35 // Уменьшили расстояние (было 45)
        const lightCount = Math.ceil(canvas.width / spacing) + 4
        
        for(let i = 0; i < lightCount; i++) {
            const x = (i * spacing) - (spacing * 1.5)
            // Амплитуда волны чуть меньше
            const y = 8 + Math.cos(i * 0.5) * 6 
            
            const color = colors[i % colors.length]
            // Скорость мигания выше
            const speed = 0.05 + Math.random() * 0.05 
            lights.push(new Light(x, y, color, speed))
        }
    }
    initLights()
    window.addEventListener('resize', initLights)

    let animationFrameId: number

    const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Рисуем провод (Wire)
        if (lights.length > 0) {
            ctx.beginPath()
            // Начинаем чуть левее первой лампы
            ctx.moveTo(lights[0].x - 20, lights[0].y - 5)
            
            for(let i = 0; i < lights.length; i++) {
                const targetX = lights[i].x
                const targetY = lights[i].y // Верх цоколя
                
                const prevX = i > 0 ? lights[i-1].x : lights[0].x - 45
                const prevY = i > 0 ? lights[i-1].y : lights[0].y
                
                // Провисание провода
                const cpX = (prevX + targetX) / 2
                const cpY = (prevY + targetY) / 2 + 5 

                if (i === 0) {
                     ctx.lineTo(targetX, targetY)
                } else {
                     ctx.quadraticCurveTo(cpX, cpY, targetX, targetY)
                }
                
                // Петля провода вокруг цоколя (маленький завиток)
                // ctx.arc(targetX, targetY - 2, 2, 0, Math.PI * 2)
            }
            
            // Хвост провода
            const last = lights[lights.length - 1]
            ctx.quadraticCurveTo(last.x + 20, last.y + 5, last.x + 40, last.y)

            ctx.shadowColor = 'rgba(0,0,0,0.5)'
            ctx.shadowBlur = 2
            ctx.strokeStyle = '#222' // Почти черный провод
            ctx.lineWidth = 2.5
            ctx.stroke()
            ctx.shadowBlur = 0
        }

        // Рисуем лампочки
        lights.forEach(light => {
            light.update()
            light.draw(ctx)
        })

        animationFrameId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
        window.removeEventListener('resize', updateSize)
        window.removeEventListener('resize', initLights)
        cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <div className="absolute top-0 left-0 w-full pointer-events-none z-40" style={{ height: '120px', borderBottom: 'none' }}>
      <canvas 
        ref={canvasRef} 
        className="w-full h-full pointer-events-none"
      />
    </div>
  )
}
