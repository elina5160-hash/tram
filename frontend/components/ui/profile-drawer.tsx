"use client"

import { useState, useEffect } from "react"
import { Copy, Edit, X } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"

interface ProfileDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function ProfileDrawer({ isOpen, onClose }: ProfileDrawerProps) {
  const router = useRouter()
  const [userInfo, setUserInfo] = useState<any>(null)
  const [showBonuses, setShowBonuses] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp
      setUserInfo(tg.initDataUnsafe?.user || {})
    }
  }, [])

  const userId = userInfo?.id || "1287944066" // Fallback or demo ID
  const refLink = `https://t.me/beautykoreanbot?start=u${userId}`

  const copyToClipboard = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(refLink)
      // Optional: show toast
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end md:justify-center md:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      
      {/* Drawer Content */}
      <div className="relative w-full md:w-[420px] bg-[#1c1c1e] text-white rounded-t-[20px] md:rounded-[20px] p-5 pb-10 flex flex-col gap-5 animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-[20px] font-semibold">Мой профиль</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#2c2c2e] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Info */}
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-[#2c2c2e] overflow-hidden relative">
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
          <div className="flex-1 flex flex-col gap-1">
            <div className="text-[#2eb886] text-[15px]">@{userInfo?.username || "avavvtt"}</div>
            <div className="text-[15px]">{userInfo?.first_name ? `${userInfo.first_name} ${userInfo.last_name || ''}` : "(ФИО не указано)"}</div>
            <div className="text-[15px] text-gray-400">(Номер не указан)</div>
            <div className="text-[15px] text-gray-400">(Email не указан)</div>
          </div>
          <button className="text-[#2eb886]">
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
              className="w-12 rounded-[12px] bg-[#2c2c2e] flex items-center justify-center text-gray-400 hover:text-white"
            >
              <Copy size={18} />
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
            onClick={() => router.push('/favorites')} // Assuming favorites page or handle click
            className="bg-[#2c2c2e] rounded-[16px] py-4 text-[14px] font-medium text-white hover:bg-[#3a3a3c] transition-colors"
          >
            Мои избранные
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
               "Дари здоровье — получи подарки"
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
