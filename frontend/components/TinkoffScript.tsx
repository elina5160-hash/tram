'use client'

import Script from 'next/script'
import { useEffect } from 'react'

declare global {
  interface Window {
    PaymentIntegration: any
    onPaymentIntegrationLoad: () => void
  }
}

export function TinkoffScript() {
  useEffect(() => {
    // Define the callback function that the script calls onload
    window.onPaymentIntegrationLoad = () => {
      const initConfig = {
        terminalKey: '1765992881356',
        product: 'eacq',
        features: {
           payment: {}, // Enables payment buttons widget
           iframe: {}   // Enables iframe payment form
        }
      }
      
      if (window.PaymentIntegration) {
          window.PaymentIntegration.init(initConfig)
            .then(() => {
                console.log("✅ Tinkoff PaymentIntegration initialized successfully")
            })
            .catch((e: any) => {
                console.error("❌ Tinkoff PaymentIntegration init error:", e)
            })
      }
    }
    
    // Fallback: If script loaded before we defined callback, try init manually
    if (typeof window !== 'undefined' && window.PaymentIntegration) {
        window.onPaymentIntegrationLoad()
    }
  }, [])

  return (
    <Script 
      src="https://integrationjs.tbank.ru/integration.js" 
      onLoad={() => {
        if (window.onPaymentIntegrationLoad) {
            window.onPaymentIntegrationLoad()
        }
      }}
      strategy="afterInteractive"
    />
  )
}
