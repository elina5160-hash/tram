"use client"

import { useState, useEffect } from "react"
import { Copy, Edit, X, Package, Calendar, ChevronRight, Loader2, Home, Check } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import useSWR from "swr"

interface ProfileDrawerProps {
  isOpen: boolean
  onClose: () => void
  initialView?: 'profile' | 'orders'
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

import { getPendingOrder, clearCart, savePendingOrder } from "@/lib/cart"

export function ProfileDrawer({ isOpen, onClose, initialView = 'profile' }: ProfileDrawerProps) {
  const router = useRouter()
  const [userInfo, setUserInfo] = useState<any>(null)
  const [showBonuses, setShowBonuses] = useState(false)
  const [view, setView] = useState<'profile' | 'orders'>(initialView)
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    if (isOpen) {
        setView(initialView)
    }
  }, [isOpen, initialView])

  useEffect(() => {
    if (typeof window !== "undefined") {
        const tg = (window as any).Telegram?.WebApp
        if (tg?.initDataUnsafe?.user) {
            setUserInfo(tg.initDataUnsafe.user)
        } else {
            // Try to recover from localStorage for non-Telegram envs
            const localId = localStorage.getItem("user_id")
            if (localId) {
                setUserInfo({ id: localId, first_name: 'User' })
            }
        }
    }
  }, [])

  const userId = userInfo?.id || (typeof window !== 'undefined' ? localStorage.getItem("user_id") : null) || "1287944066"
  const refLink = `https://t.me/KonkursEtraBot?start=ref_${userId}`

  // Fetch orders when in 'orders' view
  const { data: ordersData, isLoading, mutate } = useSWR(
    view === 'orders' && isOpen ? `/api/user/orders?client_id=${userId}` : null,
    fetcher,
    { refreshInterval: 5000 }
  )

  // Check for locally stored pending order and sync it
  useEffect(() => {
    if (view === 'orders' && isOpen && userId) {
        const pendingId = getPendingOrder()
        if (pendingId) {
            console.log(`Checking pending order ${pendingId} for user ${userId}...`)
            fetch('/api/orders/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: pendingId, clientId: userId })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success || data.order) {
                    // Payment successful! Clear local cart and pending order
                    console.log("Order confirmed! Clearing cart...")
                    clearCart()
                    savePendingOrder(0)
                    if (typeof window !== "undefined") localStorage.removeItem("pending_order_id")
                    
                    // Refresh list
                    mutate()
                }
            })
            .catch(err => console.error("Pending sync failed:", err))
        }
    }
  }, [view, isOpen, userId, mutate])

  // Check payment status when expanding a pending order
  useEffect(() => {
    if (expandedOrderId && ordersData?.orders) {
        const order = ordersData.orders.find((o: any) => o.id === expandedOrderId)
        // Check if status implies not paid yet
        if (order && (order.status === 'created' || order.status === 'pending' || order.status === 'processing')) {
            // Trigger Sync to check with Tinkoff
            fetch('/api/orders/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: order.id, clientId: userId })
            })
            .then(res => res.json())
            .then(data => {
                if (data.order && data.order.status !== order.status) {
                    // Status changed, refresh list
                    mutate()
                }
            })
            .catch(err => console.error("Auto-sync failed:", err))
        }
    }
  }, [expandedOrderId, ordersData, userId, mutate])

  interface Order {
    id: number
    created_at: string
    total_amount: number
    status: string
    items: string
  }

  const copyToClipboard = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(refLink)
      // Optional: show toast
    }
  }

  // Reset view when closed
  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => setView(initialView), 300)
      return () => clearTimeout(t)
    }
  }, [isOpen, initialView])

  return (
    <div 
      className={`fixed inset-y-0 right-0 w-full md:w-[400px] bg-[#1c1c1e] transform transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
        
        {view === 'profile' ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
              <h2 className="text-[20px] font-semibold">Мой профиль</h2>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#2c2c2e] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto no-scrollbar flex flex-col gap-5">
              {/* User Info */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-[#2c2c2e] overflow-hidden relative shrink-0">
                  {userInfo?.photo_url ? (
                    <Image src={userInfo.photo_url} alt="Avatar" fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 flex flex-col gap-1 min-w-0">
                  <div className="text-[#2eb886] text-[15px] truncate">@{userInfo?.username || "avavvtt"}</div>
                  <div className="text-[15px] truncate">{userInfo?.first_name ? `${userInfo.first_name} ${userInfo.last_name || ''}` : "(ФИО не указано)"}</div>
                  <div className="text-[15px] text-gray-400 truncate">(Номер не указан)</div>
                  <div className="text-[15px] text-gray-400 truncate">(Email не указан)</div>
                </div>
                <button className="text-[#2eb886] shrink-0">
                  <Edit size={20} />
                </button>
              </div>

              {/* Referral Link */}
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-white">Реферальная ссылка</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-[#2c2c2e] rounded-[12px] px-3 py-3 text-[13px] text-gray-300 truncate font-mono">
                  {refLink}
                </div>
                <button 
                  onClick={copyToClipboard}
                  className="w-12 rounded-[12px] bg-[#2c2c2e] flex items-center justify-center text-gray-400 hover:text-white shrink-0 transition-colors"
                >
                  {isCopied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setShowBonuses(true)}
                className="bg-[#2c2c2e] rounded-[16px] py-4 text-[14px] font-medium text-white hover:bg-[#3a3a3c] transition-colors"
              >
                Бонусы
              </button>
              <button 
                onClick={() => setView('orders')}
                className="bg-[#2c2c2e] rounded-[16px] py-4 text-[14px] font-medium text-white hover:bg-[#3a3a3c] transition-colors flex items-center justify-center gap-2"
              >
                <Package size={16} />
                История заказов
              </button>
            </div>
            
            {/* Addresses */}
            <div className="flex flex-col gap-3 pt-2">
              <div className="text-[14px] text-white">Нет сохраненных адресов</div>
              <button className="w-full bg-[#2c2c2e] rounded-[16px] py-4 text-[14px] font-medium text-white hover:bg-[#3a3a3c] transition-colors">
                Добавить адрес
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Orders Header */}
          <div className="flex items-center justify-between shrink-0 pb-2 border-b border-white/10">
            <button 
              onClick={onClose}
              className="flex items-center gap-1 text-[#2eb886] hover:text-[#269970] transition-colors pl-1"
            >
              <Home size={18} />
              <span className="text-[15px] font-medium">Домой</span>
            </button>
            <h2 className="text-[17px] font-semibold absolute left-1/2 -translate-x-1/2">История заказов</h2>
            <div className="w-8" /> {/* Spacer */}
          </div>

          {/* Orders List */}
          <div className="overflow-y-auto -mx-2 px-2 flex flex-col gap-3 min-h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-gray-400" size={32} />
              </div>
            ) : !ordersData?.orders || ordersData.orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
                <Package size={48} className="opacity-20" />
                <p>У вас пока нет заказов</p>
                <button 
                  onClick={onClose}
                  className="mt-4 px-6 py-2 bg-[#2eb886] text-white rounded-full text-sm font-medium"
                >
                  Перейти к покупкам
                </button>
              </div>
            ) : (
              ordersData.orders.map((order: Order) => (
                <div 
                  key={order.id}
                  className="bg-[#2c2c2e] rounded-[16px] p-4 flex flex-col gap-3 transition-colors hover:bg-[#323234] cursor-pointer"
                  onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[15px] font-medium text-white">Заказ #{order.id}</span>
                      <div className="flex items-center gap-1 text-[13px] text-gray-400">
                        <Calendar size={12} />
                        <span>{new Date(order.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-md text-[11px] font-medium ${
                      order.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      order.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {order.status === 'completed' ? 'Выполнен' :
                       order.status === 'cancelled' ? 'Отменен' :
                       order.status === 'created' ? 'Создан' : 
                       order.status === 'processing' ? 'В обработке' : order.status}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                     <span className="text-[14px] text-gray-300">{order.total_amount} ₽</span>
                     <ChevronRight size={16} className={`text-gray-500 transition-transform ${expandedOrderId === order.id ? 'rotate-90' : ''}`} />
                  </div>

                  {/* Details */}
                  {expandedOrderId === order.id && (
                    <div className="pt-2 text-[13px] text-gray-300 whitespace-pre-wrap leading-relaxed animate-in slide-in-from-top-2 duration-200">
                       {order.items}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

    {/* Bonuses Modal */}
    {showBonuses && (
      <div className="absolute inset-0 z-[110] flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBonuses(false)} />
        <div className="relative bg-white text-black w-full max-w-sm rounded-[24px] p-6 flex flex-col items-center text-center gap-4 animate-in zoom-in-95 duration-200">
           <button 
             onClick={() => setShowBonuses(false)}
             className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
           >
             <X size={24} />
           </button>
           
           <div className="text-[40px]">🎉</div>
           <h3 className="text-[20px] font-bold leading-tight">
             Добро пожаловать в конкурс ЭТРА!
           </h3>
           <p className="text-[16px] font-medium text-[#2eb886]">
             &quot;Дари здоровье — получи подарки&quot;
           </p>
           
           <div className="w-full h-px bg-gray-100 my-1" />
           
           <div className="flex flex-col gap-2">
             <div className="text-[18px] font-semibold">🎁 101 победитель</div>
             <div className="text-[18px] font-bold text-[#6800E9]">🏆 Главный приз 88 000 руб</div>
           </div>

           <button 
             onClick={() => setShowBonuses(false)}
             className="mt-2 w-full bg-[#2eb886] text-white py-3 rounded-[16px] font-semibold"
           >
             Понятно
           </button>
        </div>
      </div>
    )}
  </div>
)
}
