import { useState, useEffect } from "react"
import { useBottomBanner, BannerItem } from "@/hooks/useBottomBanner"

interface Props {
  onBack?: () => void
}

export function BottomBannerEditor({ onBack }: Props) {
  const { items, isLoading, updateBanner } = useBottomBanner()
  const [formData, setFormData] = useState<BannerItem[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (items) {
      setFormData(items)
    }
  }, [items])

  const handleChange = (index: number, field: keyof BannerItem, value: any) => {
    const newData = [...formData]
    newData[index] = { ...newData[index], [field]: value }
    setFormData(newData)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateBanner(formData)
      alert("Сохранено!")
    } catch (e) {
      alert("Ошибка сохранения")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <div>Загрузка...</div>

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="sticky top-0 z-10 bg-white pt-1 pb-3 -mt-1 border-b flex items-center justify-between">
        <button
          onClick={() => onBack && onBack()}
          className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
        >
          ← Назад
        </button>
        <div className="text-sm text-gray-500">Редактор нижней панели</div>
      </div>
      <div className="space-y-4">
        {formData.map((item, index) => (
          <div key={item.id} className="p-4 border rounded-lg bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-gray-700">{item.id === 'home' ? 'Главная' : item.id === 'shop' ? 'Каталог' : item.id === 'cart' ? 'Корзина' : 'Поддержка'}</span>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={(e) => handleChange(index, 'enabled', e.target.checked)}
                  className="rounded border-gray-300"
                />
                Включено
              </label>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => handleChange(index, 'label', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ссылка</label>
                <input
                  type="text"
                  value={item.href}
                  onChange={(e) => handleChange(index, 'href', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 z-10 bg-white mt-6 flex justify-end pt-4 border-t">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isSaving ? "Сохранение..." : "Сохранить изменения"}
        </button>
      </div>
    </div>
  )
}
