"use client"
import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { HoverButton } from "@/components/ui/hover-button"
import { useRouter } from "next/navigation"
import { addToCart, clearCart, getCart, incrementQty, removeFromCart } from "@/lib/cart"
import BackButton from "@/components/ui/back-button"
import BottomBanner from "@/components/ui/bottom-banner"

export default function Cart() {
  const router = useRouter()
  const [items, setItems] = useState<{ id: number; title: string; qty: number }[]>(() => getCart())
  const [email, setEmail] = useState<string>("")
  const [promoCode, setPromoCode] = useState<string>("")

  useEffect(() => {
    const update = () => setItems(getCart())
    window.addEventListener("cart:changed", update)
    window.addEventListener("storage", update)
    return () => {
      window.removeEventListener("cart:changed", update)
      window.removeEventListener("storage", update)
    }
  }, [])

  const catalog = useMemo(
    () => [
      { id: 1, title: "Закваска ПРАЭнзим", image: "/1.png", price: 3000 },
      { id: 2, title: "Курс Смена Миркобиома", image: "/2.png", price: 16000 },
      { id: 3, title: "Чистое Утро", image: "/4.png", price: 2400 },
      { id: 4, title: "Бифидум Фаната", image: "/5.png", price: 1200 },
      { id: 5, title: "Набор МЕГА КОМПЛЕКТ", image: "/главная4.png", price: 4400 },
      { id: 6, title: "Набор СЕЗОННЫЙ", image: "/главная4.png", price: 4200 },
      { id: 7, title: "Бак для приготовления энзимных напитков", image: "/2.png", price: 53000 },
      { id: 8, title: "Супер пробка", image: "/пробка.jpg", price: 950 },
      { id: 9, title: "Курс Чистка Микробиома", image: "/2.png", price: 16000 },
      { id: 10, title: "Сыродавленные масла", image: "/9.png", price: 0 },
    ],
    []
  )

  const priceMap = useMemo(() => {
    const m: Record<number, number> = {}
    catalog.forEach((c) => (m[c.id] = c.price))
    return m
  }, [catalog])

  const total = useMemo(() => {
    return items.reduce((sum, it) => sum + (priceMap[it.id] || 0) * (it.qty || 1), 0)
  }, [items, priceMap])

  const discount = useMemo(() => {
    const code = promoCode.trim().toUpperCase()
    if (!code) return 0
    if (code === "PROMO10" || code === "PRA10") return Math.round(total * 0.1)
    if (code === "PROMO5" || code === "PRA5") return Math.round(total * 0.05)
    if (code === "PROMO200" || code === "PRA200") return 200
    return 0
  }, [promoCode, total])

  const totalWithDiscount = useMemo(() => Math.max(0, total - discount), [total, discount])

  function formatRub(n: number) {
    return `${n.toLocaleString("ru-RU")} руб.`
  }

  const inCartIds = new Set(items.map((it) => it.id))
  const suggestions = catalog.filter((c) => !inCartIds.has(c.id))

  return (
    <div className="min-h-screen w-full bg-white flex flex-col justify-start relative pb-24">
      <BackButton />
      <button
        aria-label="Очистить корзину"
        onClick={() => {
          clearCart()
          setItems([])
          router.push("/home")
        }}
        className="absolute top-4 right-4 w-10 h-10 rounded-[12px] bg-white border border-gray-300 flex items-center justify-center"
      >
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 7H18" stroke="#E53935" strokeWidth="2" strokeLinecap="round" />
          <path d="M9 7V5C9 4.448 9.448 4 10 4H14C14.552 4 15 4.448 15 5V7" stroke="#E53935" strokeWidth="2" strokeLinecap="round" />
          <path d="M7 7L8 20C8 21.105 8.895 22 10 22H14C15.105 22 16 21.105 16 20L17 7" stroke="#E53935" strokeWidth="2" strokeLinecap="round" />
          <path d="M10 11V17" stroke="#E53935" strokeWidth="2" strokeLinecap="round" />
          <path d="M14 11V17" stroke="#E53935" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <div className="w-full max-w-5xl px-4 pt-6">
        {items.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-[35px] font-bold" style={{ color: "#000000" }}>
              В корзине пока пусто...
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((it) => {
              const info = catalog.find((c) => c.id === it.id)
              return (
                <div key={it.id} className="rounded-[16px] border border-gray-200 p-3 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-[12px] overflow-hidden bg-[#F1F1F1] flex items-center justify-center">
                    {info ? (
                      info.image.endsWith(".mp4") ? (
                        <video src={info.image} muted playsInline autoPlay loop className="w-full h-full object-contain" />
                      ) : (
                        <Image src={info.image} alt={it.title} width={56} height={56} className="object-cover" />
                      )
                    ) : (
                      <span className="text-[12px]">{it.title[0] || "?"}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium truncate" style={{ color: "#000000" }}>{it.title}</div>
                    <div className="text-[12px]" style={{ color: "#8A8A8A" }}>{formatRub((priceMap[it.id] || 0) * (it.qty || 1))}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      aria-label="Уменьшить"
                      onClick={() => incrementQty(it.id, -1)}
                      className="w-9 h-9 rounded-[12px] bg-white border border-gray-300 text-[#232323] text-[18px] flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="text-[14px] w-6 text-center">{it.qty}</span>
                    <button
                      aria-label="Увеличить"
                      onClick={() => incrementQty(it.id, 1)}
                      className="w-9 h-9 rounded-[12px] bg-white border border-gray-300 text-[#232323] text-[18px] flex items-center justify-center"
                    >
                      +
                    </button>
                    <button
                      aria-label="Удалить"
                      onClick={() => removeFromCart(it.id)}
                      className="ml-2 w-9 h-9 rounded-[12px] bg-white border border-gray-300 text-[#232323] text-[16px] flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )
            })}

            <div className="mt-2 rounded-[16px] border border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <div className="text-[14px]" style={{ color: "#000000" }}>Итог</div>
                <div className="text-[16px] font-semibold" style={{ color: "#000000" }}>{formatRub(total)}</div>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-[12px] bg-white border border-gray-300 px-3 py-2 text-[13px]"
                  placeholder="Email для квитанции"
                />
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="w-full rounded-[12px] bg-white border border-gray-300 px-3 py-2 text-[13px]"
                  placeholder="Промокод"
                />
                <div className="flex items-center justify-between text-[13px]">
                  <span style={{ color: "#000000" }}>Скидка</span>
                  <span style={{ color: "#000000" }}>{discount.toLocaleString("ru-RU")} руб.</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span style={{ color: "#000000" }}>К оплате</span>
                  <span style={{ color: "#000000" }}>{totalWithDiscount.toLocaleString("ru-RU")} руб.</span>
                </div>
                <HoverButton
                  className="w-full rounded-[12px] border px-3 py-3 text-[13px] sm:text-[14px] active:scale-105 bg-[#6800E9] text-white"
                  onClick={async () => {
                    const refCode = typeof window !== "undefined" ? (window.localStorage.getItem("referral_code") || "") : ""
                    const res = await fetch("/api/robokassa/create", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ outSum: totalWithDiscount, description: "Оплата заказа", email, promoCode, refCode }),
                    })
                    const data = await res.json()
                    if (data?.url) {
                      window.location.href = data.url
                    }
                  }}
                >
                  К оформлению
                </HoverButton>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center gap-2 text-[14px] font-medium" style={{ color: "#000000" }}>
                <span>Хотите что-то еще?</span>
                <svg className="w-4 h-4" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8" cy="8" r="8" fill="#FFCC00" />
                  <text x="8" y="11" textAnchor="middle" fontSize="11" fill="#000000">?</text>
                </svg>
              </div>
              <div className="mt-2 overflow-x-auto">
                <div className="flex items-stretch gap-3 min-w-full">
                  {suggestions.map((s) => (
                    <div key={s.id} className="min-w-[220px] rounded-[16px] border border-gray-200 p-3 bg-white flex flex-col">
                      <div className="relative w-full h-[120px] rounded-[12px] overflow-hidden bg-[#F1F1F1]">
                        {s.image.endsWith(".mp4") ? (
                          <video src={s.image} muted playsInline autoPlay loop className="w-full h-full object-contain" />
                        ) : (
                          <Image src={s.image} alt={s.title} fill className="object-cover" />
                        )}
                      </div>
                      <div className="mt-2 text-[13px] font-semibold" style={{ color: "#000000" }}>{s.title}</div>
                      <div className="text-[12px]" style={{ color: "#8A8A8A" }}>{formatRub(s.price)}</div>
                      <button
                        className="mt-2 rounded-[12px] bg-white border border-gray-300 px-3 py-2 text-[13px] active:scale-105"
                        onClick={() => addToCart({ id: s.id, title: s.title, qty: 1 })}
                      >
                        Добавить
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <BottomBanner />
    </div>
  )
}
