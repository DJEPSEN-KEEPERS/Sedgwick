import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import type { Notification } from '@/types'

const POLL_INTERVAL = 30_000

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchUnread = useCallback(async () => {
    try {
      const count = await api.get<{ count: number }>('/notifications/unread-count')
      setUnreadCount(count.count)
    } catch {
      // silent
    }
  }, [])

  const fetchAll = useCallback(async () => {
    try {
      const data = await api.get<Notification[]>('/notifications')
      setNotifications(data)
      setUnreadCount(data.filter((n) => n.status === 'pending').length)
    } catch {
      // silent
    }
  }, [])

  const markRead = useCallback(async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: 'sent' } : n)),
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch {
      // silent
    }
  }, [])

  const markAllRead = useCallback(async () => {
    try {
      await api.post('/notifications/mark-all-read')
      setNotifications((prev) => prev.map((n) => ({ ...n, status: 'sent' })))
      setUnreadCount(0)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    fetchAll()
    intervalRef.current = setInterval(fetchUnread, POLL_INTERVAL)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchAll, fetchUnread])

  return { notifications, unreadCount, markRead, markAllRead, refetch: fetchAll }
}
