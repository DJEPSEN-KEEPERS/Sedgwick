import { useState, useRef, useEffect } from 'react'
import { Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

const LANGUAGES = [
  { code: 'da', flag: '🇩🇰', label: 'Dansk' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
] as const

type LangCode = (typeof LANGUAGES)[number]['code']

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0]

  const handleChange = (code: LangCode) => {
    i18n.changeLanguage(code)
    setOpen(false)
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      {/* Pill trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
          'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
          open && 'border-primary-300 bg-primary-50 text-primary-700',
        )}
        aria-label="Change language"
        aria-expanded={open}
      >
        <Globe className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        <span className="text-base leading-none">{current.flag}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[130px] overflow-hidden rounded-lg border border-[#e5e7eb] bg-white shadow-elevated">
          {LANGUAGES.map((lang) => {
            const isActive = lang.code === i18n.language
            return (
              <button
                key={lang.code}
                onClick={() => handleChange(lang.code)}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50',
                )}
              >
                <span className="text-base leading-none">{lang.flag}</span>
                <span className="font-body">{lang.label}</span>
                {isActive && (
                  <span className="ml-auto text-primary-600 text-xs">✓</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
