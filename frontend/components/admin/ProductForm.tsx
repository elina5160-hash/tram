"use client"
import { useState } from "react"
import Image from "next/image"

interface ProductFormProps {
  initialData?: any
  onSubmit: (data: any) => void
  onCancel: () => void
}

export function ProductForm({ initialData, onSubmit, onCancel }: ProductFormProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    price: initialData?.price || "",
    description: initialData?.description || "",
    composition: initialData?.composition || "",
    category: initialData?.category || "drinks",
    image: initialData?.image || ""
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

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4 overflow-y-auto p-4 md:pr-2">
      <div className="sticky top-0 z-10 bg-white pt-1 pb-3 -mt-1 border-b flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-600 hover:text-gray-900 flex items-center gap-2 px-2 py-1 -ml-2 rounded-lg active:bg-gray-100"
        >
          ← Назад
        </button>
        <div className="text-sm text-gray-500 font-medium">{initialData ? "Изменение товара" : "Добавление товара"}</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">Название *</label>
          <input
            className={`w-full px-3 py-3 md:py-2 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
            value={formData.title}
            onChange={e => {
              setFormData({ ...formData, title: e.target.value })
              if (errors.title) setErrors({ ...errors, title: "" })
            }}
            placeholder="Например: Чай Улун"
          />
          {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">Цена *</label>
          <input
            className={`w-full px-3 py-3 md:py-2 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow ${errors.price ? 'border-red-500' : 'border-gray-300'}`}
            value={formData.price}
            onChange={e => {
              setFormData({ ...formData, price: e.target.value })
              if (errors.price) setErrors({ ...errors, price: "" })
            }}
            placeholder="Например: 500 руб"
          />
          {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700">Категория</label>
        <select
          className="w-full px-3 py-3 md:py-2 text-base border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow border-gray-300"
          value={formData.category}
          onChange={e => setFormData({ ...formData, category: e.target.value })}
        >
          <option value="drinks">Напитки</option>
          <option value="sets">Наборы</option>
          <option value="courses">Курсы</option>
          <option value="equipment">Оборудование</option>
          <option value="food">Еда</option>
          <option value="prebiotics">Пребиотики</option>
          <option value="oils">Масла</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700">Изображение</label>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          {formData.image && (
            <div className="relative w-full md:w-32 h-48 md:h-32 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
              {formData.image.endsWith('.mp4') ? (
                <video src={formData.image} className="w-full h-full object-cover" />
              ) : (
                <Image src={formData.image} alt="Preview" fill className="object-cover" quality={60} />
              )}
            </div>
          )}
          <label className={`cursor-pointer w-full md:w-auto flex items-center justify-center px-4 py-3 md:py-2 rounded-lg border border-dashed border-gray-300 hover:bg-gray-50 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <span className="text-gray-600 font-medium">
                {uploading ? "Загрузка..." : formData.image ? "Заменить фото" : "Загрузить фото"}
            </span>
            <input 
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageUpload}
                disabled={uploading}
            />
          </label>
        </div>
        <p className="text-xs text-gray-500 mt-1">Поддерживаются JPG, PNG, WEBP. Макс. 5MB.</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700">Описание</label>
        <textarea
          className="w-full px-3 py-3 md:py-2 text-base border rounded-lg h-32 md:h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow border-gray-300 resize-none"
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          placeholder="Описание товара..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700">Состав</label>
        <textarea
          className="w-full px-3 py-3 md:py-2 text-base border rounded-lg h-32 md:h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow border-gray-300 resize-none"
          value={formData.composition}
          onChange={e => setFormData({ ...formData, composition: e.target.value })}
          placeholder="Состав продукта..."
        />
      </div>

      <div className="sticky bottom-0 z-10 bg-white flex justify-end gap-3 mt-auto pt-4 pb-2 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 md:flex-none px-4 py-3 md:py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
        >
          Отмена
        </button>
        <button
          type="submit"
          className="flex-1 md:flex-none px-6 py-3 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-all active:scale-95"
        >
          Сохранить
        </button>
      </div>
    </form>
  )
}
