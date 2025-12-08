"use client"
import { useState } from "react"
import { getCart, removeFromCart } from "@/lib/cart"
import BackButton from "@/components/ui/back-button"
import BottomBanner from "@/components/ui/bottom-banner"

export default function Cart() {
  const [items, setItems] = useState<{ id: number; title: string }[]>(() => getCart())

  return (
    <div className="min-h-screen w-full bg-white flex flex-col justify-start relative pb-24">
      <BackButton />
      <div className="w-full max-w-5xl px-4 pt-6">
        {items.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-[35px] font-bold" style={{ color: "#000000" }}>
              В корзине пока пусто...
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {items.map((it) => (
              <div key={it.id} className="rounded-[16px] border border-gray-200 p-3 flex items-center justify-between">
                <span className="text-[14px]">{it.title}</span>
                <button
                  aria-label="Удалить"
                  onClick={() => {
                    removeFromCart(it.id)
                    const next = items.filter((x) => x.id !== it.id)
                    setItems(next)
                  }}
                  className="ml-3 text-[18px] font-bold text-[#232323] hover:text-black"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomBanner />
    </div>
  )
}
