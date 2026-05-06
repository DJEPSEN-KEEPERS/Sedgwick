import { useState, useRef, useEffect } from 'react'
import { Bell, Check, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotifications } from '@/hooks/useNotifications'
import { formatRelativeTime } from '@/lib/utils'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors"
        aria-label="Notifikationer"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-[#e5e7eb] bg-white shadow-elevated">
          <div className="flex items-center justify-between border-b border-[#e5e7eb] px-4 py-3">
            <span className="font-display font-semibold text-sm text-gray-900">Notifikationer</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-primary-600 hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Markér alle som læst
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">Ingen notifikationer</div>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 border-b border-[#e5e7eb] cursor-pointer hover:bg-gray-50 transition-colors',
                    n.status === 'pending' && 'bg-primary-50',
                  )}
                  onClick={() => n.status === 'pending' && markRead(n.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-display font-semibold text-gray-900 truncate">{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{formatRelativeTime(n.createdAt)}</p>
                  </div>
                  {n.status === 'pending' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markRead(n.id) }}
                      className="shrink-0 text-primary-600 hover:text-primary-800"
                      title="Markér som læst"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
