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
      <div className="mb-4">
        <input
          type="text"
          placeholder="Поиск товара..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex-1 overflow-y-auto pr-2">
        <div className="grid grid-cols-1 gap-4">
          {filteredProducts.map((product) => (
            <div 
              key={product.id} 
              className="flex items-center gap-4 p-4 border rounded-xl hover:shadow-md transition-shadow bg-gray-50"
            >
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
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 truncate">{product.title}</h4>
                <p className="text-sm text-gray-500">{product.price}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(product)}
                  className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Изменить
                </button>
                <button
                  onClick={() => onDelete(product.id)}
                  className="px-3 py-1.5 text-sm bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100"
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
