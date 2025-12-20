"use client"
import { Suspense } from "react"
import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { HoverButton } from "@/components/ui/hover-button"
import { useRouter, useSearchParams } from "next/navigation"
import { addToCart, clearCart, getCart, incrementQty, removeFromCart, savePendingOrder } from "@/lib/cart"
import { getPriceValue } from "@/lib/price"
import { useProducts } from "@/hooks/useProducts"
import { staticItems } from "@/data/staticItems"
import BackButton from "@/components/ui/back-button"
import BottomBanner from "@/components/ui/bottom-banner"

import LazyVideo from "@/components/ui/lazy-video"

interface Product {
  id: number
  title: string
  price: number | string
  image: string
  [key: string]: any
}

function CartContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [items, setItems] = useState<{ id: number; title: string; qty: number }[]>(() => getCart())
  
  const { products: fetchedProducts, isLoading: isProductsLoading } = useProducts()
  
  // Form State
  const [email, setEmail] = useState<string>("")
  const [name, setName] = useState<string>("")
  const [phone, setPhone] = useState<string>("")
  const [cdek, setCdek] = useState<string>("")
  const [address, setAddress] = useState<string>("")
  const [promoCode, setPromoCode] = useState<string>("")
  
  // Logic State
  const [discountAmount, setDiscountAmount] = useState<number>(0)
  const [isCheckingPromo, setIsCheckingPromo] = useState<boolean>(false)
  const [clientId, setClientId] = useState<number | string>("")
  const [username, setUsername] = useState<string>("")
  
  // Validation State
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isFormLoaded, setIsFormLoaded] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Load saved data from LocalStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedData = localStorage.getItem("cart_form_data")
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData)
          if (parsed.email) setEmail(parsed.email)
          if (parsed.name) setName(parsed.name)
          if (parsed.phone) setPhone(parsed.phone)
          if (parsed.cdek) setCdek(parsed.cdek)
          if (parsed.address) setAddress(parsed.address)
        } catch (e) {
          console.error("Failed to parse saved form data", e)
        }
      }
      setIsFormLoaded(true)
    }
  }, [])

  // Save data to LocalStorage on change
  useEffect(() => {
    if (isFormLoaded && typeof window !== "undefined") {
      const data = { email, name, phone, cdek, address }
      localStorage.setItem("cart_form_data", JSON.stringify(data))
    }
  }, [email, name, phone, cdek, address, isFormLoaded])

  useEffect(() => {
    // Try to get Telegram user ID from URL (priority) or WebApp initData
    const idFromUrl = searchParams.get('client_id')
    if (idFromUrl) {
      setClientId(idFromUrl)
      if (typeof window !== "undefined") localStorage.setItem("user_id", idFromUrl)
    } else if (typeof window !== "undefined") {
      if ((window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id) {
        const user = (window as any).Telegram.WebApp.initDataUnsafe.user
        setClientId(user.id)
        if (user.username) setUsername(user.username)
        localStorage.setItem("user_id", String(user.id))
      } else {
        const stored = localStorage.getItem("user_id")
        if (stored) setClientId(stored)
      }
    }
  }, [searchParams])

  useEffect(() => {
    const update = () => setItems(getCart())
    window.addEventListener("cart:changed", update)
    window.addEventListener("storage", update)
    return () => {
      window.removeEventListener("cart:changed", update)
      window.removeEventListener("storage", update)
    }
  }, [])

  const catalog = useMemo<Product[]>(() => {
    if (fetchedProducts && fetchedProducts.length > 0) {
      // Merge fetched with static to ensure code-defined variants (like 7001, 1013) are available
      // even if they are not in the database.
      // Fetched products take precedence for same IDs.
      const fetchedIds = new Set(fetchedProducts.map((p: any) => p.id))
      const missingStatic = staticItems.filter((s) => !fetchedIds.has(s.id))
      return [...fetchedProducts, ...missingStatic]
    }
    // Only fallback to static items if we are NOT loading and have no products
    // This prevents flashing old prices during load
    if (!isProductsLoading) {
      return staticItems
    }
    return []
  }, [fetchedProducts, isProductsLoading])

  const priceMap = useMemo(() => {
    const m: Record<number, number> = {}
    catalog.forEach((c) => {
        // Handle both string prices ("3000 руб") and number prices (3000)
        let p = 0
        if (typeof c.price === 'number') {
            p = c.price
        } else {
            p = getPriceValue(c.price)
        }
        m[c.id] = p
    })
    return m
  }, [catalog])

  const total = useMemo(() => {
    return items.reduce((sum, it) => sum + (priceMap[it.id] || 0) * (it.qty || 1), 0)
  }, [items, priceMap])

  const totalQty = useMemo(() => {
    return items.reduce((sum, it) => sum + (it.qty || 1), 0)
  }, [items])

  useEffect(() => {
    // Debounce promo code check
    const checkPromo = async () => {
        if (!promoCode || promoCode.length < 3) {
            setDiscountAmount(0)
            return
        }

        const code = promoCode.trim().toUpperCase()
        
        setIsCheckingPromo(true)
        try {
            const res = await fetch('/api/promocode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            })
            const data = await res.json()
            
            if (data.valid) {
                if (data.type === 'percent') {
                    setDiscountAmount(Math.round(total * (data.value / 100)))
                } else if (data.type === 'fixed') {
                    setDiscountAmount(Number(data.value))
                }
            } else {
                // Fallback to old hardcoded logic
                if (code === "PROMO10" || code === "PRA10") setDiscountAmount(Math.round(total * 0.1))
                else if (code === "PROMO5" || code === "PRA5") setDiscountAmount(Math.round(total * 0.05))
                else if (code === "PROMO200" || code === "PRA200") setDiscountAmount(200)
                else setDiscountAmount(0)
            }
        } catch (e) {
            console.error("Error checking promo", e)
            setDiscountAmount(0)
        } finally {
            setIsCheckingPromo(false)
        }
    }

    const timer = setTimeout(checkPromo, 800) // Debounce 800ms
    return () => clearTimeout(timer)
  }, [promoCode, total])

  const totalWithDiscount = useMemo(() => Math.max(0, total - discountAmount), [total, discountAmount])

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

  function validateForm() {
    const newErrors: Record<string, string> = {}
    let isValid = true

    if (!name.trim()) {
      newErrors.name = "Пожалуйста, введите ваше имя"
      isValid = false
    }

    if (!phone.trim()) {
      newErrors.phone = "Пожалуйста, введите телефон"
      isValid = false
    } else if (!/^\+?[0-9\s\-\(\)]{10,}$/.test(phone)) {
      newErrors.phone = "Некорректный формат телефона"
      isValid = false
    }

    if (!email.trim()) {
      newErrors.email = "Пожалуйста, введите email"
      isValid = false
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Некорректный email"
      isValid = false
    }

    if (!cdek.trim() && !address.trim()) {
      newErrors.delivery = "Укажите адрес доставки или пункт СДЭК"
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  const handleClearData = () => {
    if (confirm("Вы уверены, что хотите очистить сохраненные данные формы?")) {
      setEmail("")
      setName("")
      setPhone("")
      setCdek("")
      setAddress("")
      setPromoCode("")
      localStorage.removeItem("cart_form_data")
      setErrors({})
    }
  }

  const inCartIds = new Set(items.map((it) => it.id))
  const suggestions = catalog.filter((c) => !inCartIds.has(c.id))

  return (
    <div className="min-h-[100dvh] w-full bg-white flex flex-col justify-start relative pb-[500px]">
      <BackButton />
      <div className="w-full max-w-[420px] mx-auto px-4 pt-[calc(4rem+env(safe-area-inset-top))]">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Корзина</h1>
          <button
            aria-label="Очистить корзину"
            onClick={() => {
              if (confirm("Очистить корзину?")) {
                clearCart()
                setItems([])
                router.push("/home")
              }
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
                        <LazyVideo src={info.image} className="w-full h-full object-cover" />
                      ) : (
                        <Image src={info.image} alt={it.title} fill className="object-cover" sizes="96px" />
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
                        className="w-7 h-7 rounded-[10px] bg-white border border-gray-300 text-[#232323] text-[14px] flex items-center justify-center shrink-0"
                      >
                        −
                      </button>
                      <span className="text-[14px] w-6 text-center">{it.qty}</span>
                      <button
                        aria-label="Увеличить"
                        onClick={() => incrementQty(it.id, 1)}
                        className="w-7 h-7 rounded-[10px] bg-white border border-gray-300 text-[#232323] text-[14px] flex items-center justify-center shrink-0"
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
                {/* Name */}
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); if (errors.name) setErrors({...errors, name: ""}) }}
                    className={`w-full rounded-[12px] bg-white border ${errors.name ? 'border-red-500' : 'border-gray-300'} px-3 py-2 text-[13px] transition-colors`}
                    placeholder="ФИО *"
                  />
                  {errors.name && (
                    <div className="text-red-500 text-[11px] mt-1 ml-1 animate-in slide-in-from-top-1 fade-in duration-200">
                      {errors.name}
                    </div>
                  )}
                </div>

                {/* Phone */}
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); if (errors.phone) setErrors({...errors, phone: ""}) }}
                    className={`w-full rounded-[12px] bg-white border ${errors.phone ? 'border-red-500' : 'border-gray-300'} px-3 py-2 text-[13px] transition-colors`}
                    placeholder="Телефон *"
                  />
                  {errors.phone && (
                    <div className="text-red-500 text-[11px] mt-1 ml-1 animate-in slide-in-from-top-1 fade-in duration-200">
                      {errors.phone}
                    </div>
                  )}
                </div>

                {/* Email */}
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors({...errors, email: ""}) }}
                    className={`w-full rounded-[12px] bg-white border ${errors.email ? 'border-red-500' : 'border-gray-300'} px-3 py-2 text-[13px] transition-colors`}
                    placeholder="Email *"
                  />
                  {errors.email && (
                    <div className="text-red-500 text-[11px] mt-1 ml-1 animate-in slide-in-from-top-1 fade-in duration-200">
                      {errors.email}
                    </div>
                  )}
                </div>

                {/* Delivery */}
                <div className="space-y-2">
                  <input
                    type="text"
                    value={cdek}
                    onChange={(e) => { setCdek(e.target.value); if (errors.delivery) setErrors({...errors, delivery: ""}) }}
                    className={`w-full rounded-[12px] bg-white border ${errors.delivery && !address ? 'border-red-500' : 'border-gray-300'} px-3 py-2 text-[13px] transition-colors`}
                    placeholder="Пункт выдачи СДЭК"
                  />
                  <div className="text-center text-[12px] text-gray-500">- или -</div>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => { setAddress(e.target.value); if (errors.delivery) setErrors({...errors, delivery: ""}) }}
                    className={`w-full rounded-[12px] bg-white border ${errors.delivery && !cdek ? 'border-red-500' : 'border-gray-300'} px-3 py-2 text-[13px] transition-colors`}
                    placeholder="Адрес доставки"
                  />
                  {errors.delivery && (
                    <div className="text-red-500 text-[11px] ml-1 animate-in slide-in-from-top-1 fade-in duration-200">
                      {errors.delivery}
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="w-full rounded-[12px] bg-white border border-gray-300 px-3 py-2 text-[13px]"
                  placeholder="Промокод"
                />
                <div className="flex items-center justify-between text-[13px]">
                  <span style={{ color: "#000000" }}>Скидка</span>
                  <span style={{ color: "#000000" }}>{discountAmount.toLocaleString("ru-RU")} руб.</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span style={{ color: "#000000" }}>К оплате</span>
                  <span style={{ color: "#000000" }}>{totalWithDiscount.toLocaleString("ru-RU")} руб.</span>
                </div>

                {/* Error Banner */}
                {Object.keys(errors).length > 0 && (
                   <div className="rounded-[10px] bg-red-50 border border-red-200 p-2 text-red-600 text-[12px] text-center">
                     Пожалуйста, заполните все обязательные поля корректно
                   </div>
                )}

                <HoverButton
                  className={`w-full rounded-[12px] border px-3 py-3 text-[13px] active:scale-105 bg-[#6800E9] text-white ${isProcessing ? 'opacity-70 pointer-events-none' : ''}`}
                  disabled={isProcessing}
                  onClick={async () => {
                    if (isProcessing) return
                    if (!validateForm()) {
                      // Log invalid attempt to server
                      try {
                        const payload = { type: 'VALIDATION_ERROR', message: 'User attempted payment with invalid data', data: { name, phone, email, cdek, address } }
                        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
                        navigator.sendBeacon('/api/log', blob)
                      } catch {}
                      
                      return
                    }

                    // Check for zero/negative amount (unless specific free items)
                    if (totalWithDiscount <= 0 && items.some(i => priceMap[i.id] > 0)) {
                         // Only alert if we are trying to pay 0 for paid items
                         // If it's a 100% discount, Robokassa might fail if amount is 0.
                         // Usually we should warn.
                         if (totalWithDiscount === 0) {
                             alert("Сумма к оплате 0 руб. Робокасса не поддерживает нулевые платежи. Пожалуйста, измените состав заказа или промокод.")
                             return
                         }
                    }

                    setIsProcessing(true)

                    const refCode = typeof window !== "undefined" ? (window.localStorage.getItem("referral_code") || "") : ""
                    const invoiceItems = items.map((it) => ({
                      id: it.id, // Include ID for repeat order functionality
                      name: it.title,
                      quantity: it.qty || 1,
                      cost: priceMap[it.id] || 0,
                      tax: "vat0",
                      paymentMethod: "full_prepayment",
                      paymentObject: "commodity",
                    }))
                    try {
                      const payload = { type: 'CHECKOUT_START', message: 'checkout started', data: { total: totalWithDiscount, items: invoiceItems.length } }
                      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
                      navigator.sendBeacon('/api/log', blob)
                    } catch {}

                    const invId = Math.floor(Date.now() / 1000)
                    const itemsForCreate = invoiceItems.map(it => ({
                      name: it.name,
                      quantity: it.quantity,
                      cost: it.cost,
                      tax: it.tax,
                      paymentMethod: it.paymentMethod,
                      paymentObject: it.paymentObject
                    }))

                    // Быстрый путь: классический интерфейс (локальная генерация URL) → мгновенный редирект
                    try {
                      const resClassic = await fetch("/api/robokassa/create", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          outSum: totalWithDiscount,
                          description: "Оплата заказа",
                          email,
                          customerInfo: {
                            name,
                            phone,
                            cdek,
                            address,
                            email,
                            client_id: clientId,
                            username,
                            order_time: new Date().toISOString()
                          },
                          promoCode,
                          refCode,
                          items: itemsForCreate,
                          invId
                        }),
                      })
                      let dataClassic: unknown = null
                      try { dataClassic = await resClassic.json() } catch {}
                      if (resClassic.ok && typeof dataClassic === 'object' && dataClassic && 'url' in dataClassic) {
                        const dc = dataClassic as { url: string; invId?: number | string }
                        try {
                          const payload = { type: 'CHECKOUT_REDIRECT', message: 'redirect to pay (classic)', data: { url: dc.url } }
                          const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
                          navigator.sendBeacon('/api/log', blob)
                        } catch {}
                        savePendingOrder(Number(dc.invId || invId))
                        const url = `/pay/confirm?url=${encodeURIComponent(dc.url)}&invId=${encodeURIComponent(String(dc.invId || invId))}`
                        router.push(url)
                        return
                      }
                    } catch {
                      // игнорируем, упадёт — попробуем InvoiceService ниже
                    }

                    // Резервный путь: InvoiceService (внешний вызов) → редирект
                    try {
                      const resInvoice = await fetch("/api/robokassa/invoice/create", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          outSum: totalWithDiscount,
                          description: "Оплата заказа",
                          email,
                          customerInfo: {
                            name,
                            phone,
                            cdek,
                            address,
                            email,
                            client_id: clientId,
                            username,
                            order_time: new Date().toISOString()
                          },
                          promoCode,
                          refCode,
                          invoiceItems,
                          invId
                        }),
                      })
                      let dataInvoice: unknown = null
                      try { dataInvoice = await resInvoice.json() } catch {}
                      if (resInvoice.ok && typeof dataInvoice === 'object' && dataInvoice && 'url' in dataInvoice) {
                        const di = dataInvoice as { url: string; invId?: number | string }
                        try {
                          const payload = { type: 'CHECKOUT_REDIRECT', message: 'redirect to pay (invoice)', data: { url: di.url } }
                          const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
                          navigator.sendBeacon('/api/log', blob)
                        } catch {}
                        savePendingOrder(Number(di.invId || invId))
                        const url = `/pay/confirm?url=${encodeURIComponent(di.url)}&invId=${encodeURIComponent(String(di.invId || invId))}`
                        router.push(url)
                        return
                      }
                      if (resInvoice.ok && typeof dataInvoice === 'object' && dataInvoice && 'raw' in dataInvoice && typeof (dataInvoice as { raw?: string }).raw === 'string') {
                        const di2 = dataInvoice as { raw?: string; invId?: number | string }
                        const m = (di2.raw as string).match(/https?:\/\/\S+/)
                        if (m) {
                          savePendingOrder(Number(di2.invId || invId))
                          const url = `/pay/confirm?url=${encodeURIComponent(m[0])}&invId=${encodeURIComponent(String(di2.invId || invId))}`
                          router.push(url)
                          return
                        }
                      }
                    } catch {}
                    
                    setIsProcessing(false)
                    alert("Не удалось получить ссылку на оплату. Попробуйте позже.")
                  }}
                >
                  {isProcessing ? "Подождите пожалуйста" : "К оформлению"}
                </HoverButton>
                
                {/* Clear Data Button */}
                {(name || phone || email || cdek || address) && (
                    <button 
                        onClick={handleClearData}
                        className="text-[12px] text-gray-400 underline text-center w-full"
                    >
                        Очистить форму
                    </button>
                )}
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
                          <LazyVideo src={s.image} className="w-full h-full object-cover" />
                        ) : (
                          <Image src={s.image} alt={s.title} fill className="object-cover" sizes="220px" />
                        )}
                      </div>
                      <div className="mt-2 text-[13px] font-semibold" style={{ color: "#000000" }}>{s.title}</div>
                      <div className="text-[12px] font-semibold" style={{ color: "#000000" }}>{formatRub(priceMap[s.id] || 0)}</div>
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
        
        {/* Extra spacing at the bottom to ensure content is not hidden behind fixed elements */}
        <div className="w-full h-[200px] bg-white shrink-0" />
      </div>
      <BottomBanner />
    </div>
  )
}

export default function Cart() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>}>
      <CartContent />
    </Suspense>
  )
}
