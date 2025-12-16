"use client"
import { useMemo, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import BackButton from "@/components/ui/back-button"
import BottomBanner from "@/components/ui/bottom-banner"
import { HoverButton } from "@/components/ui/hover-button"
import { getCart } from "@/lib/cart"
import products from "@/data/products.json"
import { getPriceValue } from "@/lib/price"

function ConfirmContent() {
  const params = useSearchParams()
  const router = useRouter()
  const payUrl = params.get("url") || ""
  const invId = params.get("invId") || ""

  const items = useMemo(() => getCart(), [])
  const parsed = useMemo(() => {
    try {
      if (!payUrl) return { items: [], out: 0 }
      const u = new URL(payUrl)
      const r = u.searchParams.get("Receipt")
      const out = Number(u.searchParams.get("OutSum") || 0)
      if (!r) return { items: [], out }
      const json = JSON.parse(r)
      const arr = Array.isArray(json.items) ? json.items : []
      return { items: arr, out }
    } catch {
      return { items: [], out: 0 }
    }
  }, [payUrl])
  const catalogPrices: Record<number, number> = {
    1: 3000,
    2: 24000,
    3: 2400,
    4: 1200,
    6: 4200,
    7: 53000,
    8: 950,
    9: 16000,
    10: 0,
    11: 750,
    12: 750,
    13: 900,
    1013: 490,
    14: 800,
    1014: 490,
    15: 750,
    1015: 490,
    16: 800,
    17: 800,
    18: 750,
    19: 750,
    1019: 6300,
    20: 4200,
    21: 4200,
    22: 750,
    999: 5,
  }

  try {
    const priceFromProducts: Record<number, number> = {}
    ;(products as any[]).forEach((p: any) => {
      const v = getPriceValue(p.price || "")
      if (typeof p.id === "number" && v > 0) priceFromProducts[p.id] = v
    })
    Object.keys(priceFromProducts).forEach((k) => {
      const id = Number(k)
      if (!catalogPrices[id]) catalogPrices[id] = priceFromProducts[id]
    })
  } catch {}

  const total = items.reduce((sum, it) => sum + (catalogPrices[Number(it.id)] || 0) * (it.qty || 1), 0)
  const totalParsed = parsed.items.reduce((s: number, it: any) => s + Number(it.sum || 0), 0) || parsed.out

  return (
    <div className="min-h-screen w-full bg-white flex flex-col justify-start relative pb-56">
      <BackButton />
      <div className="w-full max-w-[420px] mx-auto px-4 pt-16">
        <h1 className="text-xl font-semibold">Подтверждение заказа</h1>
        <div className="mt-2 text-[13px] text-[#232323]">№ {invId || "—"}</div>

        {items.length === 0 && parsed.items.length === 0 ? (
          <div className="mt-6 text-[14px]">Ваша корзина пуста.</div>
        ) : items.length > 0 ? (
          <div className="mt-4 space-y-3">
            {items.map((it) => (
              <div key={it.id} className="rounded-[12px] border border-gray-200 p-3 flex items-center justify-between">
                <div className="text-[13px] font-medium truncate" style={{ color: "#000000" }}>{it.title}</div>
                <div className="text-[12px]" style={{ color: "#000000" }}>{(catalogPrices[Number(it.id)] || 0).toLocaleString("ru-RU")} × {it.qty}</div>
              </div>
            ))}
            <div className="rounded-[12px] border border-gray-200 p-3 flex items-center justify-between">
              <span className="text-[13px] font-semibold" style={{ color: "#000000" }}>Итого</span>
              <span className="text-[13px] font-semibold" style={{ color: "#000000" }}>{total.toLocaleString("ru-RU")} руб.</span>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {parsed.items.map((it: any, idx: number) => (
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

        <div className="mt-6 flex flex-col gap-2">
          <HoverButton
            className="w-full rounded-[12px] bg-[#6800E9] text-white px-4 py-3 text-[13px]"
            aria-disabled={!payUrl}
            onClick={() => {
              if (!payUrl) {
                alert("Ссылка на оплату не получена. Вернитесь в корзину и попробуйте ещё раз.")
                router.push("/cart")
                return
              }
              window.location.href = payUrl
            }}
          >
            Оплатить
          </HoverButton>
          <HoverButton
            className="w-full rounded-[12px] bg-white text-[#232323] border px-4 py-3 text-[13px]"
            onClick={() => router.push("/cart")}
          >
            Вернуться в корзину
          </HoverButton>
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
