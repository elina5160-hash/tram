"use client"
import { useState } from "react"
import Image from "next/image"

interface Product {
  id: number
  title: string
  price: string
  image: string
  category?: string
}

interface ProductListProps {
  products: Product[]
  onEdit: (product: Product) => void
  onDelete: (id: number) => void
}

export function ProductList({ products, onEdit, onDelete }: ProductListProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredProducts = products.filter(product =>
    product.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="sticky top-0 z-10 bg-white pt-2 pb-3 -mt-2 border-b mb-3">
        <input
          type="text"
          placeholder="Поиск товара..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:pr-2 md:pt-2">
        <div className="grid grid-cols-1 gap-4">
          {filteredProducts.map((product) => (
            <div 
              key={product.id} 
              className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 border rounded-xl hover:shadow-md transition-shadow bg-gray-50"
            >
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="relative w-16 h-16 flex-shrink-0 bg-white rounded-lg overflow-hidden border">
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
                <div className="flex-1 min-w-0 md:w-48">
                  <h4 className="font-semibold text-gray-900 truncate">{product.title}</h4>
                  <p className="text-sm text-gray-500">{product.price}</p>
                </div>
              </div>
              
              <div className="flex gap-2 w-full md:w-auto md:ml-auto">
                <button
                  onClick={() => onEdit(product)}
                  className="flex-1 md:flex-none px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  Изменить
                </button>
                <button
                  onClick={() => onDelete(product.id)}
                  className="flex-1 md:flex-none px-4 py-2 text-sm font-medium bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 active:bg-red-200 transition-colors"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
