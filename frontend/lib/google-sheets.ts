export async function sendToGoogleSheet(orderData: any): Promise<any> {
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwevBSpHdLKyj8MlM8rAPkSPlFRf-oCL_U0zNerFVkOerSCjDIy2WqbjPvyC0hBq1Oq0g/exec"

  try {
    // Preparing data according to the script requirements:
    // data.values must be an array of values for the row.
    // Columns mapping based on screenshot:
    // A: ORDER ID (Empty)
    // B: USER ID
    // C: USER ID LINK (Empty or generated)
    // D: USERNAME
    // E: USERNAME LINK
    // F: FIRST NAME
    // G: DATA (Date)
    // H: TOTAL
    // I: PRODUCT
    // J: PARTNER PROMO
    // K: STATUS
    // L: TRACK NUMBER (Empty)
    // M: DELIVERY DATA (Combined)
    // N: COMMENTS (Empty)
    // O: TRACK SENDING (Empty)

    const info = orderData.customer_info || {};
    const username = info.username ? String(info.username).replace('@', '') : '';
    
    // Construct address block
    const addressBlockParts = [
        info.name,
        info.phone,
        info.email,
        info.address,
        info.cdek
    ].filter(Boolean); // Remove empty values
    
    const addressBlock = addressBlockParts.join('\n');

    const values = [
        "", // A: ORDER ID (Empty as requested)
        info.client_id || info.user_id || "", // B: USER ID
        "https://tram-navy.vercel.app/home", // C: USER ID LINK
        username, // D: USERNAME
        username ? `https://t.me/${username}` : "", // E: USERNAME LINK
        info.name || "", // F: FIRST NAME
        new Date().toLocaleString("ru-RU"), // G: DATA
        orderData.total_amount || 0, // H: TOTAL
        orderData.items || "", // I: PRODUCT
        orderData.promo_code || "", // J: PARTNER PROMO
        "", // K: STATUS
        "", // L: TRACK NUMBER
        addressBlock, // M: DELIVERY DATA
        orderData.ref_code || "", // N: COMMENTS (Using ref_code or empty)
        "" // O: TRACK SENDING
    ];

    const payload = {
        values: values
    };

    console.log("Sending to Google Sheets (JSON):", JSON.stringify(payload, null, 2))

    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      redirect: "manual",
    })

    const text = await response.text()
    console.log("Google Sheets response:", response.status, text)
    
    // 302 Found means Google accepted the request and is redirecting to the result
    if (response.status === 302 || response.status === 200) {
       return { status: response.status, text: "Request sent (Redirected)" }
    }
    
    return { status: response.status, text }
    
  } catch (error) {
    console.error("Error sending to Google Sheet:", error)
    return { error: String(error) }
  }
}
