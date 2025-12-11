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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const form = new FormData()
    form.append('file', file)

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
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Название *</label>
          <input
            className={`w-full px-3 py-2 border rounded-lg ${errors.title ? 'border-red-500' : ''}`}
            value={formData.title}
            onChange={e => {
              setFormData({ ...formData, title: e.target.value })
              if (errors.title) setErrors({ ...errors, title: "" })
            }}
          />
          {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Цена *</label>
          <input
            className={`w-full px-3 py-2 border rounded-lg ${errors.price ? 'border-red-500' : ''}`}
            value={formData.price}
            onChange={e => {
              setFormData({ ...formData, price: e.target.value })
              if (errors.price) setErrors({ ...errors, price: "" })
            }}
          />
          {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Категория</label>
        <select
          className="w-full px-3 py-2 border rounded-lg"
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
        <label className="block text-sm font-medium mb-1">Изображение</label>
        <div className="flex items-center gap-4">
          {formData.image && (
            <div className="relative w-20 h-20 rounded-lg overflow-hidden border">
              {formData.image.endsWith('.mp4') ? (
                <video src={formData.image} className="w-full h-full object-cover" />
              ) : (
                <Image src={formData.image} alt="Preview" fill className="object-cover" />
              )}
            </div>
          )}
          <label className="cursor-pointer px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
            {uploading ? "Загрузка..." : "Выбрать файл"}
            <input type="file" className="hidden" accept="image/*,video/*" onChange={handleImageUpload} />
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Описание</label>
        <textarea
          className="w-full px-3 py-2 border rounded-lg h-24"
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Состав</label>
        <textarea
          className="w-full px-3 py-2 border rounded-lg h-24"
          value={formData.composition}
          onChange={e => setFormData({ ...formData, composition: e.target.value })}
        />
      </div>

      <div className="flex justify-end gap-3 mt-auto pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          Отмена
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Сохранить
        </button>
      </div>
    </form>
  )
}
