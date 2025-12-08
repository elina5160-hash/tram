"use client"
import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import BackButton from "@/components/ui/back-button"
import BottomBanner from "@/components/ui/bottom-banner"
import { addToCart } from "@/lib/cart"

export default function Catalog() {
  const router = useRouter()
  const items = [
    { id: 1, title: "Закваска ПРАЭнзим", price: "3 000 руб / 1л", image: "/1.png" },
    { id: 2, title: "Курс Смена Миркобиома", price: "16 000руб / 12л", image: "/2.png" },
    { id: 3, title: "Чистое Утро", price: "2400 руб / 2 л + 100гр", image: "/4.png" },
    { id: 4, title: "Бифидум Фаната", price: "1 200 руб / 1л", image: "/5.png" },
    { id: 5, title: "Набор МЕГА КОМПЛЕКТ", price: "4 400 руб / 5л", image: "/главная4.png" },
    { id: 6, title: "Набор СЕЗОННЫЙ", price: "4 200 руб / 6л", image: "/главная4.png" },
    { id: 7, title: "Бак для приготовления энзимных напитков", price: "53 000 руб / 19л", image: "/2.png" },
    { id: 8, title: "Супер пробка", price: "950 руб.", image: "/пробка.jpg" },
    { id: 9, title: "Курс Чистка Микробиома", price: "16 000 руб", image: "/2.png" },
    { id: 10, title: "Сыродавленные масла", price: "", image: "/9.png" },
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
    items.forEach((it) => (initial[it.id] = 1))
    return initial
  })
  const [pressedId, setPressedId] = useState<number | null>(null)
  const [catalogEntered, setCatalogEntered] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setCatalogEntered(true), 0)
    return () => clearTimeout(id)
  }, [])

  return (
    <div className="min-h-screen w-full bg-white flex flex-col justify-start relative pb-24">
      <BackButton />
      <div className="w-full max-w-5xl px-4 pt-6">
        <h1 className="text-xl sm:text-2xl font-semibold">Товары</h1>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
          {items.map((it, idx) => (
            <div
              key={it.id}
              className={`bg-white rounded-[20px] border border-gray-300 p-3 transition-all duration-500 ease-out transform-gpu ${catalogEntered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3"}`}
              style={{ transitionDelay: `${idx * 60}ms` }}
              onClick={() => router.push(`/item/${it.id}`)}
              aria-label="Открыть товар"
            >
              <div className="relative rounded-[16px] overflow-hidden">
                <Link href={`/item/${it.id}`} className="block" aria-label="Открыть товар">
                  <div className="aspect-square bg-[#F1F1F1]">
                    {it.id === 6 ? (
                      <video src="/видео 1.mp4" muted playsInline autoPlay loop className="w-full h-full object-contain" />
                    ) : (
                      <Image src={it.image} alt={it.title} fill className="object-cover" priority={it.id <= 2} />
                    )}
                  </div>
                </Link>
                <div
                  aria-label="Добавить в корзину"
                  onClick={(e) => {
                    e.stopPropagation()
                    addToCart({ id: it.id, title: it.title, qty: qty[it.id] || 1 })
                  }}
                  onMouseDown={() => setPressedId(it.id)}
                  onMouseUp={() => setPressedId(null)}
                  onMouseLeave={() => setPressedId(null)}
                  onTouchStart={() => setPressedId(it.id)}
                  onTouchEnd={() => setPressedId(null)}
                  className="absolute bottom-2 right-2 rounded-[12px] border px-2 py-1 active:scale-105 cursor-pointer"
                  style={{ backgroundColor: pressedId === it.id ? "#6800E9" : "#FFFFFF", borderColor: pressedId === it.id ? "#6800E9" : "#D1D5DB" }}
                >
                  <Image src="/маг.png" alt="Добавить в корзину" width={18} height={18} />
                </div>
              </div>
              <div className="mt-2">
                <Link href={`/item/${it.id}`} className="block">
                  <span className="block text-[13px] sm:text-[14px] font-bold leading-tight min-h-[28px] sm:min-h-[32px]" style={{ color: "#000000" }}>{it.title}</span>
                </Link>
                <div className="mt-1 flex items-center justify-between">
                  <div className="flex flex-col">
                    {it.id === 6 && (
                      <span className="text-[12px] sm:text-[13px] whitespace-nowrap" style={{ color: "#8A8A8A", textDecoration: "line-through" }}>6000 РУБ</span>
                    )}
                    {it.id === 2 && (
                      <span className="text-[12px] sm:text-[13px] whitespace-nowrap" style={{ color: "#8A8A8A", textDecoration: "line-through" }}>32 000 р.</span>
                    )}
                    {it.id !== 10 && (
                      <span className="text-[12px] sm:text-[13px] whitespace-nowrap" style={{ color: "#8A8A8A" }}>{it.id === 6 ? "4200руб" : it.id === 2 ? "24 000 р." : splitPrice(it.price).main}</span>
                    )}
                    {it.id !== 6 && it.id !== 2 && splitPrice(it.price).sub && (
                      <span className="text-[12px]" style={{ color: "#8A8A8A" }}>{splitPrice(it.price).sub}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <div
                      aria-label="Уменьшить количество"
                      onClick={(e) => {
                        e.stopPropagation()
                        setQty((prev) => ({ ...prev, [it.id]: Math.max(1, (prev[it.id] || 1) - 1) }))
                      }}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-[12px] bg-white border border-gray-300 text-[#232323] text-[16px] sm:text-[18px] flex items-center justify-center cursor-pointer"
                    >
                      −
                    </div>
                    <span className="text-[13px] sm:text-[14px]">{qty[it.id] || 1}</span>
                    <div
                      aria-label="Увеличить количество"
                      onClick={(e) => {
                        e.stopPropagation()
                        setQty((prev) => ({ ...prev, [it.id]: (prev[it.id] || 1) + 1 }))
                      }}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-[12px] bg-white border border-gray-300 text-[#232323] text-[16px] sm:text-[18px] flex items-center justify-center cursor-pointer"
                    >
                      +
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <BottomBanner />
    </div>
  )
}
