"use client"
import { useState, useEffect, Suspense, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { addToCart, incrementQty } from "@/lib/cart"
import { getPriceValue, splitPrice } from "@/lib/price"
import { useProducts } from "@/hooks/useProducts"
import { AdminPanel } from "@/components/admin/AdminPanel"
import { staticItems } from "@/data/staticItems"

import { MenuDrawer } from "@/components/ui/menu-drawer"
import BottomBanner from "@/components/ui/bottom-banner"
import { ProductCard } from "@/components/ui/product-card"


import LazyVideo from "@/components/ui/lazy-video"

export default function HomeClient() {
  const router = useRouter()
  const { products: fetchedProducts } = useProducts()
  const [adminOpen, setAdminOpen] = useState(false)

  const items = useMemo(() => {
    if (fetchedProducts && fetchedProducts.length > 0) {
       const fetchedIds = new Set(fetchedProducts.map((p: any) => p.id))
       const missingStatic = staticItems.filter((s) => !fetchedIds.has(s.id))
       return [...fetchedProducts, ...missingStatic]
    }
    return staticItems
  }, [fetchedProducts])
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
    items.forEach((it: any) => (initial[it.id] = 0))
    return initial
  })
  const [pressedId, setPressedId] = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [catalogEntered, setCatalogEntered] = useState(false)
  const [clientId, setClientId] = useState<string | null>(null)
  type MenuView = "grid" | "delivery" | "payment" | "contacts" | "reviews" | "returns" | "about" | "offer" | "help" | "stores"
  const [menuView, setMenuView] = useState<MenuView>("grid")
  const menuItems: { label: string; key: MenuView }[] = [
    { label: "Доставка", key: "delivery" },
    { label: "Оплата", key: "payment" },
    { label: "Контакты", key: "contacts" },
    { label: "Отзывы", key: "reviews" },
    { label: "Возврат", key: "returns" },
    { label: "О нас", key: "about" },
    { label: "Оферта", key: "offer" },
    { label: "Помощь", key: "help" },
  ]
  

  

  useEffect(() => {
    const id = setTimeout(() => setCatalogEntered(true), 0)
    return () => clearTimeout(id)
  }, [])
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search)
      const ref = p.get("ref")
      if (ref) {
        window.localStorage.setItem("referral_code", ref)
      }
      
      let finalId = p.get("client_id")

      // Try Telegram WebApp
      if (!finalId && typeof window !== "undefined") {
          const tg = (window as any).Telegram?.WebApp
          if (tg) {
              tg.ready() // Notify Telegram we are ready
              if (tg.initDataUnsafe?.user?.id) {
                  finalId = String(tg.initDataUnsafe.user.id)
              }
          }
      }

      if (!finalId) {
          finalId = window.localStorage.getItem("user_id")
      }

      if (finalId) {
        setClientId(finalId)
        window.localStorage.setItem("user_id", finalId)
      }
    } catch {}
  }, [])

  const [adminClicks, setAdminClicks] = useState(0)
  const [lastClickTime, setLastClickTime] = useState(0)

  // ...
  
  return (
    <div className="min-h-[100dvh] w-full bg-[#FAFAFA] flex flex-col justify-start relative pb-56">
      <div className="w-full max-w-[420px] mx-auto px-4 pt-[calc(5rem+env(safe-area-inset-top))]">
        <div className="flex items-center justify-between relative z-50">
          <div 
            className="relative h-8 w-24 cursor-pointer active:opacity-70 select-none mt-2"
            onClick={() => setAdminOpen(true)}
          >
            <div 
              className="absolute inset-0 w-full h-full"
              style={{
                  background: "linear-gradient(160deg, #FFFEF5 0%, #DBCBB0 100%)",
                  maskImage: "url(/етра.png)",
                 WebkitMaskImage: "url(/етра.png)",
                 maskSize: "contain",
                 WebkitMaskSize: "contain",
                 maskRepeat: "no-repeat",
                 WebkitMaskRepeat: "no-repeat",
                 maskPosition: "left",
                  WebkitMaskPosition: "left",
                  // Градиент от белого/кремового к бежевому (как на фото)
                   // Четкая темная обводка + яркая тень для объема
                   filter: "drop-shadow(1px 0 0 #2A2A2A) drop-shadow(-1px 0 0 #2A2A2A) drop-shadow(0 1px 0 #2A2A2A) drop-shadow(0 -1px 0 #2A2A2A) drop-shadow(3px 6px 8px rgba(0,0,0,0.6))"
                 }}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              aria-label="Меню"
              onClick={() => setMenuOpen(true)}
              className="w-10 h-10 rounded-[12px] bg-white border border-gray-300 flex items-center justify-center"
            >
              <Image src="/Vector.png" alt="Меню" width={24} height={24} />
            </button>
          </div>
        </div>
        <div
          aria-label="Баннер"
          className="mt-3 h-[220px] relative rounded-[20px] overflow-hidden"
        >
          <div className="block w-full h-full relative">
            <Image src="/главная.png" alt="Афиша" fill className="object-contain rounded-[20px]" priority />
          </div>
        </div>

        <div className="mt-2 -mx-4 h-[34px] relative overflow-hidden bg-[#6C7476]">
          <div className="absolute inset-0 overflow-hidden flex items-center">
            <div className="marquee-track h-full flex items-center whitespace-nowrap" style={{ animationDuration: "12s" }}>
              <span className="pl-4 pr-8 text-white text-[12px]">Добро пожаловать в магазин ЭТРА🤗</span>
              <span className="pl-4 pr-8 text-white text-[12px]">Добро пожаловать в магазин ЭТРА🤗</span>
              <span className="pl-4 pr-8 text-white text-[12px]">Добро пожаловать в магазин ЭТРА🤗</span>
              <span className="pl-4 pr-8 text-white text-[12px]">Добро пожаловать в магазин ЭТРА🤗</span>
              <span className="pl-4 pr-8 text-white text-[12px]">Добро пожаловать в магазин ЭТРА🤗</span>
              <span className="pl-4 pr-8 text-white text-[12px]">Добро пожаловать в магазин ЭТРА🤗</span>
            </div>
          </div>
        </div>

 

        <section className="mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Скидки и акции</h2>
            <Link href="/catalog" className="text-[13px]" style={{ color: "#267A2D" }}>Смотреть все</Link>
          </div>
          <div className="mt-3 overflow-x-auto flex gap-3 snap-x snap-mandatory pb-2">
            {promos.map((it: any, idx: number) => (
              <div key={it.id} className="w-[151px] shrink-0">
                <ProductCard
                  item={it}
                  index={idx}
                  isVisible={catalogEntered}
                  onClick={() => router.push(`/item/${it.id}`)}
                  showCartButton
                />
              </div>
            ))}
          </div>
        </section>

        
        <section className="mt-6">
          <h2 className="text-[15px] font-semibold">Выбор покупателей</h2>
          <div className="mt-3 overflow-x-auto flex gap-3 snap-x snap-mandatory pb-2">
            {bests.map((it: any, idx: number) => (
              <div key={it.id} className="w-[151px] shrink-0">
                <ProductCard
                  item={it}
                  index={idx}
                  isVisible={catalogEntered}
                  onClick={() => router.push(`/item/${it.id}`)}
                  showCartButton
                />
              </div>
            ))}
          </div>
        </section>
        <section className="mt-6">
          <h2 className="text-[15px] font-semibold">Новинки</h2>
          <div className="mt-3 overflow-x-auto flex gap-3 snap-x snap-mandatory pb-2">
            {novelties.map((it: any, idx: number) => (
              <div key={it.id} className="w-[151px] shrink-0">
                <ProductCard
                  item={it}
                  index={idx}
                  isVisible={catalogEntered}
                  onClick={() => router.push(`/item/${it.id}`)}
                  showBadge
                  showCartButton
                />
              </div>
            ))}
          </div>
        </section>
        <div className="h-24 w-full" />
      </div>
      <MenuDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <BottomBanner />
      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
    </div>
  )
}
