"use client"
import { useState, useEffect } from "react"
import { AdminLogin } from "@/components/admin/AdminLogin"
import { ProductList } from "@/components/admin/ProductList"
import { ProductForm } from "@/components/admin/ProductForm"
import { BottomBannerEditor } from "./BottomBannerEditor"
import { ContestTable } from "./ContestTable"
import { OrdersTable } from "./OrdersTable"
import { useProducts } from "@/hooks/useProducts"

interface AdminPanelProps {
  onClose: () => void
}

type Tab = 'products' | 'bottom-banner' | 'contest' | 'orders'

export function AdminPanel({ onClose }: AdminPanelProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Auto-login disabled as per request: password 6789 for everyone
    /*
    if (typeof window !== "undefined") {
      const tg = (window as any).Telegram?.WebApp
      if (tg?.initDataUnsafe?.user?.id) {
        const userId = tg.initDataUnsafe.user.id
        const admins = [1287944066, 5137709082]
        if (admins.includes(userId)) {
          setIsAuthenticated(true)
        }
      }
    }
    */
  }, [])

  const [activeTab, setActiveTab] = useState<Tab>('orders')
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 md:p-10">
      <div className="relative bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 border-b shrink-0 gap-4">
          <div className="flex flex-col gap-4 w-full">
            <div className="flex items-center justify-between w-full">
              <h2 className="text-2xl font-bold">Админ-панель</h2>
              {/* Close button for mobile (visible on small screens if absolute is hidden or awkward, but we will use absolute for all) */}
            </div>
            
            <div className="flex flex-wrap gap-2 bg-gray-100 p-1 rounded-lg w-full md:w-auto self-start">
                <button
                    onClick={() => handleTabChange('products')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'products' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Товары
                </button>
                <button
                    onClick={() => handleTabChange('bottom-banner')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'bottom-banner' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Баннер
                </button>
                <button
                    onClick={() => handleTabChange('contest')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'contest' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Конкурс
                </button>
                <button
                    onClick={() => handleTabChange('orders')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'orders' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Заказы
                </button>
            </div>
          </div>
          
          {/* Close Button - Absolute Position for consistent access */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            title="Закрыть"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">

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
                    const button = document.activeElement as HTMLButtonElement;
                    if (button) button.disabled = true;
                    
                    if (editingProduct) {
                    await updateProduct(editingProduct.id, data)
                    } else {
                    await addProduct(data)
                    }
                    alert('Товар успешно сохранен!');
                    setEditingProduct(null)
                    setIsCreating(false)
                    setMode('list') // Go back to list instead of initial
                } catch (e: any) {
                    alert("Ошибка сохранения: " + e.message)
                    const button = document.activeElement as HTMLButtonElement;
                    if (button) button.disabled = false;
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
                <div className="sticky top-0 z-10 bg-white pt-1 pb-3 -mt-1 border-b flex justify-between items-center">
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
        ) : activeTab === 'contest' ? (
            <ContestTable />
        ) : activeTab === 'orders' ? (
            <OrdersTable />
        ) : (
            <BottomBannerEditor onBack={() => { setActiveTab('products'); setMode('initial') }} />
        )}
      </div>
    </div>
  </div>
  )
}
