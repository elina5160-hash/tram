'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { db } from '@/lib/db'
import BackButton from '@/components/ui/back-button'
import { motion } from 'framer-motion'

function ContestContent() {
    const searchParams = useSearchParams()
    const [clientId, setClientId] = useState<string | null>(null)
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const idFromUrl = searchParams.get('client_id')
        if (idFromUrl) {
            setClientId(idFromUrl)
            if (typeof window !== "undefined") localStorage.setItem('user_id', idFromUrl)
        } else if (typeof window !== "undefined") {
            const tgId = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id
            if (tgId) {
                setClientId(tgId.toString())
                localStorage.setItem('user_id', tgId.toString())
            } else {
                const storedId = localStorage.getItem('user_id')
                if (storedId) setClientId(storedId)
            }
        }
    }, [searchParams])

    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    useEffect(() => {
        if (!clientId) return
        
        async function fetchData() {
            setLoading(true)
            setErrorMsg(null)
            try {
                const res = await fetch(`/api/contest/user?userId=${clientId}`)
                if (res.ok) {
                    const data = await res.json()
                    setUser(data)
                } else {
                    const errData = await res.json().catch(() => ({}))
                    console.error("Failed to fetch contest user data", errData)
                    setErrorMsg(errData.error || "User not found or error")
                }
            } catch (e: any) {
                console.error("Error fetching contest data", e)
                setErrorMsg(e.message || "Network error")
            } finally {
                setLoading(false)
            }
        }
        
        fetchData()
    }, [clientId])

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        // Show toast or something?
        alert('Скопировано!')
    }

    if (!clientId) {
        return (
            <div className="min-h-screen bg-[#FDF8F5] p-4 flex items-center justify-center">
                <p className="text-gray-500">Загрузка данных пользователя...</p>
            </div>
        )
    }

    return (
        <main className="min-h-screen bg-[#FDF8F5] pb-20 relative overflow-hidden">
            <BackButton href="/catalog" />
            
            {/* Header */}
            <div className="pt-16 px-4 mb-6 relative z-10">
                <h1 className="text-3xl font-serif text-[#232323] mb-2">Конкурс</h1>
                <p className="text-[#232323]/60 text-sm">Дари здоровье — получай подарки! 🎁</p>
            </div>

            {loading ? (
                <div className="p-4 text-center">Загрузка...</div>
            ) : !user ? (
                <div className="p-4 text-center flex flex-col items-center">
                    <p className="mb-4">Вы пока не зарегистрированы в конкурсе.</p>
                    {errorMsg && <p className="text-red-500 text-xs mb-4">Debug: {errorMsg} (ID: {clientId})</p>}
                    <a 
                        href="https://t.me/KonkursEtraBot?start=start" 
                        target="_blank" 
                        className="text-sm text-[#E14D2A] underline font-medium active:opacity-70"
                    >
                        Перезапустите бота командой /start
                    </a>
                </div>
            ) : (
                <div className="px-4 space-y-6 relative z-10">
                    
                    {/* Tickets Card */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E5E5E5] text-center"
                    >
                        <p className="text-[#232323]/60 text-sm uppercase tracking-wider mb-2">Ваши билеты</p>
                        <div className="text-6xl font-serif text-[#E14D2A] mb-2">{user.tickets}</div>
                        <p className="text-xs text-gray-400">Чем больше билетов, тем выше шанс!</p>
                    </motion.div>

                    {/* Promo Code Card */}
                    <div className="bg-[#E14D2A]/5 rounded-[20px] p-5 border border-[#E14D2A]/20">
                        <h3 className="font-medium text-[#232323] mb-2">Ваш промокод для друзей</h3>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 bg-white rounded-[12px] h-12 flex items-center justify-center font-mono font-bold text-lg text-[#E14D2A] border border-[#E14D2A]/20">
                                {user.personal_promo_code}
                            </div>
                            <button 
                                onClick={() => copyToClipboard(user.personal_promo_code)}
                                className="h-12 w-12 bg-[#E14D2A] rounded-[12px] flex items-center justify-center text-white active:scale-95 transition-transform"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                            </button>
                        </div>
                        <p className="text-xs text-[#E14D2A]/80 mt-2">
                            Друг получает -15%, а вы +2 билета за его покупку!
                        </p>
                    </div>

                    {/* Referral Link Card */}
                    <div className="bg-white rounded-[20px] p-5 border border-[#E5E5E5]">
                        <h3 className="font-medium text-[#232323] mb-2">Ваша ссылка для приглашений</h3>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 bg-[#F9F9F9] rounded-[12px] h-12 px-3 flex items-center text-sm text-gray-600 truncate border border-gray-100">
                                t.me/etra_bot?start=ref_{user.user_id}
                            </div>
                            <button 
                                onClick={() => copyToClipboard(`https://t.me/etra_bot?start=ref_${user.user_id}`)}
                                className="h-12 w-12 bg-[#232323] rounded-[12px] flex items-center justify-center text-white active:scale-95 transition-transform"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                            +1 билет за 3 друзей, +2 билета за 5 друзей
                        </p>
                    </div>

                    {/* Rules */}
                    <div className="bg-white rounded-[20px] p-5 border border-[#E5E5E5]">
                        <h3 className="font-medium text-[#232323] mb-4">Как получить билеты?</h3>
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#E14D2A]/10 flex items-center justify-center text-[#E14D2A] font-bold text-sm shrink-0">1</div>
                                <div>
                                    <p className="text-sm font-medium text-[#232323]">Покупка в магазине</p>
                                    <p className="text-xs text-gray-500">1 билет за каждые 1000₽ в чеке</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#E14D2A]/10 flex items-center justify-center text-[#E14D2A] font-bold text-sm shrink-0">2</div>
                                <div>
                                    <p className="text-sm font-medium text-[#232323]">Приглашение друзей</p>
                                    <p className="text-xs text-gray-500">3 друга = +1 билет<br/>5 друзей = +2 билета<br/>10 друзей = +5 билетов</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#E14D2A]/10 flex items-center justify-center text-[#E14D2A] font-bold text-sm shrink-0">3</div>
                                <div>
                                    <p className="text-sm font-medium text-[#232323]">Друг купил с промокодом</p>
                                    <p className="text-xs text-gray-500">Вы получаете +2 билета, а друг скидку 15%</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}

export default function ContestPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#FDF8F5] flex items-center justify-center">Загрузка...</div>}>
            <ContestContent />
        </Suspense>
    )
}
