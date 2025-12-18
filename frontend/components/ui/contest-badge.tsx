'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export default function ContestBadge({ className = '', clientId }: { className?: string, clientId?: string | null }) {
    const router = useRouter()
    const [tickets, setTickets] = useState<number | null>(null)
    const [activeId, setActiveId] = useState<string | null>(null)

    useEffect(() => {
        if (clientId) {
            setActiveId(clientId)
        } else if (typeof window !== "undefined") {
             const tg = (window as any).Telegram?.WebApp
             if (tg?.initDataUnsafe?.user?.id) {
                 setActiveId(tg.initDataUnsafe.user.id)
             }
        }
    }, [clientId])

    useEffect(() => {
        if (!activeId) return

        async function fetchTickets() {
            try {
                const res = await fetch(`/api/contest/user?userId=${activeId}`)
                if (res.ok) {
                    const data = await res.json()
                    setTickets(data.tickets || 0)
                }
            } catch (e) {
                console.error("Failed to fetch tickets", e)
            }
        }

        fetchTickets()
    }, [activeId])

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`flex items-center gap-1.5 bg-[#E14D2A]/10 border border-[#E14D2A]/20 rounded-full px-3 py-1.5 cursor-pointer active:scale-95 transition-transform ${className}`}
            onClick={() => router.push(`/contest?client_id=${activeId}`)}
        >
            <span className="text-base">🎁</span>
            <span className="text-sm font-bold text-[#E14D2A]">{tickets !== null ? tickets : 0} билетов</span>
        </motion.div>
    )
}
