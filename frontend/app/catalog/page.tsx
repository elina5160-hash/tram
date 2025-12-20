"use client"
import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import BottomBanner from "@/components/ui/bottom-banner"
import { useProducts } from "@/hooks/useProducts"
import { staticItems } from "@/data/staticItems"

import { ProductCard } from "@/components/ui/product-card"

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

        <div className="mt-3 grid grid-cols-2 gap-y-3 gap-x-2 justify-items-center mx-auto w-full">
          {filteredItems.map((it: any, idx: number) => (
            <ProductCard
              key={it.id}
              item={it}
              index={idx}
              isVisible={catalogEntered}
              onClick={() => router.push(`/item/${it.id}`)}
            />
          ))}
        </div>
        <div className="h-24 w-full" />
      </div>
      <BottomBanner />
    </div>
  )
}
