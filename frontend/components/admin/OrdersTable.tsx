"use client"
import { useEffect, useMemo, useState } from "react"
import { OrderDetails } from "./OrderDetails"

type OrderRow = {
  id: number
  created_at: string
  updated_at?: string
  paid_at?: string
  total_amount: number
  status: string
  customer_info?: any
  promo_code?: string
  ref_code?: string
  items?: any[]
}

export function OrdersTable() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null)
  const [totalRevenue, setTotalRevenue] = useState(0)

  useEffect(() => {
    let timer: any
    const load = async () => {
      try {
        const res = await fetch("/api/admin/orders")
        const data = await res.json()
        if (Array.isArray(data)) {
            setOrders(data)
            // Fallback calculation
            const rev = data.reduce((sum, o) => {
                 const isPaid = o.status === 'Оплачен' || o.status === 'paid'
                 return isPaid ? sum + Number(o.total_amount || 0) : sum
            }, 0)
            setTotalRevenue(rev)
        } else if (data.orders && Array.isArray(data.orders)) {
            setOrders(data.orders)
            setTotalRevenue(data.stats?.totalRevenue || 0)
        }
      } catch {}
      setLoading(false)
    }
    load()
    timer = setInterval(load, 10000)
    return () => { try { clearInterval(timer) } catch {} }
  }, [])

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return orders.filter((o) => {
      const name = String(o?.customer_info?.name || "").toLowerCase()
      const phone = String(o?.customer_info?.phone || "").toLowerCase()
      const email = String(o?.customer_info?.email || "").toLowerCase()
      const address = String(o?.customer_info?.address || o?.customer_info?.cdek || "").toLowerCase()
      const idMatch = String(o.id).includes(q)
      const custMatch = name.includes(q) || phone.includes(q) || email.includes(q) || address.includes(q)
      const codeMatch = String(o.promo_code || "").toLowerCase().includes(q) || String(o.ref_code || "").toLowerCase().includes(q)
      return idMatch || custMatch || codeMatch
    })
  }, [orders, filter])

  if (loading) return <div className="p-4">Загрузка...</div>

  if (selectedOrder) {
    return <OrderDetails order={selectedOrder} onBack={() => setSelectedOrder(null)} />
  }

  return (
    <div className="space-y-4 h-full flex flex-col pt-5">
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="text-sm text-gray-500 font-medium">Общая выручка (оплаченные заказы)</div>
        <div className="text-2xl font-bold text-green-600 mt-1">{totalRevenue.toLocaleString()} руб.</div>
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-2">
            <button
                onClick={() => window.history.back()}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
                ← Назад
            </button>
            <button
            onClick={() => {
                const headers = ["ID", "Статус", "Сумма", "Имя", "Телефон", "Email", "Адрес", "Промокод", "Реферал", "Дата"]
                const rows = filtered.map((o) => [
                o.id,
                o.status,
                o.total_amount,
                String(o?.customer_info?.name || ""),
                String(o?.customer_info?.phone || ""),
                String(o?.customer_info?.email || ""),
                String(o?.customer_info?.address || o?.customer_info?.cdek || ""),
                String(o.promo_code || ""),
                String(o.ref_code || ""),
                new Date(o.paid_at || o.created_at).toLocaleString("ru-RU"),
                ])
                const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '"')}` + `"`).join(","))].join("\n")
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.setAttribute("download", "orders.csv")
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
            }}
            className="rounded-lg bg-green-600 px-4 py-2 text-white text-sm hover:bg-green-700 flex-1 md:flex-none justify-center"
            >
            Экспорт CSV
            </button>
        </div>
        <input
          type="text"
          placeholder="Поиск по ID, имени, телефону, email"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-base md:text-sm"
        />
      </div>

      <div className="rounded-lg border border-gray-200 overflow-hidden flex-1 overflow-y-auto bg-gray-50 md:bg-white">
        {/* Desktop Table View */}
        <table className="w-full text-sm text-left hidden md:table">
          <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200 sticky top-0">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3">Сумма</th>
              <th className="px-4 py-3">Покупатель</th>
              <th className="px-4 py-3">Контакты</th>
              <th className="px-4 py-3">Код</th>
              <th className="px-4 py-3">Дата</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {filtered.map((o) => (
              <tr 
                key={o.id} 
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setSelectedOrder(o)}
              >
                <td className="px-4 py-3 font-medium text-gray-900">
                    <span className="text-blue-600 hover:underline">{o.id}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    o.status === 'Оплачен' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {o.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium whitespace-nowrap">
                  {Number(o.total_amount).toLocaleString()} руб.
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{o.customer_info?.name || "—"}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-gray-900">{o.customer_info?.phone}</div>
                  <div className="text-gray-500 text-xs">{o.customer_info?.email}</div>
                  <div className="text-gray-500 text-xs truncate max-w-[200px]">{o.customer_info?.address || o.customer_info?.cdek}</div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {o.promo_code && <div>Promo: {o.promo_code}</div>}
                  {o.ref_code && <div>Ref: {o.ref_code}</div>}
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                  {new Date(o.paid_at || o.created_at).toLocaleString("ru-RU", {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3 p-3">
          {filtered.map((o) => (
            <div 
                key={o.id}
                onClick={() => setSelectedOrder(o)}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 active:bg-gray-50 transition-colors"
            >
                <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col">
                        <span className="font-bold text-lg text-gray-900">#{o.id}</span>
                        <span className="text-xs text-gray-500">
                            {new Date(o.paid_at || o.created_at).toLocaleString("ru-RU", {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                            })}
                        </span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        o.status === 'Оплачен' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                        {o.status}
                    </span>
                </div>
                
                <div className="space-y-2 mb-3">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-sm">Сумма:</span>
                        <span className="font-bold text-gray-900">{Number(o.total_amount).toLocaleString()} руб.</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-sm">Клиент:</span>
                        <span className="font-medium text-gray-900 text-right">{o.customer_info?.name || "—"}</span>
                    </div>
                    {o.customer_info?.phone && (
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 text-sm">Телефон:</span>
                            <span className="text-gray-900 text-right">{o.customer_info.phone}</span>
                        </div>
                    )}
                </div>

                {(o.promo_code || o.ref_code) && (
                    <div className="pt-3 border-t border-gray-100 flex gap-2 text-xs text-gray-600">
                        {o.promo_code && <span className="bg-blue-50 px-2 py-1 rounded">Promo: {o.promo_code}</span>}
                        {o.ref_code && <span className="bg-purple-50 px-2 py-1 rounded">Ref: {o.ref_code}</span>}
                    </div>
                )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

