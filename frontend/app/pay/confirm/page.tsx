"use client"
import { useMemo, Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import BackButton from "@/components/ui/back-button"
import BottomBanner from "@/components/ui/bottom-banner"
import { HoverButton } from "@/components/ui/hover-button"
import { getCart, clearCart } from "@/lib/cart"
import { getPriceValue } from "@/lib/price"
import { getSupabaseClient } from "@/lib/supabase"
import { useProducts } from "@/hooks/useProducts"
import { staticItems } from "@/data/staticItems"

type ParsedItem = { name?: string; sum?: number; quantity?: number }
type TelegramWindow = { Telegram?: { WebApp?: { openLink?: (url: string) => void } } }

function ConfirmContent() {
  const params = useSearchParams()
  const router = useRouter()
  const payUrl = params.get("url") || ""
  const invId = params.get("invId") || ""
  const outSumSuccess = params.get("OutSum") || ""
  const invIdSuccess = params.get("InvId") || ""
  const signatureSuccess = params.get("SignatureValue") || ""
  const urlDiscountAmount = Number(params.get("discountAmount") || 0)
  const urlOutSum = Number(params.get("outSum") || 0)

  const [isPaid, setIsPaid] = useState(false)
  const [statusText, setStatusText] = useState("")
  const [orderData, setOrderData] = useState<any>(null)

  const items = useMemo(() => getCart(), [])
  
  const { products: fetchedProducts, isLoading: isProductsLoading } = useProducts()

  // Fetch order data immediately
  useEffect(() => {
    if (!invId) return
    const fetchOrder = async () => {
        try {
            const client = getSupabaseClient()
            if (!client) return
            const { data } = await client
                .from('orders')
                .select('*')
                .eq('id', Number(invId))
                .single()
            
            if (data) {
                setOrderData(data)
            }
        } catch (e) {
            console.error("Failed to fetch order", e)
        }
    }
    fetchOrder()
  }, [invId])

  const catalog = useMemo(() => {
    if (fetchedProducts && fetchedProducts.length > 0) {
      const fetchedIds = new Set(fetchedProducts.map((p: any) => p.id))
      const missingStatic = staticItems.filter((s) => !fetchedIds.has(s.id))
      return [...fetchedProducts, ...missingStatic]
    }
    // Only fallback to static items if we are NOT loading and have no products
    // or if we just want to show something immediately (static items are usually safe)
    return staticItems
  }, [fetchedProducts, isProductsLoading])

  const priceMap = useMemo(() => {
    const m: Record<number, number> = {}
    catalog.forEach((c: any) => {
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

  const parsed = useMemo(() => {
    try {
      if (!payUrl) return { items: [], out: 0 }
      const u = new URL(payUrl)
      const r = u.searchParams.get("Receipt")
      const out = Number(u.searchParams.get("OutSum") || 0)
      if (!r) return { items: [], out }
      const json = JSON.parse(r) as { items?: ParsedItem[] }
      const arr: ParsedItem[] = Array.isArray(json.items) ? json.items as ParsedItem[] : []
      return { items: arr, out }
    } catch {
      return { items: [], out: 0 }
    }
  }, [payUrl])

  const total = items.reduce((sum, it) => sum + (priceMap[Number(it.id)] || 0) * (it.qty || 1), 0)
  const totalParsed = parsed.items.reduce((s: number, it: ParsedItem) => s + Number(it.sum || 0), 0) || parsed.out

  // Derived from orderData if available
  const displayItems = useMemo(() => {
    if (orderData?.items && Array.isArray(orderData.items)) {
        return orderData.items.map((it: any) => ({
            id: it.id || 0, // might be missing in invoice items
            title: it.name,
            qty: it.quantity,
            price: it.cost
        }))
    }
    return items.map(it => ({
        id: it.id,
        title: it.title,
        qty: it.qty,
        price: priceMap[Number(it.id)] || 0
    }))
  }, [orderData, items, priceMap])

  const displayTotal = orderData ? Number(orderData.total_amount) : (urlOutSum > 0 ? urlOutSum : total)
  const displayDiscount = orderData?.customer_info?.discount_amount ? Number(orderData.customer_info.discount_amount) : urlDiscountAmount
  const displaySubtotal = displayTotal + displayDiscount

  useEffect(() => {
    const hasSuccessParams = !!(outSumSuccess && invIdSuccess && signatureSuccess)
    if (!hasSuccessParams) return
    const run = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search)
        const qs = new URLSearchParams({ OutSum: outSumSuccess, InvId: invIdSuccess, SignatureValue: signatureSuccess })
        
        // Add all Shp_ parameters
        searchParams.forEach((value, key) => {
          if (key.startsWith('Shp_')) {
            qs.append(key, value)
          }
        })

        const res = await fetch(`/api/robokassa/result?${qs.toString()}`, { method: "GET" })
        if (res.ok) {
          clearCart()
          setIsPaid(true)
          setStatusText(`Оплата подтверждена. Заказ № ${invIdSuccess}`)
          try {
            const text = [
              `<b>Оплачен заказ № ${invIdSuccess}</b>`,
              `Сумма: ${Number(outSumSuccess).toLocaleString('ru-RU')} руб.`,
            ].join('\n')
            await fetch('/api/telegram/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text })
            })
          } catch {}
        } else {
          setStatusText("Оплата подтверждена, но подтверждение на сервере не прошло. Свяжитесь с поддержкой.")
        }
      } catch {
        setStatusText("Ошибка при подтверждении оплаты. Свяжитесь с поддержкой.")
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outSumSuccess, invIdSuccess, signatureSuccess])

  useEffect(() => {
    if (!invId || isPaid) return
    const client = getSupabaseClient()
    if (!client) return
    let stopped = false
    let attempts = 0
    const tick = async () => {
      if (stopped) return
      attempts += 1
      try {
        const { data } = await client.from('orders').select('status').eq('id', Number(invId)).single()
        if (data && (data.status === 'Оплачен' || data.status === 'paid')) {
          clearCart()
          setIsPaid(true)
          setStatusText(`Оплата подтверждена. Заказ № ${invId}`)
          stopped = true
          return
        }
      } catch {}
      if (attempts < 30) setTimeout(tick, 2000)
    }
    tick()
    return () => { stopped = true }
  }, [invId, isPaid])

  return (
    <div className="min-h-[100dvh] w-full bg-white flex flex-col justify-start relative pb-24">
      <BackButton />
      <div className="w-full max-w-[420px] mx-auto px-4 pt-[calc(7.5rem+env(safe-area-inset-top))]">
        <h1 className="text-xl font-bold mb-4">Подтверждение заказа</h1>
        <div className="mt-2 text-[13px] text-[#232323]">№ {invId || "—"}</div>

        {items.length === 0 && parsed.items.length === 0 && !orderData ? (
          <div className="mt-6 text-[14px]">Ваша корзина пуста.</div>
        ) : displayItems.length > 0 ? (
          <div className="mt-4 space-y-3">
            {displayItems.map((it: any, idx: number) => (
              <div key={it.id || idx} className="rounded-[12px] border border-gray-200 p-3 flex items-center justify-between">
                <div className="text-[13px] font-medium truncate" style={{ color: "#000000" }}>{it.title}</div>
                <div className="text-[12px]" style={{ color: "#000000" }}>{it.price.toLocaleString("ru-RU")} руб. × {it.qty}</div>
              </div>
            ))}
            
            {displayDiscount > 0 && (
                <div className="rounded-[12px] border border-gray-200 p-3 flex items-center justify-between text-green-600">
                    <span className="text-[13px] font-medium">Скидка</span>
                    <span className="text-[13px] font-medium">-{displayDiscount.toLocaleString("ru-RU")} руб.</span>
                </div>
            )}

            <div className="rounded-[12px] border border-gray-200 p-3 flex items-center justify-between">
              <span className="text-[13px] font-semibold" style={{ color: "#000000" }}>Итого</span>
              <span className="text-[13px] font-semibold" style={{ color: "#000000" }}>{displayTotal.toLocaleString("ru-RU")} руб.</span>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {parsed.items.map((it: ParsedItem, idx: number) => (
              <div key={idx} className="rounded-[12px] border border-gray-200 p-3 flex items-center justify-between">
                <div className="text-[13px] font-medium truncate" style={{ color: "#000000" }}>{String(it.name || "Товар")}</div>
                <div className="text-[12px]" style={{ color: "#000000" }}>{Number(it.sum || 0).toLocaleString("ru-RU")} × {it.quantity || 1}</div>
              </div>
            ))}
            <div className="rounded-[12px] border border-gray-200 p-3 flex items-center justify-between">
              <span className="text-[13px] font-semibold" style={{ color: "#000000" }}>Итого</span>
              <span className="text-[13px] font-semibold" style={{ color: "#000000" }}>{Number(totalParsed || 0).toLocaleString("ru-RU")} руб.</span>
            </div>
          </div>
        )}

        {isPaid && (
          <div className="mt-4 rounded-[12px] border border-green-300 bg-green-50 p-3 text-[13px]" style={{ color: "#0F5132" }}>
            {statusText || "Оплата подтверждена"}
          </div>
        )}
        <div className="mt-6 flex flex-col gap-2">
          <HoverButton
            className="w-full rounded-[12px] bg-[#6800E9] text-white px-4 py-3 text-[13px]"
            aria-disabled={!payUrl || isPaid}
            onClick={() => {
              if (!payUrl) {
                alert("Ссылка на оплату не получена. Вернитесь в корзину и попробуйте ещё раз.")
                router.push("/cart")
                return
              }
              try {
                const tw = (typeof window !== "undefined" ? (window as unknown as TelegramWindow) : undefined)
                const openLink = tw?.Telegram?.WebApp?.openLink
                if (typeof openLink === "function") {
                  openLink(payUrl)
                } else {
                  window.open(payUrl, "_blank", "noopener,noreferrer")
                }
              } catch {
                window.open(payUrl, "_blank", "noopener,noreferrer")
              }
            }}
          >
            Оплатить
          </HoverButton>
          <HoverButton
            className="w-full rounded-[12px] bg:white text-[#232323] border px-4 py-3 text-[13px]"
            onClick={() => router.push("/cart")}
          >
            Вернуться в корзину
          </HoverButton>
          {typeof window !== "undefined" && !!((window as unknown as TelegramWindow).Telegram?.WebApp) && (
            <div className="text-[12px] text-gray-600 text-center">Если платёж недоступен внутри Telegram, откроем ссылку в браузере.</div>
          )}
        </div>
      </div>
      <BottomBanner />
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>}>
      <ConfirmContent />
    </Suspense>
  )
}
