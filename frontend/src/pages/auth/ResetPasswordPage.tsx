import { useState, type FormEvent } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const mismatch = confirm.length > 0 && password !== confirm
  const tooShort  = password.length > 0 && password.length < 8

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (mismatch || tooShort) return

    setLoading(true)
    setError('')
    try {
      await api.post('/auth/reset-password', { token, password })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noget gik galt — prøv igen')
    } finally {
      setLoading(false)
    }
  }

  // No token in URL
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9] p-6">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 mx-auto">
            <XCircle className="h-7 w-7 text-red-500" />
          </div>
          <h2 className="text-xl font-display font-bold text-gray-900">Ugyldigt link</h2>
          <p className="text-sm text-gray-500">
            Nulstillingslinket mangler. Anmod om et nyt link via login-siden.
          </p>
          <Button className="w-full" onClick={() => navigate('/login/sedgwick')}>
            Gå til login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f6f9] p-6">
      <div className="w-full max-w-sm">

        {/* Logo + lang switcher */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-800">
              <span className="text-sm font-display font-bold text-white">S</span>
            </div>
            <span className="font-display font-bold text-primary-900">Sedgwick</span>
          </div>
          <LanguageSwitcher />
        </div>

        <div className="bg-white rounded-xl shadow-card border border-[#e5e7eb] p-6">

          {success ? (
            /* ── Success state ── */
            <div className="text-center space-y-4 py-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 mx-auto">
                <CheckCircle className="h-7 w-7 text-green-600" />
              </div>
              <h2 className="text-lg font-display font-bold text-gray-900">Adgangskode opdateret</h2>
              <p className="text-sm text-gray-500">
                Din adgangskode er nu ændret. Du kan logge ind med den nye adgangskode.
              </p>
              <Button className="w-full" onClick={() => navigate('/login/sedgwick')}>
                Gå til login
              </Button>
            </div>
          ) : (
            /* ── Form ── */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="mb-2">
                <h2 className="text-xl font-display font-bold text-gray-900">Vælg ny adgangskode</h2>
                <p className="text-sm text-gray-500 mt-1">Adgangskoden skal være mindst 8 tegn.</p>
              </div>

              <div>
                <Label htmlFor="new-password">Ny adgangskode</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="new-password"
                    type={showPwd ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`pl-9 pr-9 ${tooShort ? 'border-red-400' : ''}`}
                    placeholder="••••••••"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {tooShort && <p className="text-xs text-red-500 mt-1">Mindst 8 tegn</p>}
              </div>

              <div>
                <Label htmlFor="confirm-password">Bekræft adgangskode</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="confirm-password"
                    type={showPwd ? 'text' : 'password'}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={`pl-9 ${mismatch ? 'border-red-400' : ''}`}
                    placeholder="••••••••"
                  />
                </div>
                {mismatch && <p className="text-xs text-red-500 mt-1">Adgangskoderne er ikke ens</p>}
              </div>

              {error && (
                <p className="text-sm text-danger bg-red-50 rounded-md px-3 py-2 border border-red-100">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading || mismatch || tooShort || !password}
              >
                {loading ? 'Gemmer...' : 'Gem ny adgangskode'}
              </Button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Linket er kun gyldigt i 1 time.
        </p>
      </div>
    </div>
  )
}
