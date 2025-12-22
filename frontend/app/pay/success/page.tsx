"use client"

import { useRouter } from "next/navigation"
import { HoverButton } from "@/components/ui/hover-button"

export default function SuccessPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen w-full bg-white flex flex-col justify-start relative pb-24">
      <div className="w-full max-w-[420px] mx-auto px-4 pt-6">
        <h1 className="text-xl font-semibold">Оплата прошла успешно</h1>
        <div className="mt-4">
          <HoverButton 
            className="rounded-[12px] bg-[#6800E9] text-white px-4 py-2 w-full text-center"
            onClick={() => router.push('/home')}
          >
            Вернуться на главную
          </HoverButton>
        </div>
      </div>
    </div>
  )
}
