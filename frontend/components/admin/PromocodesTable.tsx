
import { useState, useEffect } from "react"

export function PromocodesTable() {
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [dateFilter, setDateFilter] = useState("")
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        fetch('/api/admin/promocodes/usage')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setOrders(data)
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [])

    const filtered = orders.filter(o => {
        let matches = true
        
        if (dateFilter) {
            const d = new Date(o.created_at || o.updated_at).toISOString().split('T')[0]
            if (d !== dateFilter) matches = false
        }

        if (matches && searchQuery) {
            const q = searchQuery.toLowerCase()
            const idMatch = String(o.id).toLowerCase().includes(q)
            const nameMatch = o.customer_info?.name?.toLowerCase().includes(q)
            const usernameMatch = o.customer_info?.username?.toLowerCase().includes(q)
            const userIdMatch = String(o.customer_info?.user_id || "").toLowerCase().includes(q)
            
            if (!idMatch && !nameMatch && !usernameMatch && !userIdMatch) matches = false
        }

        return matches
    })

    const exportCSV = () => {
        const headers = ["ID Заказа", "Дата", "Промокод", "Сумма заказа", "Скидка", "Клиент", "Email", "Телефон"]
        const rows = filtered.map(o => [
            o.id,
            new Date(o.created_at || o.updated_at).toLocaleString('ru-RU'),
            o.promo_code,
            o.total_amount,
            o.customer_info?.discount_amount || 0,
            o.customer_info?.name || "",
            o.customer_info?.email || "",
            o.customer_info?.phone || ""
        ])
        
        const csvContent = [
            headers.join(";"),
            ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";"))
        ].join("\n")

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `promocodes_usage_${new Date().toISOString().split('T')[0]}.csv`
        link.click()
    }

    if (loading) return <div>Загрузка...</div>

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4 p-4 bg-gray-50 rounded-lg shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <label className="text-sm font-medium">Фильтр по дате:</label>
                    <input 
                        type="date" 
                        value={dateFilter} 
                        onChange={e => setDateFilter(e.target.value)}
                        className="border rounded p-1"
                    />
                    {dateFilter && (
                        <button onClick={() => setDateFilter("")} className="text-sm text-red-500">
                            Сбросить
                        </button>
                    )}
                    
                    <div className="h-6 w-px bg-gray-300 mx-2" />
                    
                    <label className="text-sm font-medium">Поиск:</label>
                    <input 
                        type="text" 
                        placeholder="ID, имя или ник"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="border rounded p-1 w-48"
                    />
                </div>
                <button 
                    onClick={exportCSV}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm whitespace-nowrap"
                >
                    Экспорт в CSV
                </button>
            </div>

            <div className="overflow-auto flex-1 border rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 sticky top-0 z-10">
                        <tr>
                            <th className="p-3 border font-semibold">ID Заказа</th>
                            <th className="p-3 border font-semibold">Дата</th>
                            <th className="p-3 border font-semibold">Промокод</th>
                            <th className="p-3 border font-semibold">Сумма</th>
                            <th className="p-3 border font-semibold">Скидка</th>
                            <th className="p-3 border font-semibold">Клиент</th>
                            <th className="p-3 border font-semibold">Контакты</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(o => (
                            <tr key={o.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 border text-gray-600">{o.id}</td>
                                <td className="p-3 border">{new Date(o.created_at || o.updated_at).toLocaleString('ru-RU')}</td>
                                <td className="p-3 border">
                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">
                                        {o.promo_code}
                                    </span>
                                </td>
                                <td className="p-3 border font-medium">{Number(o.total_amount).toLocaleString('ru-RU')} руб.</td>
                                <td className="p-3 border text-green-600 font-medium">
                                    {o.customer_info?.discount_amount ? `${Number(o.customer_info.discount_amount).toLocaleString('ru-RU')} руб.` : '-'}
                                </td>
                                <td className="p-3 border font-medium">{o.customer_info?.name || "Не указано"}</td>
                                <td className="p-3 border">
                                    <div className="flex flex-col text-xs text-gray-500 gap-1">
                                        {o.customer_info?.email && (
                                            <span className="flex items-center gap-1">
                                                📧 {o.customer_info.email}
                                            </span>
                                        )}
                                        {o.customer_info?.phone && (
                                            <span className="flex items-center gap-1">
                                                📞 {o.customer_info.phone}
                                            </span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={7} className="p-8 text-center text-gray-500">
                                    Нет записей об использовании промокодов
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
