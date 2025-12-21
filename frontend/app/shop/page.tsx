"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { getPriceValue } from "@/lib/price"
import { useProducts } from "@/hooks/useProducts"
import { staticItems } from "@/data/staticItems"

import { MenuDrawer } from "@/components/ui/menu-drawer"
import BottomBanner from "@/components/ui/bottom-banner"
import { ProductCard } from "@/components/ui/product-card"

export default function Shop() {
  const router = useRouter()
  const { products: fetchedProducts } = useProducts()

  const items = (fetchedProducts && fetchedProducts.length > 0 ? fetchedProducts : staticItems) as any[]

  const [catalogEntered, setCatalogEntered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setCatalogEntered(true), 0)
    return () => clearTimeout(id)
  }, [])
  
  return (
    <div className="min-h-[100dvh] w-full bg-white flex flex-col items-center justify-start relative pb-56">
      
      <div className="w-full max-w-[420px] mx-auto px-2 pt-[calc(1rem+env(safe-area-inset-top))]">
        <div className="flex items-center justify-between relative z-50">
          <h1 className="text-xl font-semibold">Каталог</h1>
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
        
        <section className="mt-4">
          <div className="mt-3 grid grid-cols-2 gap-2 pb-2">
            {items.map((it, idx) => (
              <ProductCard
                key={it.id}
                item={it}
                index={idx}
                isVisible={catalogEntered}
                onClick={() => router.push(`/item/${it.id}`)}
                showCartButton={true}
              />
            ))}
          </div>
        </section>
        
        <div className="h-24 w-full" />
      </div>
      <MenuDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <BottomBanner />
    </div>
  )
}
