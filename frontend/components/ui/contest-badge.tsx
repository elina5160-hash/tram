'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'

export default function ContestBadge({ className = '' }: { className?: string }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [tickets, setTickets] = useState<number | null>(null)
    const [clientId, setClientId] = useState<string | null>(null)

    useEffect(() => {
        // Get Client ID
        const idFromUrl = searchParams.get('client_id')
        if (idFromUrl) {
            setClientId(idFromUrl)
        } else if (typeof window !== "undefined" && (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id) {
            setClientId((window as any).Telegram.WebApp.initDataUnsafe.user.id)
        }
    }, [searchParams])

    useEffect(() => {
        if (!clientId) return

        async function fetchTickets() {
            try {
                const res = await fetch(`/api/contest/user?userId=${clientId}`)
                if (res.ok) {
                    const data = await res.json()
                    setTickets(data.tickets || 0)
                }
            } catch (e) {
                console.error("Failed to fetch tickets", e)
            }
        }

        fetchTickets()
    }, [clientId])

    // Always show badge, even if no user ID (show 0 tickets)
    // if (tickets === null && !clientId) return null 

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`flex items-center gap-1.5 bg-[#E14D2A]/10 border border-[#E14D2A]/20 rounded-full px-3 py-1.5 cursor-pointer active:scale-95 transition-transform ${className}`}
            onClick={() => router.push(`/contest?client_id=${clientId}`)}
        >
            <span className="text-base">🎁</span>
            <span className="text-sm font-bold text-[#E14D2A]">{tickets !== null ? tickets : 0} билетов</span>
        </motion.div>
    )
}
