"use client"

import { motion } from "framer-motion"

interface OrderDetailsProps {
  order: any
  onBack: () => void
}

export function OrderDetails({ order, onBack }: OrderDetailsProps) {
  if (!order) return null

  const customer = order.customer_info || {}
  const items = order.items || []

  return (
    <div className="flex flex-col h-full bg-white rounded-lg">
      <div className="flex items-center gap-4 mb-6 pb-4 border-b">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 text-gray-600"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Назад
        </button>
        <h2 className="text-xl font-bold">Заказ #{order.id}</h2>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            order.status === 'Оплачен' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
        }`}>
            {order.status}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-8">
        {/* Main Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">Информация о покупателе</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Имя:</span>
                <span className="font-medium">{customer.name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Телефон:</span>
                <span className="font-medium">{customer.phone || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email:</span>
                <span className="font-medium">{customer.email || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Адрес:</span>
                <span className="font-medium text-right max-w-[200px]">{customer.address || customer.cdek || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Telegram ID:</span>
                <span className="font-medium">{customer.client_id || "—"}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">Детали заказа</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Дата создания:</span>
                <span className="font-medium">{new Date(order.created_at).toLocaleString("ru-RU")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Дата обновления:</span>
                <span className="font-medium">{order.updated_at ? new Date(order.updated_at).toLocaleString("ru-RU") : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Промокод:</span>
                <span className="font-medium">{order.promo_code || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Реферал:</span>
                <span className="font-medium">{order.ref_code || "—"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div>
          <h3 className="font-semibold text-gray-900 border-b pb-2 mb-4">Товары</h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Наименование</th>
                  <th className="px-4 py-3 text-right">Кол-во</th>
                  <th className="px-4 py-3 text-right">Цена</th>
                  <th className="px-4 py-3 text-right">Сумма</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {typeof items === 'string' ? (
                     <tr>
                        <td colSpan={4} className="px-4 py-4">
                            <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-lg border">
                                {items}
                            </pre>
                        </td>
                     </tr>
                ) : items.length === 0 ? (
                    <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">Список товаров пуст (возможно старый формат заказа)</td>
                    </tr>
                ) : (
                    items.map((item: any, i: number) => (
                        <tr key={i}>
                            <td className="px-4 py-3">{item.name || item.n || "Товар"}</td>
                            <td className="px-4 py-3 text-right">{item.quantity || item.q || 1}</td>
                            <td className="px-4 py-3 text-right">{(item.cost || item.s || 0).toLocaleString()} ₽</td>
                            <td className="px-4 py-3 text-right font-medium">
                                {((item.quantity || item.q || 1) * (item.cost || item.s || 0)).toLocaleString()} ₽
                            </td>
                        </tr>
                    ))
                )}
              </tbody>
              <tfoot className="bg-gray-50 font-medium">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right">Итого:</td>
                  <td className="px-4 py-3 text-right text-lg">{Number(order.total_amount).toLocaleString()} ₽</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
