"use client"

import { useEffect, useState } from "react"
import { getPendingOrder, clearPendingOrder, clearCart } from "@/lib/cart"
import { getSupabaseClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export function OrderStatusChecker() {
    const [lastCheck, setLastCheck] = useState(0)
    const router = useRouter()

    useEffect(() => {
        const check = async () => {
            const pendingId = getPendingOrder()
            if (!pendingId) return

            // Don't check too often if component re-mounts
            const now = Date.now()
            if (now - lastCheck < 3000) return
            setLastCheck(now)

            const client = getSupabaseClient()
            if (!client) return

            try {
                const { data } = await client.from('orders').select('status').eq('id', pendingId).single()
                
                if (data && (data.status === 'Оплачен' || data.status === 'paid')) {
                    console.log(`Order ${pendingId} is paid! Clearing cart.`)
                    clearCart()
                    clearPendingOrder()
                    
                    // Optional: Show success message or redirect
                    // Using standard alert for now, but UI toast would be better
                    alert(`Ваш заказ №${pendingId} успешно оплачен!`)
                    router.refresh()
                }
            } catch (e) {
                console.error("Failed to check order status", e)
            }
        }

        // Check on mount
        check()

        // Also check when window gains focus (user returns to app)
        const onFocus = () => check()
        window.addEventListener("focus", onFocus)
        return () => window.removeEventListener("focus", onFocus)
    }, [lastCheck, router])

    return null
}
