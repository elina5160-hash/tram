"use client"
import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import BottomBanner from "@/components/ui/bottom-banner"
import { addToCart, incrementQty } from "@/lib/cart"

import LazyVideo from "@/components/ui/lazy-video"

export default function Catalog() {
  const router = useRouter()
  const items = [
    { id: 1, title: "Закваска ПРАЭнзим", price: "3 000 руб / 1л", image: "/1500x2000 3-4 Zakvaska.mp4" },
    { id: 2, title: "АКЦИЯ ДВА КУРСА смены микробиома", price: "24 000 руб", image: "/1.jpg" },
    { id: 3, title: "Чистое утро", price: "2400 руб / 2 л + 100гр", image: "/4.png" },
    { id: 4, title: "БифидумФаната", price: "1 200 руб / 1л", image: "/ETRA Bottle Fanta2.mp4" },
    { id: 6, title: "Набор СЕЗОННЫЙ", price: "4 200 руб / 6л", image: "/2.jpg" },
    { id: 7, title: "Бак для приготовления энзимных напитков", price: "53 000 руб / 19л", image: "/2.png" },
    { id: 8, title: "Супер пробка", price: "950 руб.", image: "/пробка.jpg" },
    { id: 9, title: "Курс Чистка Микробиома", price: "16 000 руб", image: "/афиша.png" },
    { id: 10, title: "Сыродавленные масла", price: "", image: "/9.png" },
    { id: 11, title: "Энзимный напиток Еловый", price: "750 руб.", image: "/Eloviy PROMO strz 2.mp4" },
    { id: 12, title: "Энзимный напиток Детский", price: "750 руб.", image: "/Etra PROMO strz Detskii.mp4" },
    { id: 13, title: "Энзимный напиток Хмель", price: "900 руб / 1л", image: "/хмель1.png" },
    { id: 14, title: "Энзимный напиток Розлинг", price: "800 руб / 1л", image: "/розлинг1.jpg" },
    { id: 15, title: "Полезный энергетик", price: "750 руб / 1л", image: "/нг.png" },
    { id: 16, title: "Энзимный напиток Рислинг", price: "800 руб.", image: "/рислинг1.png" },
    { id: 17, title: "Энзимный напиток Апельсин", price: "800 руб.", image: "/Etra PROMO ORANGE-2.mp4" },
    { id: 18, title: "Антипаразитарные пребиотики ПАРАЗИТОФФ", price: "750 руб.", image: "/PARAZITOFF 1500x2667 9-16 PROMO-4_1.mp4" },
    { id: 19, title: "Каша ЭТРАсУТРА", price: "750 руб / 200гр", image: "/KASHA PROMO Demo.mp4" },
    { id: 20, title: "НАБОР СЕМЕЙНЫЙ", price: "4 200 руб.", image: "/Набор семейный.png" },
    { id: 21, title: "Набор для бани", price: "4 200 руб.", image: "/баня.PNG" },
    { id: 22, title: "Супер Квас", price: "750 руб.", image: "/1500x2000 3-4 SK.mp4" },
  ]
  function splitPrice(s: string) {
    const m = s.match(/^(.*?руб\.?)/i)
    if (m) {
      const main = m[1].trim()
      let rest = s.slice(m[1].length).trim()
      if (rest.startsWith("/")) rest = rest.slice(1).trim()
      return { main, sub: rest }
    }
    const parts = s.split("/")
    return { main: (parts[0] || "").trim(), sub: (parts[1] || "").trim() }
  }
  const [qty, setQty] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {}
    items.forEach((it) => (initial[it.id] = 0))
    return initial
  })
  const [pressedId, setPressedId] = useState<number | null>(null)
  const [catalogEntered, setCatalogEntered] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setCatalogEntered(true), 0)
    return () => clearTimeout(id)
  }, [])

  return (
    <div className="min-h-[100dvh] w-full bg-white flex flex-col justify-start relative pb-56">
      <div className="w-full max-w-[420px] mx-auto px-6 pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">Товары</h1>
          <svg width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11.7391 0H0.586957C0.26413 0 0 0.26413 0 0.586957V11.7391C0 12.062 0.26413 12.3261 0.586957 12.3261H11.7391C12.062 12.3261 12.3261 12.062 12.3261 11.7391V0.586957C12.3261 0.26413 12.062 0 11.7391 0ZM9.83152 9.83152H2.49457V2.49457H9.83152V9.83152ZM26.413 0H15.2609C14.938 0 14.6739 0.26413 14.6739 0.586957V11.7391C14.6739 12.062 14.938 12.3261 15.2609 12.3261H26.413C26.7359 12.3261 27 12.062 27 11.7391V0.586957C27 0.26413 26.7359 0 26.413 0ZM24.5054 9.83152H17.1685V2.49457H24.5054V9.83152ZM11.7391 14.6739H0.586957C0.26413 14.6739 0 14.938 0 15.2609V26.413C0 26.7359 0.26413 27 0.586957 27H11.7391C12.062 27 12.3261 26.7359 12.3261 26.413V15.2609C12.3261 14.938 12.062 14.6739 11.7391 14.6739ZM9.83152 24.5054H2.49457V17.1685H9.83152V24.5054ZM26.413 14.6739H15.2609C14.938 14.6739 14.6739 14.938 14.6739 15.2609V26.413C14.6739 26.7359 14.938 27 15.2609 27H26.413C26.7359 27 27 26.7359 27 26.413V15.2609C27 14.938 26.7359 14.6739 26.413 14.6739ZM24.5054 24.5054H17.1685V17.1685H24.5054V24.5054Z" fill="#B7B1B1" />
          </svg>
        </div>
        <div className="mt-3 inline-grid grid-cols-2 gap-2 mx-auto">
          {items.map((it, idx) => (
            <div
              key={it.id}
              className={`bg-white rounded-[20px] border border-gray-300 p-2 transition-all duration-500 ease-out transform-gpu ${catalogEntered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3"}`}
              style={{ transitionDelay: `${idx * 60}ms` }}
              onClick={() => router.push(`/item/${it.id}`)}
              aria-label="Открыть товар"
            >
              <div className="relative rounded-[16px] overflow-hidden">
                <Link href={`/item/${it.id}`} className="block" aria-label="Открыть товар">
                  <div className="aspect-square bg-[#F1F1F1]">
                    {it.image.endsWith(".mp4") ? (
                      <LazyVideo 
                        src={it.image} 
                        className="w-full h-full object-cover" 
                      />
                      ) : (
                        (() => {
                          const map: Record<string, string> = {
                            "/night.png": "/day.png",
                            "/Zakvaska.png": "/1.png",
                            "/Rozling.png": "/розлинг1.jpg",
                            "/Risling.png": "/рислинг1.png",
                            "/Xmel.png": "/хмель1.png",
                          }
                          return (
                            <Image
                              src={it.image}
                              alt={it.title}
                              fill
                              className="object-cover"
                              loading="lazy"
                              sizes="(max-width: 420px) 50vw, 33vw"
                              onLoad={() => {
                                try {
                                  const payload = { type: "IMAGE_LOAD", message: "catalog image loaded", data: { id: it.id, ts: Date.now() } }
                                  const blob = new Blob([JSON.stringify(payload)], { type: "application/json" })
                                  navigator.sendBeacon("/api/log", blob)
                                } catch {}
                              }}
                              onError={(e) => {
                                const el = e.currentTarget as any
                                const next = map[it.image] || "/главная4.png"
                                if (el && next) el.src = next
                              }}
                            />
                          )
                        })()
                      )}
                  </div>
                </Link>
              </div>
              <div className="mt-2">
                <Link href={`/item/${it.id}`} className="block">
                  <span className="block text-[13px] font-bold leading-tight min-h-[28px]" style={{ color: "#000000" }}>{it.title}</span>
                </Link>
                <div className="mt-1 flex flex-col gap-2">
                    <div className="flex flex-col">
                      {it.id === 6 && (
                        <span className="text-[12px] whitespace-nowrap font-bold" style={{ color: "#8A8A8A", textDecoration: "line-through" }}>6000 РУБ</span>
                      )}
                    {it.id === 2 && (
                      <span className="text-[12px] whitespace-nowrap font-bold" style={{ color: "#8A8A8A", textDecoration: "line-through" }}>32 000 р.</span>
                    )}
                    {it.id !== 10 && (
                      <span className="text-[12px] whitespace-nowrap font-bold" style={{ color: "#000000" }}>{it.id === 6 ? "4200руб" : it.id === 2 ? "24 000 р." : splitPrice(it.price).main}</span>
                    )}
                    {it.id !== 6 && it.id !== 2 && splitPrice(it.price).sub && (
                      <span className="text-[12px] font-bold" style={{ color: "#8A8A8A" }}>{splitPrice(it.price).sub}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <div
                      aria-label="Уменьшить количество"
                      onClick={(e) => {
                        e.stopPropagation()
                        setQty((prev) => ({ ...prev, [it.id]: Math.max(0, (prev[it.id] || 0) - 1) }))
                      incrementQty(it.id, -1)
                    }}
                    className="w-7 h-7 rounded-[10px] bg-white border border-gray-300 text-[#232323] text-[14px] flex items-center justify-center cursor-pointer shrink-0"
                  >
                    −
                  </div>
                  <span className="text-[13px]">{qty[it.id] || 0}</span>
                  <div
                    aria-label="Увеличить количество"
                    onClick={(e) => {
                      e.stopPropagation()
                      setQty((prev) => ({ ...prev, [it.id]: (prev[it.id] || 0) + 1 }))
                      addToCart({ id: it.id, title: it.title, qty: 1 })
                    }}
                    className="w-7 h-7 rounded-[10px] bg-white border border-gray-300 text-[#232323] text-[14px] flex items-center justify-center cursor-pointer shrink-0"
                  >
                    +
                  </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="h-24 w-full" />
      </div>
      <BottomBanner />
    </div>
  )
}
