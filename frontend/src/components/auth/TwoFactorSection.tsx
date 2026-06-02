import { useState } from 'react'
import { ShieldCheck, ShieldOff, Smartphone, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useAuthStore, useCurrentUser } from '@/stores/authStore'

type SetupStep = 'idle' | 'scanning' | 'confirmed'

export function TwoFactorSection() {
  const user = useCurrentUser()
  const { fetchMe } = useAuthStore()

  const [toggleLoading, setToggleLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // QR setup state
  const [setupStep, setSetupStep] = useState<SetupStep>('idle')
  const [qrCode, setQrCode] = useState('')
  const [manualKey, setManualKey] = useState('')
  const [code, setCode] = useState('')
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [verifyError, setVerifyError] = useState('')

  const isEnabled = user.twoFactorEnabled

  // ── Disable 2FA ──────────────────────────────────────────────────────────────

  const disable = async () => {
    setToggleLoading(true)
    setMessage('')
    setError('')
    try {
      const res = await api.patch<{ message: string }>('/auth/2fa', { enabled: false })
      await fetchMe()
      setMessage(res.message)
      setSetupStep('idle')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noget gik galt')
    } finally {
      setToggleLoading(false)
    }
  }

  // ── Start TOTP setup (enable OR re-link new phone) ───────────────────────────

  const startSetup = async () => {
    setMessage('')
    setError('')
    setCode('')
    setVerifyError('')
    setSetupStep('scanning')
    try {
      // If disabling first (re-setup), clear secret via toggle
      if (!isEnabled) {
        await api.patch('/auth/2fa', { enabled: true })
      }
      // Generate new TOTP secret + QR
      const res = await api.post<{ qrCode: string; manualKey: string }>('/auth/setup-totp', {})
      setQrCode(res.qrCode)
      setManualKey(res.manualKey)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke hente QR-kode')
      setSetupStep('idle')
    }
  }

  // ── Verify scanned TOTP ───────────────────────────────────────────────────────

  const verify = async () => {
    if (code.length !== 6) return
    setVerifyLoading(true)
    setVerifyError('')
    try {
      await api.post('/auth/confirm-totp-setup', { code })
      await fetchMe()
      setSetupStep('confirmed')
      setMessage('Authenticator-app tilknyttet. 2FA er nu aktiv.')
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Forkert kode — prøv igen')
    } finally {
      setVerifyLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-white p-4 space-y-4">
      {/* Status row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
            {isEnabled
              ? <ShieldCheck className="h-5 w-5 text-green-600" />
              : <ShieldOff className="h-5 w-5 text-gray-400" />}
          </div>
          <div>
            <p className="font-display font-semibold text-sm text-gray-900">
              To-faktor godkendelse (2FA)
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {isEnabled
                ? 'Aktiveret — kræver authenticator-app ved login'
                : 'Deaktiveret — kun adgangskode kræves ved login'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isEnabled && setupStep === 'idle' && (
            <Button size="sm" variant="secondary" onClick={startSetup} title="Tilknyt ny authenticator-app">
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Ny app
            </Button>
          )}
          {isEnabled ? (
            <Button size="sm" variant="secondary" onClick={disable} disabled={toggleLoading}
              className="text-red-600 hover:text-red-700 hover:border-red-300">
              {toggleLoading ? '...' : 'Deaktiver'}
            </Button>
          ) : (
            <Button size="sm" onClick={startSetup} disabled={setupStep === 'scanning'}>
              {setupStep === 'scanning' ? '...' : 'Aktiver 2FA'}
            </Button>
          )}
        </div>
      </div>

      {/* Feedback */}
      {message && (
        <p className="text-sm text-green-700 bg-green-50 rounded-md px-3 py-2 border border-green-200">✓ {message}</p>
      )}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2 border border-red-100">{error}</p>
      )}

      {/* QR setup */}
      {setupStep === 'scanning' && qrCode && (
        <div className="space-y-3 border-t border-[#e5e7eb] pt-4">
          <div className="flex items-center gap-2 text-sm font-display font-semibold text-gray-900">
            <Smartphone className="h-4 w-4 text-primary-600" />
            Opsæt authenticator-app
          </div>
          <p className="text-xs text-gray-500">
            Scan QR-koden med Google Authenticator, Microsoft Authenticator eller lignende.
          </p>
          <div className="flex justify-center">
            <img src={qrCode} alt="TOTP QR-kode" className="w-40 h-40 rounded-lg border border-gray-200" />
          </div>
          {manualKey && (
            <div className="bg-gray-50 rounded-md p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Eller indtast nøglen manuelt:</p>
              <p className="font-mono text-xs font-medium text-gray-800 break-all">{manualKey}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-600 mb-2">Bekræft ved at indtaste 6-cifret kode fra appen:</p>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="input-field text-center text-xl tracking-[0.4em] font-mono w-36"
                autoFocus
              />
              <Button size="sm" onClick={verify} disabled={verifyLoading || code.length < 6}>
                {verifyLoading ? '...' : 'Bekræft'}
              </Button>
            </div>
            {verifyError && <p className="text-xs text-red-500 mt-1">{verifyError}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
