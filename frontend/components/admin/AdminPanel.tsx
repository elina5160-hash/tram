"use client"
import { useState } from "react"
import { AdminLogin } from "@/components/admin/AdminLogin"
import { ProductList } from "@/components/admin/ProductList"
import { ProductForm } from "@/components/admin/ProductForm"
import { BottomBannerEditor } from "./BottomBannerEditor"
import { useProducts } from "@/hooks/useProducts"

interface AdminPanelProps {
  onClose: () => void
}

type Tab = 'products' | 'bottom-banner'

export function AdminPanel({ onClose }: AdminPanelProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('products')
  const [editingProduct, setEditingProduct] = useState<any | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [mode, setMode] = useState<'initial' | 'list' | 'form'>('initial')
  const { products, isLoading, addProduct, updateProduct, deleteProduct } = useProducts()

  // Reset mode when tab changes
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    setMode('initial')
    setEditingProduct(null)
    setIsCreating(false)
  }

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
          <AdminLogin onLogin={() => setIsAuthenticated(true)} />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-10">
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-4xl shadow-xl min-h-[500px] flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-6">
            <h2 className="text-2xl font-bold">Админ-панель</h2>
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                <button
                    onClick={() => handleTabChange('products')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'products' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Товары
                </button>
                <button
                    onClick={() => handleTabChange('bottom-banner')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'bottom-banner' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Нижняя панель
                </button>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2"
          >
            ✕ Закрыть
          </button>
        </div>

        {activeTab === 'products' ? (
            mode === 'initial' ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-6">
                <button
                  onClick={() => setMode('list')}
                  className="w-64 py-4 text-xl font-medium bg-white border-2 border-blue-600 text-blue-600 rounded-xl hover:bg-blue-50 transition-colors shadow-sm"
                >
                  Изменить товар
                </button>
                <button
                  onClick={() => {
                    setEditingProduct(null)
                    setIsCreating(true)
                    setMode('form')
                  }}
                  className="w-64 py-4 text-xl font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-md"
                >
                  Добавить товар
                </button>
              </div>
            ) : mode === 'form' || isCreating || editingProduct ? (
            <ProductForm 
                initialData={editingProduct}
                onSubmit={async (data: any) => {
                try {
                    if (editingProduct) {
                    await updateProduct(editingProduct.id, data)
                    } else {
                    await addProduct(data)
                    }
                    setEditingProduct(null)
                    setIsCreating(false)
                    setMode('initial')
                } catch (e) {
                    alert("Ошибка сохранения")
                }
                }}
                onCancel={() => {
                setEditingProduct(null)
                setIsCreating(false)
                setMode('initial')
                }}
            />
            ) : (
            <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <button
                    onClick={() => setMode('initial')}
                    className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
                  >
                    ← Назад
                  </button>
                  <button
                      onClick={() => {
                        setIsCreating(true)
                        setMode('form')
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                      + Добавить товар
                  </button>
                </div>
                {isLoading ? (
                <div className="flex-1 flex items-center justify-center">Загрузка...</div>
                ) : (
                <ProductList 
                    products={products} 
                    onEdit={(product: any) => {
                      setEditingProduct(product)
                      setMode('form')
                    }}
                    onDelete={async (id: number) => {
                    if (confirm("Вы уверены?")) {
                        await deleteProduct(id)
                    }
                    }}
                />
                )}
            </div>
            )
        ) : (
            <BottomBannerEditor />
        )}
      </div>
    </div>
  )
}
