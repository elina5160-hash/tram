"use client"
import { useState, useMemo } from "react"
import Image from "next/image"
import { 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  CheckSquare, 
  Square,
  Plus
} from "lucide-react"

interface Product {
  id: number
  title: string
  price: string
  image: string
  category?: string
  description?: string
  composition?: string
  // DB fields
  is_new?: boolean
  is_bestseller?: boolean
  is_promotion?: boolean
}

interface ProductListProps {
  products: Product[]
  onEdit: (product: Product) => void
  onDelete: (id: number) => void
  onBulkDelete?: (ids: number[]) => void
}

type SortKey = 'id' | 'title' | 'price' | 'category' | 'date'
type SortDirection = 'asc' | 'desc'

export function ProductList({ products, onEdit, onDelete, onBulkDelete }: ProductListProps) {
  // State
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'id', direction: 'asc' })
  const [filters, setFilters] = useState({
    category: 'all',
    type: 'all' // all, new, sale, hit
  })
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Helpers for statuses
  const getProductStatus = (p: Product) => {
    // Prefer explicit DB flags if any of them are set
    if (p.is_promotion !== undefined || p.is_bestseller !== undefined || p.is_new !== undefined) {
      return {
        isPromo: p.is_promotion ?? false,
        isBestseller: p.is_bestseller ?? false,
        isNew: p.is_new ?? false
      }
    }

    // Fallback logic
    const priceVal = parseInt(p.price.replace(/\D/g, '')) || 0
    const isCheap = priceVal > 0 && priceVal < 1000
    const isPromo = [2, 6].includes(p.id) || p.title.toLowerCase().includes("акция") || isCheap
    const isBestseller = [1, 7, 3, 4].includes(p.id)
    const isNew = true

    return { isPromo, isBestseller, isNew }
  }

  // Filter & Sort Logic
  const processedProducts = useMemo(() => {
    let result = [...products]

    // 1. Search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase()
      result = result.filter(p => 
        p.title.toLowerCase().includes(lower) || 
        p.description?.toLowerCase().includes(lower) ||
        p.category?.toLowerCase().includes(lower)
      )
    }

    // 2. Filters
    if (filters.category !== 'all') {
      result = result.filter(p => p.category === filters.category)
    }

    if (filters.type !== 'all') {
      result = result.filter(p => {
        const status = getProductStatus(p)
        if (filters.type === 'sale') return status.isPromo
        if (filters.type === 'hit') return status.isBestseller
        if (filters.type === 'new') return status.isNew
        return true
      })
    }

    // 3. Sort
    result.sort((a, b) => {
      const modifier = sortConfig.direction === 'asc' ? 1 : -1
      
      switch (sortConfig.key) {
        case 'price':
          const priceA = parseInt(a.price.replace(/\D/g, '')) || 0
          const priceB = parseInt(b.price.replace(/\D/g, '')) || 0
          return (priceA - priceB) * modifier
        case 'title':
          return a.title.localeCompare(b.title) * modifier
        case 'category':
          return (a.category || '').localeCompare(b.category || '') * modifier
        default:
          return (a.id - b.id) * modifier
      }
    })

    return result
  }, [products, searchTerm, filters, sortConfig])

  // Pagination
  const totalPages = Math.ceil(processedProducts.length / itemsPerPage)
  const paginatedProducts = processedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Handlers
  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) newSelected.delete(id)
    else newSelected.add(id)
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedProducts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginatedProducts.map(p => p.id)))
    }
  }

  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const uniqueCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)))

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по названию, описанию..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <button 
                onClick={() => {
                    if (confirm(`Удалить ${selectedIds.size} товаров?`)) {
                        onBulkDelete?.(Array.from(selectedIds))
                        setSelectedIds(new Set())
                    }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden md:inline">Удалить ({selectedIds.size})</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select 
            value={filters.category}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            className="px-3 py-1.5 text-sm border rounded-md bg-gray-50 hover:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">Все категории</option>
            {uniqueCategories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select 
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            className="px-3 py-1.5 text-sm border rounded-md bg-gray-50 hover:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">Все типы</option>
            <option value="sale">Скидки и акции</option>
            <option value="hit">Выбор покупателей</option>
            <option value="new">Новинки</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10 border-b">
            <tr>
              <th className="p-4 w-10">
                <button onClick={toggleSelectAll} className="flex items-center justify-center">
                  {selectedIds.size > 0 && selectedIds.size === paginatedProducts.length ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </th>
              <th className="p-4 font-medium text-gray-500">Фото</th>
              <th 
                className="p-4 font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                onClick={() => handleSort('title')}
              >
                <div className="flex items-center gap-1">
                  Название
                  {sortConfig.key === 'title' && (
                    sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th 
                className="p-4 font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                onClick={() => handleSort('price')}
              >
                <div className="flex items-center gap-1">
                  Цена
                  {sortConfig.key === 'price' && (
                    sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th 
                className="p-4 font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center gap-1">
                  Категория
                  {sortConfig.key === 'category' && (
                    sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </th>
              <th className="p-4 font-medium text-gray-500">Метки</th>
              <th className="p-4 font-medium text-gray-500 text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedProducts.map((product) => {
              const status = getProductStatus(product)
              return (
                <tr key={product.id} className="hover:bg-gray-50 group">
                  <td className="p-4">
                    <button onClick={() => toggleSelect(product.id)}>
                      {selectedIds.has(product.id) ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-300 group-hover:text-gray-400" />
                      )}
                    </button>
                  </td>
                  <td className="p-4 text-gray-500 text-sm">#{product.id}</td>
                  <td className="p-4">
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden border bg-white">
                       {product.image?.endsWith('.mp4') ? (
                        <video src={product.image} className="w-full h-full object-cover" muted />
                      ) : (
                        <Image 
                          src={product.image || '/placeholder.png'} 
                          alt={product.title} 
                          fill 
                          className="object-cover" 
                        />
                      )}
                    </div>
                  </td>
                  <td className="p-4 font-medium text-gray-900">{product.title}</td>
                  <td className="p-4 text-gray-600">{product.price}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                      {product.category || 'Без категории'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1 flex-wrap">
                      {status.isPromo && (
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-medium">SALE</span>
                      )}
                      {status.isBestseller && (
                        <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[10px] font-medium">HIT</span>
                      )}
                      {status.isNew && (
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-medium">NEW</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => onEdit(product)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Редактировать"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                            if (confirm('Удалить товар?')) onDelete(product.id)
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        
        {paginatedProducts.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            Ничего не найдено
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="p-4 border-t flex items-center justify-between text-sm text-gray-500">
        <div>
          Показано {paginatedProducts.length} из {processedProducts.length}
        </div>
        <div className="flex gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white"
          >
            Назад
          </button>
          <div className="px-2 py-1">
            {currentPage} / {totalPages || 1}
          </div>
          <button
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage(p => p + 1)}
            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white"
          >
            Вперед
          </button>
        </div>
      </div>
    </div>
  )
}
