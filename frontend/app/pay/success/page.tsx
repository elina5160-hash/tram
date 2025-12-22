"use client"

import { useEffect, useState } from "react"
import { HoverButton } from "@/components/ui/hover-button"

export default function SuccessPage() {
  const [isTelegram, setIsTelegram] = useState(false)

  useEffect(() => {
    // Check if running inside Telegram WebApp
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initData) {
        setIsTelegram(true)
    }
  }, [])

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
          // Try to use the environment variable or fallback
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
                // If we are in Telegram, prevent default and use handleReturn logic
                if (isTelegram) {
                    e.preventDefault()
                    handleReturn()
                }
                // Otherwise let the link work naturally (it's robust for Safari)
            }}
          >
            <HoverButton className="rounded-[12px] bg-[#6800E9] text-white px-4 py-2 w-full text-center">
                Вернуться в приложение
            </HoverButton>
          </a>
        </div>
      </div>
    </div>
  )
}
