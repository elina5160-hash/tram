"use client"
import { useEffect, useState, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import BottomBanner from "@/components/ui/bottom-banner"
import { addToCart, incrementQty, getCart } from "@/lib/cart"
import { useProducts } from "@/hooks/useProducts"
import { staticItems } from "@/data/staticItems"

import LazyVideo from "@/components/ui/lazy-video"

export default function Catalog() {
  const router = useRouter()
  const { products: fetchedProducts, isLoading } = useProducts()
  
  // Use fetched products if available, otherwise fallback to staticItems
  const items = useMemo(() => {
    if (fetchedProducts && fetchedProducts.length > 0) {
      return fetchedProducts
    }
    return staticItems
  }, [fetchedProducts])

  const [searchTerm, setSearchTerm] = useState("")

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items
    return items.filter((it: any) => 
      it.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [items, searchTerm])

  function splitPrice(s: string) {
    if (!s) return { main: "", sub: "" }
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
  
  const [qty, setQty] = useState<Record<number, number>>({})

  // Sync qty with cart
  useEffect(() => {
    const update = () => {
        const cart = getCart()
        const newQty: Record<number, number> = {}
        cart.forEach((c) => (newQty[c.id] = c.qty))
        setQty(newQty)
    }
    update()
    window.addEventListener("cart:changed", update)
    return () => window.removeEventListener("cart:changed", update)
  }, [])

  const [pressedId, setPressedId] = useState<number | null>(null)
  const [catalogEntered, setCatalogEntered] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setCatalogEntered(true), 0)
    return () => clearTimeout(id)
  }, [])

  return (
    <div className="min-h-[100dvh] w-full bg-white flex flex-col justify-start relative pb-56">
      <div className="w-full max-w-[420px] mx-auto px-6 pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">Товары</h1>
            <svg width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.7391 0H0.586957C0.26413 0 0 0.26413 0 0.586957V11.7391C0 12.062 0.26413 12.3261 0.586957 12.3261H11.7391C12.062 12.3261 12.3261 12.062 12.3261 11.7391V0.586957C12.3261 0.26413 12.062 0 11.7391 0ZM9.83152 9.83152H2.49457V2.49457H9.83152V9.83152ZM26.413 0H15.2609C14.938 0 14.6739 0.26413 14.6739 0.586957V11.7391C14.6739 12.062 14.938 12.3261 15.2609 12.3261H26.413C26.7359 12.3261 27 12.062 27 11.7391V0.586957C27 0.26413 26.7359 0 26.413 0ZM24.5054 9.83152H17.1685V2.49457H24.5054V9.83152ZM11.7391 14.6739H0.586957C0.26413 14.6739 0 14.938 0 15.2609V26.413C0 26.7359 0.26413 27 0.586957 27H11.7391C12.062 27 12.3261 26.7359 12.3261 26.413V15.2609C12.3261 14.938 12.062 14.6739 11.7391 14.6739ZM9.83152 24.5054H2.49457V17.1685H9.83152V24.5054ZM26.413 14.6739H15.2609C14.938 14.6739 14.6739 14.938 14.6739 15.2609V26.413C14.6739 26.7359 14.938 27 15.2609 27H26.413C26.7359 27 27 26.7359 27 26.413V15.2609C27 14.938 26.7359 14.6739 26.413 14.6739ZM24.5054 24.5054H17.1685V17.1685H24.5054V24.5054Z" fill="#B7B1B1" />
            </svg>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4 relative">
            <input 
                type="text" 
                placeholder="Поиск товаров..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-gray-100 border-none outline-none text-sm placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
            <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        </div>

        <div className="mt-3 inline-grid grid-cols-2 gap-2 mx-auto w-full">
          {filteredItems.map((it: any, idx: number) => (
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
