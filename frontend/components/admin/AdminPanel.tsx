"use client"
import { useState, useEffect } from "react"
import { AdminLogin } from "@/components/admin/AdminLogin"
import { ProductList } from "@/components/admin/ProductList"
import { ProductForm } from "@/components/admin/ProductForm"
import { BottomBannerEditor } from "./BottomBannerEditor"
import { ContestTable } from "./ContestTable"
import { OrdersTable } from "./OrdersTable"
import { PromocodesTable } from "./PromocodesTable"
import { useProducts } from "@/hooks/useProducts"

interface AdminPanelProps {
  onClose: () => void
}

type Tab = 'products' | 'bottom-banner' | 'contest' | 'orders' | 'promocodes'

export function AdminPanel({ onClose }: AdminPanelProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Auto-login disabled as per request
  }, [])

  const [activeTab, setActiveTab] = useState<Tab>('orders')
  const [editingProduct, setEditingProduct] = useState<any | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  
  // We don't need 'mode' anymore if we simplify: List is default, Form is overlay/switch
  const { products, isLoading, addProduct, updateProduct, deleteProduct } = useProducts()

  // Reset state when tab changes
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    setEditingProduct(null)
    setIsCreating(false)
  }

  const handleBulkDelete = async (ids: number[]) => {
      try {
          // Sequential delete to avoid race conditions or backend limits
          for (const id of ids) {
              await deleteProduct(id)
          }
      } catch (e) {
          alert('Ошибка при удалении: ' + e)
      }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm md:p-10">
      <div className="relative bg-white md:rounded-2xl w-full max-w-6xl shadow-2xl flex flex-col h-full md:h-auto md:max-h-[90vh] overflow-hidden">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 md:p-6 border-b shrink-0 gap-4">
          <div className="flex flex-col gap-4 w-full">
            <div className="flex items-center justify-between w-full">
              <h2 className="text-xl md:text-2xl font-bold">Админ-панель</h2>
              <button 
                onClick={onClose}
                className="md:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors -mr-2"
                title="Закрыть"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex overflow-x-auto pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 gap-2 no-scrollbar">
                <button
                    onClick={() => handleTabChange('orders')}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'orders' ? 'bg-gray-900 text-white shadow' : 'bg-gray-100 text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Заказы
                </button>
                <button
                    onClick={() => handleTabChange('products')}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'products' ? 'bg-gray-900 text-white shadow' : 'bg-gray-100 text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Товары
                </button>
                <button
                    onClick={() => handleTabChange('contest')}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'contest' ? 'bg-gray-900 text-white shadow' : 'bg-gray-100 text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Конкурс
                </button>
                <button
                    onClick={() => handleTabChange('promocodes')}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'promocodes' ? 'bg-gray-900 text-white shadow' : 'bg-gray-100 text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Промокоды
                </button>
                <button
                    onClick={() => handleTabChange('bottom-banner')}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'bottom-banner' ? 'bg-gray-900 text-white shadow' : 'bg-gray-100 text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Баннер
                </button>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="hidden md:block absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            title="Закрыть"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50/50">

        {activeTab === 'products' ? (
            isCreating || editingProduct ? (
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
                            // alert('Товар успешно сохранен!'); // Optional: removed for smoother UX
                            setEditingProduct(null)
                            setIsCreating(false)
                        } catch (e: any) {
                            alert("Ошибка сохранения: " + e.message)
                            const button = document.activeElement as HTMLButtonElement;
                            if (button) button.disabled = false;
                        }
                    }}
                    onCancel={() => {
                        setEditingProduct(null)
                        setIsCreating(false)
                    }}
                />
            ) : (
                <div className="flex flex-col h-full gap-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Управление товарами</h3>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                        >
                            <span className="text-xl leading-none">+</span> Добавить товар
                        </button>
                    </div>
                    {isLoading ? (
                        <div className="flex-1 flex items-center justify-center text-gray-500">Загрузка товаров...</div>
                    ) : (
                        <ProductList 
                            products={products} 
                            onEdit={(product: any) => setEditingProduct(product)}
                            onDelete={async (id: number) => {
                                // confirm handled in ProductList, but double check logic
                                await deleteProduct(id)
                            }}
                            onBulkDelete={handleBulkDelete}
                        />
                    )}
                </div>
            )
        ) : activeTab === 'contest' ? (
            <ContestTable />
        ) : activeTab === 'orders' ? (
            <OrdersTable />
        ) : activeTab === 'promocodes' ? (
            <PromocodesTable />
        ) : (
            <BottomBannerEditor onBack={() => setActiveTab('products')} />
        )}
      </div>
    </div>
  </div>
  )
}
