import { useState, useCallback } from 'react'

interface ToastItem {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'success' | 'error'
}

let externalSetToasts: React.Dispatch<React.SetStateAction<ToastItem[]>> | null = null

export function useToastStore() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  externalSetToasts = setToasts

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, dismiss }
}

export function toast(options: Omit<ToastItem, 'id'>) {
  const id = Math.random().toString(36).slice(2)
  externalSetToasts?.((prev) => [...prev, { ...options, id }])
  setTimeout(() => {
    externalSetToasts?.((prev) => prev.filter((t) => t.id !== id))
  }, 4000)
}
