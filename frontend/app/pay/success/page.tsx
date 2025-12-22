"use client"

import { useEffect, useState } from "react"
import { HoverButton } from "@/components/ui/hover-button"
import { getPendingOrder, savePendingOrder, clearCart } from "@/lib/cart"
import { CheckCircle2, Loader2, X } from "lucide-react"

export default function SuccessPage() {
  const [isTelegram, setIsTelegram] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [orderId, setOrderId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Check if running inside Telegram WebApp
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initData) {
        setIsTelegram(true)
    }

    // Check for pending order
    const pendingId = getPendingOrder()
    if (pendingId) {
      setOrderId(pendingId)
      setShowPopup(true)
      handleOrderSync(pendingId)
    }
  }, [])

  const handleOrderSync = async (id: number) => {
    setIsLoading(true)
    try {
      // 1. Get Client ID
      let clientId = ""
      if (typeof window !== "undefined") {
         const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user
         if (tgUser?.id) clientId = String(tgUser.id)
         else clientId = localStorage.getItem("user_id") || ""
      }

      // 2. Sync with backend
      await fetch('/api/orders/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: id, clientId })
      })

      // 3. Clear local state
      clearCart()
      savePendingOrder(0) // Clear pending order (pass 0 or handle logic to remove)
      
      // Actually savePendingOrder logic:
      if (typeof window !== "undefined") {
         window.localStorage.removeItem("pending_order_id")
      }
    } catch (e) {
      console.error("Failed to sync order", e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReturn = () => {
      if (isTelegram) {
          // If inside Telegram, close the webview (if it was a popup) or go back
          const tg = (window as any).Telegram.WebApp
          if (tg.initData) {
              tg.close()
          } else {
              window.location.href = "/"
          }
      } else {
          // If in external browser, open the bot via deep link
          window.location.href = "https://t.me/KonkursEtraBot/app"
      }
  }

  return (
    <div className="min-h-screen w-full bg-white flex flex-col justify-start relative pb-24">
      <div className="w-full max-w-[420px] mx-auto px-4 pt-6">
        <h1 className="text-xl font-semibold">Оплата прошла успешно</h1>
        <div className="mt-4">
          <a 
            href="https://t.me/KonkursEtraBot/app" 
            className="block w-full"
            onClick={(e) => {
                if (isTelegram) {
                    e.preventDefault()
                    handleReturn()
                }
            }}
          >
            <HoverButton className="rounded-[12px] bg-[#6800E9] text-white px-4 py-2 w-full text-center">
                Вернуться в приложение
            </HoverButton>
          </a>
        </div>
      </div>

      {/* Payment Accepted Popup */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl relative animate-in fade-in zoom-in duration-300">
            <button 
              onClick={() => setShowPopup(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              
              <h2 className="text-xl font-bold mb-2">Оплата принята!</h2>
              <p className="text-gray-600 mb-6">
                Ваш заказ {orderId ? `№${orderId}` : ''} успешно оплачен и сохранен в истории.
              </p>

              <HoverButton 
                onClick={() => {
                  setShowPopup(false)
                  if (isTelegram) handleReturn()
                }}
                className="w-full bg-[#6800E9] text-white py-3 rounded-xl font-medium"
              >
                Отлично
              </HoverButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
