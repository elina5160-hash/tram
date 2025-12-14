"use client"
import { useState, Suspense } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { addToCart, incrementQty } from "@/lib/cart"
import { getPriceValue, splitPrice } from "@/lib/price"
import { useProducts } from "@/hooks/useProducts"
import { staticItems } from "@/data/staticItems"

import BottomBanner from "@/components/ui/bottom-banner"
import ContestBadge from "@/components/ui/contest-badge"

export default function Shop() {
  const router = useRouter()
  const { products: fetchedProducts } = useProducts()

  const items = (fetchedProducts && fetchedProducts.length > 0 ? fetchedProducts : staticItems) as any[]

  const promos = items.filter((it: any) => {
    const priceVal = getPriceValue(it.price)
    const isCheap = priceVal > 0 && priceVal < 1000
    // Check for hardcoded discounted items (IDs 2 and 6 have old prices shown in JSX)
    // Also check title for "акция" keyword
    const isDiscounted = [2, 6].includes(it.id) || it.title.toLowerCase().includes("акция")
    // Keep original manual IDs [6, 8] (8 is cheap, 6 is discounted)
    return isCheap || isDiscounted || [6, 8].includes(it.id)
  })
  
  const bests = items.filter((it: any) => [1, 7, 3, 4].includes(it.id))
  const novelties = items.filter((it: any) => [1, 2, 3, 4, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].includes(it.id))
  
  const [qty, setQty] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {}
    items.forEach((it) => (initial[it.id] = 0))
    return initial
  })
  const [pressedId, setPressedId] = useState<number | null>(null)
  
  
  

  
  return (
    <div className="min-h-screen w-full bg-white flex flex-col items-center justify-start relative pb-40">
      
      <div className="w-full max-w-[420px] mx-auto px-4 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Каталог</h1>
          <Suspense fallback={null}>
            <ContestBadge />
          </Suspense>
        </div>
        <section className="mt-4">
          <div className="mt-3 inline-grid grid-cols-2 gap-2 mx-auto">
            {promos.map((it) => (
              <div
                key={it.id}
                className="bg-white rounded-[20px] border border-gray-300 p-2"
                onClick={() => router.push(`/item/${it.id}`)}
                aria-label="Открыть товар"
              >
                <div className="relative rounded-[16px] overflow-hidden">
                  <Link href={`/item/${it.id}`} className="block" aria-label="Открыть товар">
                    <div className="aspect-square bg-[#F1F1F1]">
                      {it.id === 6 || it.image.endsWith(".mp4") ? (
                        <video muted playsInline autoPlay loop className="w-full h-full object-cover">
                          <source src={it.id === 6 ? "/видео%201.mp4" : it.image} type="video/mp4" />
                        </video>
                      ) : (
                        <Image src={it.image} alt={it.title} fill className="object-cover" priority={it.id <= 2} />
                      )}
                    </div>
                  </Link>
                </div>
                <div className="mt-2">
                  <Link href={`/item/${it.id}`} className="block">
                    <span className="block text-[13px] font-bold leading-tight min-h-[28px]" style={{ color: "#000000" }}>{it.title}</span>
                  </Link>
                  <div className="mt-1 flex items-center justify-between">
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
                      className="w-7 h-7 rounded-[10px] bg-white border border-gray-300 text-[#232323] text-[16px] flex items-center justify-center cursor-pointer"
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
                      className="w-7 h-7 rounded-[10px] bg-white border border-gray-300 text-[#232323] text-[16px] flex items-center justify-center cursor-pointer"
                    >
                      +
                    </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="mt-6">
          <div className="mt-3 inline-grid grid-cols-2 gap-2 mx-auto">
            {bests.map((it) => (
              <div
                key={it.id}
                className="bg-white rounded-[20px] border border-gray-300 p-2"
                onClick={() => router.push(`/item/${it.id}`)}
                aria-label="Открыть товар"
              >
                <div className="relative rounded-[16px] overflow-hidden">
                  <Link href={`/item/${it.id}`} className="block" aria-label="Открыть товар">
                    <div className="aspect-square bg-[#F1F1F1]">
                      {it.id === 6 || it.image.endsWith(".mp4") ? (
                        <video src={it.id === 6 ? "/видео 1.mp4" : it.image} muted playsInline autoPlay loop className="w-full h-full object-cover" />
                      ) : (
                        <Image src={it.image} alt={it.title} fill className="object-cover" priority={it.id <= 2} />
                      )}
                    </div>
                  </Link>
                </div>
                <div className="mt-2">
                  <Link href={`/item/${it.id}`} className="block">
                    <span className="block text-[13px] font-bold leading-tight min-h-[28px]" style={{ color: "#000000" }}>{it.title}</span>
                  </Link>
                  <div className="mt-1 flex items-center justify-between">
                    <div className="flex flex-col">
                      {it.id === 6 && (
                        <span className="text-[12px] whitespace-nowrap font-bold" style={{ color: "#8A8A8A", textDecoration: "line-through" }}>6000 РУБ</span>
                      )}
                      {it.id === 2 && (
                        <span className="text-[12px] whitespace-nowrap font-bold" style={{ color: "#8A8A8A", textDecoration: "line-through" }}>32 000 р.</span>
                      )}
                      <span className="text-[12px] whitespace-nowrap font-bold" style={{ color: "#000000" }}>{it.id === 6 ? "4200руб" : it.id === 2 ? "24 000 р." : splitPrice(it.price).main}</span>
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
                      className="w-7 h-7 rounded-[10px] bg-white border border-gray-300 text-[#232323] text-[16px] flex items-center justify-center cursor-pointer"
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
                      className="w-7 h-7 rounded-[10px] bg-white border border-gray-300 text-[#232323] text-[16px] flex items-center justify-center cursor-pointer"
                    >
                      +
                    </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="mt-6">
          <div className="mt-3 inline-grid grid-cols-2 gap-2 mx-auto">
            {novelties.map((it) => (
              <div
                key={it.id}
                className="bg-white rounded-[20px] border border-gray-300 p-2"
                onClick={() => router.push(`/item/${it.id}`)}
                aria-label="Открыть товар"
              >
                <div className="relative rounded-[16px] overflow-hidden">
                  <Link href={`/item/${it.id}`} className="block" aria-label="Открыть товар">
                    <div className="aspect-square bg-[#F1F1F1]">
                      {it.id === 6 || it.image.endsWith(".mp4") ? (
                        <video src={it.id === 6 ? "/видео 1.mp4" : it.image} muted playsInline autoPlay loop className="w-full h-full object-cover" />
                      ) : (
                        <Image src={it.image} alt={it.title} fill className="object-cover" priority={it.id <= 2} />
                      )}
                    </div>
                  </Link>
                </div>
                <div className="mt-2">
                  <Link href={`/item/${it.id}`} className="block">
                    <span className="block text-[13px] font-bold leading-tight min-h-[28px]" style={{ color: "#000000" }}>{it.title}</span>
                  </Link>
                  <div className="mt-1 flex items-center justify-between">
                    <div className="flex flex-col">
                      {it.id === 6 && (
                        <span className="text-[12px] whitespace-nowrap font-bold" style={{ color: "#8A8A8A", textDecoration: "line-through" }}>6000 РУБ</span>
                      )}
                      {it.id === 2 && (
                        <span className="text-[12px] whitespace-nowrap font-bold" style={{ color: "#8A8A8A", textDecoration: "line-through" }}>32 000 р.</span>
                      )}
                      <span className="text-[12px] whitespace-nowrap font-bold" style={{ color: "#000000" }}>{it.id === 6 ? "4200руб" : it.id === 2 ? "24 000 р." : splitPrice(it.price).main}</span>
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
                      className="w-7 h-7 rounded-[10px] bg-white border border-gray-300 text-[#232323] text-[16px] flex items-center justify-center cursor-pointer"
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
                      className="w-7 h-7 rounded-[10px] bg-white border border-gray-300 text-[#232323] text-[16px] flex items-center justify-center cursor-pointer"
                    >
                      +
                    </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        <BottomBanner />
      </div>
      
    </div>
  )
}