import { useToastStore } from '@/hooks/useToast'
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from './toast'

export function Toaster() {
  const { toasts, dismiss } = useToastStore()

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, variant }) => (
        <Toast key={id} variant={variant} onOpenChange={(open) => { if (!open) dismiss(id) }}>
          <div className="flex-1 min-w-0">
            <ToastTitle>{title}</ToastTitle>
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
