"use client"

import { useEffect, useState, Suspense } from "react"
import { HoverButton } from "@/components/ui/hover-button"
import { getPendingOrder, savePendingOrder, clearCart } from "@/lib/cart"
import { CheckCircle2, Loader2, X } from "lucide-react"
import { useSearchParams } from "next/navigation"

function SuccessPageContent() {
  const searchParams = useSearchParams()
  const [isTelegram, setIsTelegram] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [orderId, setOrderId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Check if running inside Telegram WebApp
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initData) {
        setIsTelegram(true)
    }

    // Check for pending order from LocalStorage OR URL
    let pendingId = getPendingOrder()
    const invIdParam = searchParams.get("InvId") || searchParams.get("OrderId")
    
    // If no local pending order, try to recover from URL
    if (!pendingId && invIdParam) {
        pendingId = Number(invIdParam)
    }

    const shpClient = searchParams.get("Shp_client")

    if (pendingId) {
      setOrderId(pendingId)
      setShowPopup(true)
      handleOrderSync(pendingId, shpClient)
    }
  }, [searchParams])

  const handleOrderSync = async (id: number, urlClientId?: string | null) => {
    setIsLoading(true)
    try {
      // 1. Get Client ID
      let clientId = ""
      if (typeof window !== "undefined") {
         const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user
         if (tgUser?.id) clientId = String(tgUser.id)
         else clientId = localStorage.getItem("user_id") || ""
      }
      
      // Fallback to URL param if local detection failed
      if (!clientId && urlClientId) {
          clientId = urlClientId
      }

      // 2. Sync with backend
      if (clientId) {
          await fetch('/api/orders/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: id, clientId })
          })
      }

      // 3. Clear local state (moved to finally to ensure execution)
      // clearCart()
      // savePendingOrder(0) // Clear pending order
      
      // if (typeof window !== "undefined") {
      //    window.localStorage.removeItem("pending_order_id")
      // }
    } catch (e) {
      console.error("Failed to sync order", e)
    } finally {
      // Always clear cart on success page, assuming user paid
      clearCart()
      savePendingOrder(0)
      if (typeof window !== "undefined") {
         window.localStorage.removeItem("pending_order_id")
      }
      setIsLoading(false)
    }
  }

  const handleReturn = () => {
      // Always redirect to the Mini App home or profile
      // Using window.location.href ensures we break out of any potential iframe or redirect logic
      if (typeof window !== "undefined") {
          window.location.href = "https://t.me/KonkursEtraBot/app"
      }
  }

  return (
    <div className="min-h-screen w-full bg-white flex flex-col justify-start relative pb-24">
      <div className="w-full max-w-[420px] mx-auto px-4 pt-6">
        <h1 className="text-xl font-semibold">Оплата прошла успешно</h1>
        <div className="mt-4">
            <HoverButton 
                onClick={handleReturn}
                className="rounded-[12px] bg-[#6800E9] text-white px-4 py-2 w-full text-center relative z-50 cursor-pointer"
                style={{ zIndex: 50 }}
            >
                Вернуться в приложение
            </HoverButton>
        </div>
      </div>

      {/* Payment Accepted Popup */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[24px] w-full max-w-sm p-6 shadow-xl transform transition-all scale-100 relative">
            <button 
              onClick={() => setShowPopup(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-2">
                <CheckCircle2 size={32} />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900">Оплата принята!</h3>
              
              <p className="text-gray-500 text-sm leading-relaxed">
                Ваш заказ #{orderId} успешно оплачен и передан в обработку.
                <br />
                История заказов доступна в профиле.
              </p>

              <button
                onClick={() => {
                    setShowPopup(false)
                    handleReturn()
                }}
                className="w-full py-3 bg-[#2eb886] hover:bg-[#269970] text-white rounded-[16px] font-medium transition-colors mt-2"
              >
                Отлично
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
      <SuccessPageContent />
    </Suspense>
  )
}
