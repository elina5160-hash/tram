/* eslint-disable @typescript-eslint/no-explicit-any */
export async function sendToGoogleSheet(orderData: any): Promise<any> {
  // Web App URL provided by user
  const SCRIPT_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL || "https://script.google.com/macros/s/AKfycbwevBSpHdLKyj8MlM8rAPkSPlFRf-oCL_U0zNerFVkOerSCjDIy2WqbjPvyC0hBq1Oq0g/exec"
  
  try {
    const info = orderData.customer_info || {};
    const username = info.username ? String(info.username).replace('@', '') : '';
    const telegramFirstName = info.first_name || info.name || '';
    
    // Construct address block
    const addressBlockParts = [
        info.name,
        info.phone,
        info.email,
        info.address,
        info.cdek
    ].filter(Boolean);
    const addressBlock = addressBlockParts.join('\n');

    const items = Array.isArray(orderData.items) ? orderData.items : [];
    
    // Fallback if no items array but we have total (should not happen in correct flow)
    if (items.length === 0) {
        items.push({
            name: "Заказ",
            quantity: 1,
            sum: orderData.total_amount || 0
        });
    }

    // Use Promise.all to send requests in parallel
    const promises = items.map(async (item: any) => {
        // Mapping based on screenshot and requirements:
        // A: ORDER ID
        // B: USER ID
        // C: USER ID LINK
        // D: USERNAME
        // E: USERNAME LINK
        // F: FIRST NAME
        // G: DATA
        // H: TOTAL (Item Sum)
        // I: PRODUCT
        // J: PARTNER PROMO
        // K: STATUS
        // L: TRACK NUMBER
        // M: DELIVERY DATA
        // N: COMMENTS
        // O: TRACK SENDING

        const values = [
            orderData.id || "", // A: ORDER ID
            info.client_id || info.user_id || "", // B: USER ID
            "https://tram-navy.vercel.app/home", // C: USER ID LINK
            username, // D: USERNAME
            username ? `https://t.me/${username}` : "", // E: USERNAME LINK
            telegramFirstName, // F: FIRST NAME
            new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }), // G: DATA
            item.sum || 0, // H: TOTAL (Item Sum)
            item.name || "Товар", // I: PRODUCT
            orderData.promo_code || "", // J: PARTNER PROMO
            "", // K: STATUS
            "", // L: TRACK NUMBER
            addressBlock, // M: DELIVERY DATA
            orderData.ref_code || "", // N: COMMENTS
            "", // O: TRACK SENDING
            "", // P: CATEGORIES
            "", // Q: DELIVERY MONEY
            "", // R: CHECK
            "", // S: OK
            item.quantity || 1 // T: QUANTITY
        ];

        const payload = { values };

        console.log(`Sending item "${item.name}" to Google Sheets...`);
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s hard timeout

            const response = await fetch(SCRIPT_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                redirect: "follow", // Follow redirects (Google Scripts often redirect)
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            // 200 OK (final destination) or 302 (if manual)
            if (response.ok || response.status === 302) {
                return { status: "ok", item: item.name };
            } else {
                const text = await response.text();
                console.error(`Google Sheets error for item ${item.name}:`, response.status, text);
                return { status: "error", code: response.status, text };
            }
        } catch (e: any) {
             if (e.name === 'AbortError') {
                 console.error(`Google Sheets timeout for item ${item.name}`);
                 return { status: "error", error: "Timeout" };
             }
             console.error(`Fetch error for item ${item.name}:`, e);
             return { status: "error", error: String(e) };
        }
    });

    const results = await Promise.all(promises);
    
    return { results };

  } catch (error) {
    console.error("Error in sendToGoogleSheet:", error)
    return { error: String(error) }
  }
}
