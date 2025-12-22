"use client"
import { useState } from "react"
import Image from "next/image"
import { X, Upload, Check } from "lucide-react"

interface ProductFormProps {
  initialData?: any
  onSubmit: (data: any) => void
  onCancel: () => void
}

export function ProductForm({ initialData, onSubmit, onCancel }: ProductFormProps) {
  // Logic to determine initial flags based on ID if not explicitly present
  const getInitialFlags = (p: any) => {
    if (!p) return { is_promotion: false, is_bestseller: false, is_new: true }
    
    // Use explicit flags if available, otherwise fallback to ID logic
    const priceVal = parseInt((p.price || "").replace(/\D/g, '')) || 0
    const isCheap = priceVal > 0 && priceVal < 1000
    
    return {
      is_promotion: p.is_promotion ?? ([2, 6].includes(p.id) || p.title?.toLowerCase().includes("акция") || isCheap),
      is_bestseller: p.is_bestseller ?? [1, 7, 3, 4].includes(p.id),
      is_new: p.is_new ?? true
    }
  }

  const flags = getInitialFlags(initialData)

  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    price: initialData?.price || "",
    description: initialData?.description || "",
    composition: initialData?.composition || "",
    category: initialData?.category || "drinks",
    image: initialData?.image || "",
    ...flags
  })
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function compressImageToWebP(file: File, quality = 0.75): Promise<Blob | null> {
    try {
      const bitmap = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      ctx.drawImage(bitmap, 0, 0)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/webp', quality))
      return blob
    } catch {
      return null
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const form = new FormData()
    let uploadFile: File | Blob = file
    if (file.type.startsWith('image/')) {
      const webp = await compressImageToWebP(file, 0.7)
      if (webp) {
        uploadFile = new File([webp], (file.name.replace(/\.[^/.]+$/, '') || 'image') + '.webp', { type: 'image/webp' })
      }
    }
    form.append('file', uploadFile)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: form
      })
      const data = await res.json()
      if (data.url) {
        setFormData(prev => ({ ...prev, image: data.url }))
      }
    } catch (err) {
      alert('Ошибка загрузки')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    if (!formData.title.trim()) newErrors.title = "Введите название"
    if (!formData.price.trim()) newErrors.price = "Введите цену"
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    onSubmit(formData)
  }

  const categories = [
    { value: 'drinks', label: 'Напитки' },
    { value: 'sets', label: 'Наборы' },
    { value: 'ferments', label: 'Закваски' },
    { value: 'courses', label: 'Курсы' },
    { value: 'equipment', label: 'Оборудование' },
    { value: 'prebiotics', label: 'Пребиотики' },
    { value: 'food', label: 'Еда' },
  ]

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4 overflow-y-auto p-4 md:pr-2 bg-white rounded-xl shadow-sm border">
      <div className="sticky top-0 z-10 bg-white pt-1 pb-3 -mt-1 border-b flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-600 hover:text-gray-900 flex items-center gap-2 px-2 py-1 -ml-2 rounded-lg active:bg-gray-100"
        >
          <X className="w-4 h-4" />
          Отмена
        </button>
        <div className="text-sm font-semibold text-gray-900">{initialData ? "Редактирование товара" : "Новый товар"}</div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Сохранить
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Main Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Название *</label>
            <input
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              placeholder="Например: Закваска ПРАЭнзим"
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Цена *</label>
              <input
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${errors.price ? 'border-red-500' : 'border-gray-300'}`}
                value={formData.price}
                onChange={e => setFormData({...formData, price: e.target.value})}
                placeholder="3000 руб"
              />
              {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
            </div>
            <div>
               <label className="block text-sm font-medium mb-1 text-gray-700">Категория</label>
               <select
                 className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none border-gray-300 bg-white"
                 value={formData.category}
                 onChange={e => setFormData({...formData, category: e.target.value})}
               >
                 {categories.map(c => (
                   <option key={c.value} value={c.value}>{c.label}</option>
                 ))}
               </select>
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium mb-1 text-gray-700">Описание</label>
             <textarea
               className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none border-gray-300 h-24 resize-none"
               value={formData.description}
               onChange={e => setFormData({...formData, description: e.target.value})}
               placeholder="Описание товара..."
             />
          </div>

          <div>
             <label className="block text-sm font-medium mb-1 text-gray-700">Состав</label>
             <textarea
               className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none border-gray-300 h-20 resize-none"
               value={formData.composition}
               onChange={e => setFormData({...formData, composition: e.target.value})}
               placeholder="Вода, солод..."
             />
          </div>
        </div>

        {/* Right Column: Image & Settings */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Изображение</label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center gap-2 relative bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
               <input 
                 type="file" 
                 accept="image/*"
                 onChange={handleImageUpload}
                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                 disabled={uploading}
               />
               {formData.image ? (
                 <div className="relative w-full aspect-square max-w-[200px] rounded-lg overflow-hidden border">
                   {formData.image.endsWith('.mp4') ? (
                      <video src={formData.image} className="w-full h-full object-cover" muted />
                   ) : (
                      <Image src={formData.image} alt="Preview" fill className="object-cover" />
                   )}
                 </div>
               ) : (
                 <div className="w-full aspect-square max-w-[200px] flex items-center justify-center text-gray-400">
                   <div className="text-center">
                     <Upload className="w-8 h-8 mx-auto mb-2" />
                     <span className="text-sm">Нажмите для загрузки</span>
                   </div>
                 </div>
               )}
               {uploading && (
                 <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                   <span className="text-blue-600 font-medium animate-pulse">Загрузка...</span>
                 </div>
               )}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border space-y-3">
             <h3 className="font-medium text-gray-900 text-sm">Настройки отображения</h3>
             
             <label className="flex items-center gap-3 cursor-pointer">
               <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.is_promotion ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
                 {formData.is_promotion && <Check className="w-3.5 h-3.5 text-white" />}
               </div>
               <input 
                 type="checkbox" 
                 className="hidden" 
                 checked={formData.is_promotion}
                 onChange={e => setFormData({...formData, is_promotion: e.target.checked})}
               />
               <span className="text-sm text-gray-700">Скидка / Акция</span>
             </label>

             <label className="flex items-center gap-3 cursor-pointer">
               <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.is_bestseller ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
                 {formData.is_bestseller && <Check className="w-3.5 h-3.5 text-white" />}
               </div>
               <input 
                 type="checkbox" 
                 className="hidden" 
                 checked={formData.is_bestseller}
                 onChange={e => setFormData({...formData, is_bestseller: e.target.checked})}
               />
               <span className="text-sm text-gray-700">Выбор покупателей (Хит)</span>
             </label>

             <label className="flex items-center gap-3 cursor-pointer">
               <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.is_new ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
                 {formData.is_new && <Check className="w-3.5 h-3.5 text-white" />}
               </div>
               <input 
                 type="checkbox" 
                 className="hidden" 
                 checked={formData.is_new}
                 onChange={e => setFormData({...formData, is_new: e.target.checked})}
               />
               <span className="text-sm text-gray-700">Новинка</span>
             </label>
          </div>
        </div>
      </div>
    </form>
  )
}
