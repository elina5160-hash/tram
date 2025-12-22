"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function UserOrdersPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/home?profile=true&view=orders")
  }, [router])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-500">Перенаправление...</p>
      </div>
    </div>
  )
}
