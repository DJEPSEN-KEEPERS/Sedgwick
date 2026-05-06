import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/types'
import { cn } from '@/lib/utils'

const ROLE_REDIRECT: Record<UserRole, string> = {
  SEDGWICK_ADMIN: '/sedgwick/dashboard',
  INSURER_USER: '/insurer/dashboard',
  CONTRACTOR_USER: '/contractor/dashboard',
}

interface LoginFormProps {
  portalLabel: string
  className?: string
}

export function LoginForm({ portalLabel, className }: LoginFormProps) {
  const navigate = useNavigate()
  const { login, verifyTwoFactor, error, isLoading, clearError } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState<'credentials' | 'twofactor'>('credentials')
  const [tempToken, setTempToken] = useState('')
  const [code, setCode] = useState('')

  const handleCredentials = async (e: FormEvent) => {
    e.preventDefault()
    clearError()
    try {
      const res = await login(email, password)
      if (res.requiresTwoFactor && res.tempToken) {
        setTempToken(res.tempToken)
        setStep('twofactor')
      } else {
        // Should not happen — 2FA always required
        navigate('/')
      }
    } catch {
      // error already in store
    }
  }

  const handleTwoFactor = async (e: FormEvent) => {
    e.preventDefault()
    clearError()
    try {
      await verifyTwoFactor(tempToken, code)
      const role = useAuthStore.getState().user?.role
      navigate(role ? ROLE_REDIRECT[role] : '/')
    } catch {
      setCode('')
    }
  }

  return (
    <div className={cn('w-full max-w-sm', className)}>
      {step === 'credentials' ? (
        <form onSubmit={handleCredentials} className="space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                placeholder="navn@virksomhed.dk"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Adgangskode</Label>
              <button
                type="button"
                className="text-xs text-primary-600 hover:underline"
                tabIndex={-1}
              >
                Glemt adgangskode?
              </button>
            </div>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-9"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-danger bg-red-50 rounded-md px-3 py-2 border border-red-100">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? 'Logger ind...' : `Log ind — ${portalLabel}`}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleTwoFactor} className="space-y-4">
          <div className="text-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 mx-auto mb-3">
              <Lock className="h-6 w-6 text-primary-600" />
            </div>
            <h3 className="font-display font-semibold text-gray-900">To-faktor bekræftelse</h3>
            <p className="text-sm text-gray-500 mt-1">
              Indtast koden fra din authenticator-app
            </p>
          </div>

          <div>
            <Label htmlFor="code">6-cifret kode</Label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="mt-1 text-center text-2xl tracking-[0.5em] font-mono"
              placeholder="000000"
              autoComplete="one-time-code"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-danger bg-red-50 rounded-md px-3 py-2 border border-red-100">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={isLoading || code.length < 6}>
            {isLoading ? 'Bekræfter...' : 'Bekræft'}
          </Button>

          <button
            type="button"
            onClick={() => { setStep('credentials'); setCode(''); clearError() }}
            className="w-full text-sm text-gray-500 hover:text-gray-700 text-center"
          >
            ← Tilbage
          </button>
        </form>
      )}
    </div>
  )
}
