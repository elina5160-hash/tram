"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { addToCart } from "@/lib/cart"

const fetcher = async (url: string) => {
    // 1. Try network
    try {
        const res = await fetch(url)
        if (!res.ok) throw new Error('Network error')
        const data = await res.json()
        
        // 2. Update cache
        if (typeof window !== 'undefined') {
            localStorage.setItem(`cache_orders:${url}`, JSON.stringify({ 
                data, 
                timestamp: Date.now() 
            }))
        }
        return data
    } catch (e) {
        console.warn('Network failed, trying cache...', e)
        // 3. Fallback to cache
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem(`cache_orders:${url}`)
            if (cached) {
                try {
                    const parsed = JSON.parse(cached)
                    // Optional: check expiration (e.g. 1 hour)
                    // if (Date.now() - parsed.timestamp > 3600000) return null
                    return parsed.data
                } catch (parseErr) {
                    console.error('Cache parse error', parseErr)
                }
            }
        }
        throw e
    }
}

export default function UserOrdersPage() {
  const router = useRouter()
  const [clientId, setClientId] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>("all") // all, active, completed
  const [sort, setSort] = useState<string>("newest") // newest, oldest, amount_desc, amount_asc

  useEffect(() => {
    // 1. Try Telegram WebApp
    if (typeof window !== "undefined") {
        const tg = (window as any).Telegram?.WebApp
        if (tg?.initDataUnsafe?.user?.id) {
            setClientId(String(tg.initDataUnsafe.user.id))
            return
        }
    }
    // 2. Try LocalStorage
    const stored = window.localStorage.getItem("user_id")
    if (stored) {
        setClientId(stored)
    }
  }, [])

  const { data: orders, error, isLoading } = useSWR(
    clientId ? `/api/user/orders?client_id=${clientId}` : null,
    fetcher
  )

  const filteredOrders = Array.isArray(orders) ? orders
    .filter((o: any) => {
        if (filter === "all") return true
        if (filter === "active") return !["Оплачен", "paid", "archived", "canceled"].includes(o.status)
        if (filter === "completed") return ["Оплачен", "paid", "archived"].includes(o.status)
        return true
    })
    .sort((a: any, b: any) => {
        if (sort === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        if (sort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        if (sort === "amount_desc") return b.total_amount - a.total_amount
        if (sort === "amount_asc") return a.total_amount - b.total_amount
        return 0
    }) : []

  if (!clientId) {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="text-center">
                <h1 className="text-xl font-bold text-gray-800 mb-2">Требуется авторизация</h1>
                <p className="text-gray-600 mb-4">Пожалуйста, войдите через Telegram</p>
            </div>
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
            <button onClick={() => router.back()} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
            </button>
            <h1 className="font-bold text-lg">Мои заказы(история заказов)</h1>
            <div className="w-10" />
        </div>
        
        {/* Filters */}
        <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar border-t">
            <button 
                onClick={() => setFilter("all")}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${filter === "all" ? "bg-black text-white" : "bg-gray-100 text-gray-700"}`}
            >
                Все
            </button>
            <button 
                onClick={() => setFilter("completed")}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${filter === "completed" ? "bg-black text-white" : "bg-gray-100 text-gray-700"}`}
            >
                Завершенные
            </button>
            <button 
                onClick={() => setFilter("active")}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${filter === "active" ? "bg-black text-white" : "bg-gray-100 text-gray-700"}`}
            >
                Активные
            </button>
        </div>
      </header>

      {/* List */}
      <div className="max-w-md mx-auto p-4 space-y-4">
        {isLoading ? (
            <div className="space-y-4 animate-pulse">
                {[1,2,3].map(i => <div key={i} className="h-32 bg-white rounded-xl" />)}
            </div>
        ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
                <div className="text-4xl mb-4">🛍️</div>
                <h3 className="font-bold text-gray-900 mb-2">История пуста</h3>
                <p className="text-gray-500 text-sm mb-6">Вы еще ничего не заказывали</p>
                <Link href="/" className="inline-block bg-[#E14D2A] text-white px-6 py-2 rounded-lg font-medium">
                    Перейти к покупкам
                </Link>
            </div>
        ) : (
            <AnimatePresence>
                {filteredOrders.map((order: any) => (
                    <OrderCard key={order.id} order={order} />
                ))}
            </AnimatePresence>
        )}
      </div>
    </div>
  )
}

function OrderCard({ order }: { order: any }) {
    const router = useRouter()
    const [expanded, setExpanded] = useState(false)
    const [isReturning, setIsReturning] = useState(false)
    const [returnReason, setReturnReason] = useState("")
    const [submittingReturn, setSubmittingReturn] = useState(false)

    // Review states
    const [isReviewing, setIsReviewing] = useState(false)
    const [rating, setRating] = useState(5)
    const [reviewText, setReviewText] = useState("")
    const [submittingReview, setSubmittingReview] = useState(false)
    
    // Parse items if they are text
    const isTextItems = typeof order.items === 'string'
    const canReturn = ["paid", "Оплачен", "completed"].includes(order.status)
    const canReview = ["paid", "Оплачен", "completed", "archived"].includes(order.status)
    const existingReview = order.customer_info?.review

    const handleRepeat = () => {
        const itemsBackup = order.customer_info?.items_backup
        
        if (Array.isArray(itemsBackup) && itemsBackup.length > 0) {
            // Use structured backup if available
            itemsBackup.forEach((item: any) => {
                addToCart({
                    id: item.id || Date.now(), // Fallback ID if missing
                    title: item.name,
                    qty: item.quantity || 1
                })
            })
            router.push('/cart')
            return
        }

        // Fallback for legacy orders: try to parse text or just warn
        if (confirm("Для этого заказа нет сохраненного состава корзины. Перейти в каталог?")) {
            router.push('/')
        }
    }

    const handleReturn = async () => {
        if (!returnReason.trim()) {
            alert("Пожалуйста, укажите причину возврата")
            return
        }

        if (!confirm("Вы уверены, что хотите оформить возврат?")) return

        setSubmittingReturn(true)
        try {
            const res = await fetch('/api/user/orders/return', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: order.id, reason: returnReason })
            })

            if (res.ok) {
                alert("Заявка на возврат успешно отправлена")
                setIsReturning(false)
                window.location.reload() 
            } else {
                const data = await res.json()
                alert(data.error || "Ошибка при оформлении возврата")
            }
        } catch (e) {
            alert("Ошибка сети")
        } finally {
            setSubmittingReturn(false)
        }
    }

    const handleReview = async () => {
        setSubmittingReview(true)
        try {
            const res = await fetch('/api/user/orders/review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: order.id, rating, text: reviewText })
            })

            if (res.ok) {
                alert("Спасибо за ваш отзыв!")
                setIsReviewing(false)
                window.location.reload() 
            } else {
                const data = await res.json()
                alert(data.error || "Ошибка при отправке отзыва")
            }
        } catch (e) {
            alert("Ошибка сети")
        } finally {
            setSubmittingReview(false)
        }
    }
    
    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
        >
            <div className="p-4" onClick={() => setExpanded(!expanded)}>
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <div className="text-xs text-gray-500 mb-1">
                            {new Date(order.created_at).toLocaleDateString("ru-RU")} • #{order.id}
                        </div>
                        <div className="font-bold text-lg">
                            {Number(order.total_amount).toLocaleString()} ₽
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                            ["Оплачен", "paid"].includes(order.status) 
                            ? "bg-green-100 text-green-700" 
                            : order.status === 'return_requested' 
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}>
                            {order.status === 'return_requested' ? 'Возврат' : order.status}
                        </span>
                        {existingReview && (
                            <span className="text-xs text-orange-500 font-medium">
                                ★ {existingReview.rating}
                            </span>
                        )}
                    </div>
                </div>
                
                {/* Short Description */}
                <div className="text-sm text-gray-600 line-clamp-2">
                   {isTextItems ? (
                       // Extract just the item lines from text block if possible, or show "Подробнее"
                       "Нажмите для просмотра состава заказа"
                   ) : (
                       Array.isArray(order.items) ? order.items.map((i: any) => i.name || i.n).join(", ") : "Товары"
                   )}
                </div>
            </div>

            {/* Return Form */}
            <AnimatePresence>
                {isReturning && (
                    <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="px-4 py-3 bg-red-50 border-t border-red-100"
                    >
                        <h4 className="text-sm font-medium text-red-800 mb-2">Оформление возврата</h4>
                        <textarea 
                            value={returnReason}
                            onChange={(e) => setReturnReason(e.target.value)}
                            placeholder="Укажите причину возврата..."
                            className="w-full p-2 text-sm border border-red-200 rounded-lg mb-2 focus:outline-none focus:ring-1 focus:ring-red-500"
                            rows={3}
                        />
                        <div className="flex gap-2">
                            <button 
                                onClick={handleReturn}
                                disabled={submittingReturn}
                                className="flex-1 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium active:scale-95 transition-transform disabled:opacity-50"
                            >
                                {submittingReturn ? "Отправка..." : "Отправить заявку"}
                            </button>
                            <button 
                                onClick={() => setIsReturning(false)}
                                className="px-3 py-1.5 bg-white text-gray-600 border rounded-lg text-sm font-medium active:scale-95 transition-transform"
                            >
                                Отмена
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Review Form */}
            <AnimatePresence>
                {isReviewing && (
                    <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="px-4 py-3 bg-orange-50 border-t border-orange-100"
                    >
                        <h4 className="text-sm font-medium text-orange-800 mb-2">Оценка заказа</h4>
                        <div className="flex gap-2 mb-3">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setRating(star)}
                                    className={`text-2xl transition-transform active:scale-90 ${star <= rating ? "text-orange-500" : "text-gray-300"}`}
                                >
                                    ★
                                </button>
                            ))}
                        </div>
                        <textarea 
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            placeholder="Ваш отзыв (необязательно)..."
                            className="w-full p-2 text-sm border border-orange-200 rounded-lg mb-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                            rows={2}
                        />
                        <div className="flex gap-2">
                            <button 
                                onClick={handleReview}
                                disabled={submittingReview}
                                className="flex-1 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-medium active:scale-95 transition-transform disabled:opacity-50"
                            >
                                {submittingReview ? "Отправка..." : "Отправить"}
                            </button>
                            <button 
                                onClick={() => setIsReviewing(false)}
                                className="px-3 py-1.5 bg-white text-gray-600 border rounded-lg text-sm font-medium active:scale-95 transition-transform"
                            >
                                Отмена
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Actions */}
            {!isReturning && !isReviewing && (
                <div className="px-4 py-3 bg-gray-50 flex gap-2 text-sm border-t overflow-x-auto no-scrollbar">
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleRepeat(); }}
                        className="flex-1 min-w-[80px] py-2 bg-white border rounded-lg text-gray-700 font-medium shadow-sm active:scale-95 transition-transform whitespace-nowrap"
                    >
                        Повторить
                    </button>
                    
                    {canReview && !existingReview && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsReviewing(true); }}
                            className="flex-1 min-w-[80px] py-2 bg-white border rounded-lg text-gray-700 font-medium shadow-sm active:scale-95 transition-transform whitespace-nowrap"
                        >
                            Оценить
                        </button>
                    )}

                    {canReturn && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsReturning(true); }}
                            className="flex-1 min-w-[80px] py-2 bg-white border rounded-lg text-gray-700 font-medium shadow-sm active:scale-95 transition-transform whitespace-nowrap"
                        >
                            Возврат
                        </button>
                    )}

                    <a 
                        href="https://t.me/EtraSupportBot" 
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 min-w-[80px] py-2 bg-white border rounded-lg text-gray-700 font-medium shadow-sm text-center active:scale-95 transition-transform whitespace-nowrap"
                    >
                        Поддержка
                    </a>
                </div>
            )}

            {/* Details (Expanded) */}
            <AnimatePresence>
                {expanded && (
                    <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="bg-white border-t px-4 pb-4 overflow-hidden"
                    >
                        <div className="pt-4 space-y-3 text-sm">
                            <div>
                                <h4 className="font-medium text-gray-900 mb-2">Состав заказа:</h4>
                                {isTextItems ? (
                                    <pre className="whitespace-pre-wrap font-mono text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
                                        {order.items}
                                    </pre>
                                ) : (
                                    <ul className="space-y-2">
                                        {Array.isArray(order.items) && order.items.map((item: any, i: number) => (
                                            <li key={i} className="flex justify-between">
                                                <span className="text-gray-600">{item.name || item.n} x{item.quantity || item.q}</span>
                                                <span className="font-medium">{(item.sum || item.s || 0).toLocaleString()} ₽</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            
                            <div>
                                <h4 className="font-medium text-gray-900 mb-1">Доставка:</h4>
                                <p className="text-gray-600">
                                    {order.customer_info?.address || order.customer_info?.cdek || "Адрес не указан"}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
