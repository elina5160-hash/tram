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
      { id: 1, title: "Закваска ПРАЭнзим", image: "/1500x2000 3-4 Zakvaska.mp4", price: 3000 },
      { id: 2, title: "🎉 АКЦИЯ ДВА КУРСА смены микробиома 🎉", image: "/афиша.png", price: 24000 },
      { id: 3, title: "💫 Чистое утро", image: "/4.png", price: 2400 },
      { id: 4, title: "БифидумФаната﻿🍊﻿", image: "/ETRA Bottle Fanta2.mp4", price: 1200 },
      { id: 6, title: "Набор СЕЗОННЫЙ", image: "/главная4.png", price: 4200 },
      { id: 7, title: "Бак для приготовления энзимных напитков", image: "/2.png", price: 53000 },
      { id: 8, title: "Супер пробка", image: "/пробка.jpg", price: 950 },
      { id: 9, title: "☀️ Курс Чистка Микробиома 🌛", image: "/афиша.png", price: 16000 },
      { id: 10, title: "Сыродавленные масла", image: "/9.png", price: 0 },
      { id: 11, title: "Энзимный напиток Еловый", image: "/Eloviy PROMO strz 2.mp4", price: 750 },
      { id: 12, title: "Энзимный напиток Детский", image: "/Etra PROMO strz Detskii.mp4", price: 750 },
      { id: 13, title: "Энзимный напиток Хмель", image: "/хмель1.png", price: 900 },
      { id: 1013, title: "Энзимный напиток Хмель 0.5л", image: "/хмель1.png", price: 490 },
      { id: 14, title: "Энзимный напиток Розлинг", image: "/розлинг1.jpg", price: 800 },
      { id: 1014, title: "Энзимный напиток Розлинг 0.5л", image: "/розлинг1.jpg", price: 490 },
      { id: 15, title: "Полезный энергетик", image: "/2 51.png", price: 750 },
      { id: 1015, title: "Полезный энергетик 0.5л", image: "/2 51.png", price: 490 },
      { id: 16, title: "Энзимный напиток Рислинг", image: "/рислинг1.png", price: 800 },
      { id: 17, title: "Энзимный напиток Апельсин", image: "/Etra PROMO ORANGE-2.mp4", price: 800 },
      { id: 18, title: "Антипаразитарные пребиотики ПАРАЗИТОФФ", image: "/PARAZITOFF 1500x2667 9-16 PROMO-4_1.mp4", price: 750 },
      { id: 19, title: "Каша ЭТРАсУТРА 200гр", image: "/KASHA PROMO Demo.mp4", price: 750 },
      { id: 1019, title: "Каша ЭТРАсУТРА 2кг", image: "/KASHA PROMO Demo.mp4", price: 6300 },
      { id: 20, title: "НАБОР СЕМЕЙНЫЙ", image: "/Набор семейный.png", price: 4200 },
      { id: 21, title: "Набор для бани", image: "/баня.PNG", price: 4200 },
      { id: 22, title: "Супер Квас", image: "/1500x2000 3-4 SK.mp4", price: 750 },
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

  const totalQty = useMemo(() => {
    return items.reduce((sum, it) => sum + (it.qty || 1), 0)
  }, [items])

  const discount = useMemo(() => {
    const code = promoCode.trim().toUpperCase()
    if (!code) return 0
    if (code === "PROMO10" || code === "PRA10") return Math.round(total * 0.1)
    if (code === "PROMO5" || code === "PRA5") return Math.round(total * 0.05)
    if (code === "PROMO200" || code === "PRA200") return 200
    return 0
  }, [promoCode, total])

  const totalWithDiscount = useMemo(() => Math.max(0, total - discount), [total, discount])

  function declOfNum(n: number, text_forms: string[]) {
    n = Math.abs(n) % 100
    const n1 = n % 10
    if (n > 10 && n < 20) { return text_forms[2] }
    if (n1 > 1 && n1 < 5) { return text_forms[1] }
    if (n1 === 1) { return text_forms[0] }
    return text_forms[2]
  }

  function formatRub(n: number) {
    return `${n.toLocaleString("ru-RU")} руб.`
  }

  const inCartIds = new Set(items.map((it) => it.id))
  const suggestions = catalog.filter((c) => !inCartIds.has(c.id))

  return (
    <div className="min-h-screen w-full bg-white flex flex-col justify-start relative pb-24">
      <BackButton />
      <div className="w-full max-w-[420px] mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Корзина</h1>
          <button
            aria-label="Очистить корзину"
            onClick={() => {
              clearCart()
              setItems([])
              router.push("/home")
            }}
            className="w-10 h-10 rounded-[12px] bg-white border border-gray-300 flex items-center justify-center"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 7H18" stroke="#E53935" strokeWidth="2" strokeLinecap="round" />
              <path d="M9 7V5C9 4.448 9.448 4 10 4H14C14.552 4 15 4.448 15 5V7" stroke="#E53935" strokeWidth="2" strokeLinecap="round" />
              <path d="M7 7L8 20C8 21.105 8.895 22 10 22H14C15.105 22 16 21.105 16 20L17 7" stroke="#E53935" strokeWidth="2" strokeLinecap="round" />
              <path d="M10 11V17" stroke="#E53935" strokeWidth="2" strokeLinecap="round" />
              <path d="M14 11V17" stroke="#E53935" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
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
                <div key={it.id} className="rounded-[16px] border border-gray-200 p-3 flex items-start gap-3 relative">
                  <div className="w-24 h-24 shrink-0 rounded-[12px] overflow-hidden bg-[#F1F1F1] flex items-center justify-center relative">
                    {info ? (
                      info.image.endsWith(".mp4") ? (
                        <video muted playsInline autoPlay loop className="w-full h-full object-cover">
                          <source src={info.image} type="video/mp4" />
                        </video>
                      ) : (
                        <Image src={info.image} alt={it.title} fill className="object-cover" />
                      )
                    ) : (
                      <span className="text-[12px]">{it.title[0] || "?"}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="text-[14px] font-medium leading-tight" style={{ color: "#000000" }}>{it.title}</div>
                    <div className="text-[12px] font-bold" style={{ color: "#000000" }}>{formatRub((priceMap[it.id] || 0) * (it.qty || 1))}</div>
                    <div className="flex items-center gap-2 mt-auto">
                      <button
                        aria-label="Уменьшить"
                        onClick={() => incrementQty(it.id, -1)}
                        className="w-8 h-8 rounded-[12px] bg-white border border-gray-300 text-[#232323] text-[16px] flex items-center justify-center"
                      >
                        −
                      </button>
                      <span className="text-[14px] w-6 text-center">{it.qty}</span>
                      <button
                        aria-label="Увеличить"
                        onClick={() => incrementQty(it.id, 1)}
                        className="w-8 h-8 rounded-[12px] bg-white border border-gray-300 text-[#232323] text-[16px] flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <button
                    aria-label="Удалить"
                    onClick={() => removeFromCart(it.id)}
                    className="shrink-0 w-8 h-8 rounded-[12px] bg-white border border-gray-300 text-[#232323] text-[16px] flex items-center justify-center self-center"
                  >
                    ×
                  </button>
                </div>
              )
            })}

            <div className="mt-2 rounded-[16px] border border-gray-200 p-3">
              <div className="flex flex-col gap-1 mb-2">
                <div className="text-[16px] font-bold" style={{ color: "#000000" }}>Итого</div>
                <div className="text-[13px]" style={{ color: "#000000" }}>
                  {totalQty} {declOfNum(totalQty, ["товар", "товара", "товаров"])} на сумму {formatRub(total)}
                </div>
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
                  className="w-full rounded-[12px] border px-3 py-3 text-[13px] active:scale-105 bg-[#6800E9] text-white"
                  onClick={async () => {
                    const refCode = typeof window !== "undefined" ? (window.localStorage.getItem("referral_code") || "") : ""
                    const invoiceItems = items.map((it) => ({
                      name: it.title,
                      quantity: it.qty || 1,
                      cost: priceMap[it.id] || 0,
                      tax: "vat0",
                      paymentMethod: "full_prepayment",
                      paymentObject: "commodity",
                    }))
                    let res: Response
                    try {
                      res = await fetch("/api/robokassa/invoice/create", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                          outSum: totalWithDiscount, 
                          description: "Оплата заказа", 
                          email, 
                          promoCode, 
                          refCode,
                          invoiceItems,
                          invId: Date.now()
                        }),
                      })
                    } catch (e) {
                      alert("Ошибка соединения. Проверьте интернет и попробуйте ещё раз.")
                      return
                    }
                    let data: unknown = null
                    try {
                      data = await res.json()
                    } catch {}
                    if (res.ok && typeof data === 'object' && data && 'url' in data) {
                      const d = data as { url: string; invId?: number | string }
                      const url = `/pay/confirm?url=${encodeURIComponent(d.url)}&invId=${encodeURIComponent(String(d.invId || ''))}`
                      router.push(url)
                      return
                    }
                    if (!res.ok) {
                      type ErrorData = { error?: string; message?: string }
                      const msg = typeof data === 'object' && data && ('error' in data || 'message' in data)
                        ? ((data as ErrorData).error || (data as ErrorData).message || "Ошибка создания счёта Robokassa")
                        : "Ошибка создания счёта Robokassa"
                      alert(msg)
                      return
                    }
                    alert("Не удалось получить ссылку на оплату. Попробуйте позже.")
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
                          <video muted playsInline autoPlay loop className="w-full h-full object-cover">
                            <source src={s.image} type="video/mp4" />
                          </video>
                        ) : (
                          <Image src={s.image} alt={s.title} fill className="object-cover" />
                        )}
                      </div>
                      <div className="mt-2 text-[13px] font-semibold" style={{ color: "#000000" }}>{s.title}</div>
                      <div className="text-[12px] font-semibold" style={{ color: "#000000" }}>{formatRub(s.price)}</div>
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
