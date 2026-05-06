import { Link } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'

export default function UnauthorizedPage() {
  const { logout } = useAuthStore()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f6f9] p-6">
      <div className="text-center max-w-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 mx-auto mb-4">
          <ShieldOff className="h-8 w-8 text-danger" />
        </div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Ingen adgang</h1>
        <p className="mt-2 text-sm text-gray-500">
          Du har ikke tilladelse til at tilgå denne side.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Button asChild>
            <Link to="/">Gå til forsiden</Link>
          </Button>
          <Button variant="secondary" onClick={() => logout()}>
            Log ud
          </Button>
        </div>
      </div>
    </div>
  )
}
