import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMutation } from '@/hooks/useApi'
import type { Project, PriorityLevel } from '@/types'

interface Props {
  project: Project
  open: boolean
  onClose: () => void
  onSaved: (updated: Project) => void
}

const PRIORITY_OPTIONS: { value: PriorityLevel; label: string }[] = [
  { value: 'LOW', label: 'Lav' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'Høj' },
  { value: 'URGENT', label: 'Kritisk' },
]

const DAMAGE_TYPES = [
  'Vandskade', 'Brandskade', 'Stormskade', 'Indbrudsskade',
  'Frostskade', 'Svampeskade', 'Konstruktionsskade', 'Andet',
]

const BUILDING_TYPES = [
  'Villa', 'Rækkehus', 'Lejlighed', 'Etageejendom',
  'Erhvervsejendom', 'Sommerhus', 'Landbrugsejendom', 'Andet',
]

const REGIONS = [
  'Hovedstaden', 'Sjælland', 'Syddanmark', 'Midtjylland', 'Nordjylland',
]

export function EditProjectPanel({ project, open, onClose, onSaved }: Props) {
  const { mutate: updateProject, loading: saving } = useMutation<unknown, Project>('patch')
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    damageType: project.damageType ?? '',
    damageDescription: project.damageDescription ?? '',
    buildingType: project.buildingType ?? '',
    priorityLevel: project.priorityLevel ?? 'NORMAL',
    maxApprovedPrice: project.maxApprovedPrice?.toString() ?? '',
    estimatedScope: project.estimatedScope ?? '',
    slaCategory: project.slaCategory ?? '',
    requestedStartDate: project.requestedStartDate ? project.requestedStartDate.slice(0, 10) : '',
    requestedDeadline: project.requestedDeadline ? project.requestedDeadline.slice(0, 10) : '',
    address: project.address ?? '',
    postalCode: project.postalCode ?? '',
    city: project.city ?? '',
    region: project.region ?? '',
    contactName: project.contactName ?? '',
    contactPhone: project.contactPhone ?? '',
    contactEmail: project.contactEmail ?? '',
  })

  // Reset form when project changes (e.g. after external refetch)
  useEffect(() => {
    setForm({
      damageType: project.damageType ?? '',
      damageDescription: project.damageDescription ?? '',
      buildingType: project.buildingType ?? '',
      priorityLevel: project.priorityLevel ?? 'NORMAL',
      maxApprovedPrice: project.maxApprovedPrice?.toString() ?? '',
      estimatedScope: project.estimatedScope ?? '',
      slaCategory: project.slaCategory ?? '',
      requestedStartDate: project.requestedStartDate ? project.requestedStartDate.slice(0, 10) : '',
      requestedDeadline: project.requestedDeadline ? project.requestedDeadline.slice(0, 10) : '',
      address: project.address ?? '',
      postalCode: project.postalCode ?? '',
      city: project.city ?? '',
      region: project.region ?? '',
      contactName: project.contactName ?? '',
      contactPhone: project.contactPhone ?? '',
      contactEmail: project.contactEmail ?? '',
    })
    setError('')
  }, [project.id, open])

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const handleSave = async () => {
    setError('')
    const payload: Record<string, unknown> = {
      damageType:        form.damageType || undefined,
      damageDescription: form.damageDescription || undefined,
      buildingType:      form.buildingType || undefined,
      priorityLevel:     form.priorityLevel,
      estimatedScope:    form.estimatedScope || undefined,
      slaCategory:       form.slaCategory || undefined,
      requestedStartDate: form.requestedStartDate || null,
      requestedDeadline:  form.requestedDeadline || null,
      address:           form.address || undefined,
      postalCode:        form.postalCode || undefined,
      city:              form.city || undefined,
      region:            form.region || undefined,
      contactName:       form.contactName || undefined,
      contactPhone:      form.contactPhone || undefined,
      contactEmail:      form.contactEmail || undefined,
    }
    if (form.maxApprovedPrice !== '') {
      payload.maxApprovedPrice = parseFloat(form.maxApprovedPrice)
    }

    const result = await updateProject(`/projects/${project.id}`, payload)
    if (result) {
      onSaved(result)
      onClose()
    } else {
      setError('Kunne ikke gemme ændringerne — prøv igen')
    }
  }

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-display font-semibold text-gray-900">Rediger sag</h2>
            <p className="text-xs text-gray-500 font-mono">{project.claimId}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          <Section title="Skade">
            <Field label="Skadetype">
              <select className="input-field w-full text-sm" value={form.damageType} onChange={set('damageType')}>
                <option value="">Vælg type...</option>
                {DAMAGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Bygningstype">
              <select className="input-field w-full text-sm" value={form.buildingType} onChange={set('buildingType')}>
                <option value="">Vælg type...</option>
                {BUILDING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Beskrivelse">
              <textarea
                className="input-field w-full text-sm resize-none"
                rows={3}
                value={form.damageDescription}
                onChange={set('damageDescription')}
              />
            </Field>
            <Field label="Estimeret omfang">
              <textarea
                className="input-field w-full text-sm resize-none"
                rows={2}
                value={form.estimatedScope}
                onChange={set('estimatedScope')}
              />
            </Field>
          </Section>

          <Section title="Prioritet og økonomi">
            <Field label="Prioritet">
              <select className="input-field w-full text-sm" value={form.priorityLevel} onChange={set('priorityLevel')}>
                {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Maks godkendt pris (kr.)">
              <input
                type="number"
                className="input-field w-full text-sm"
                placeholder="0"
                value={form.maxApprovedPrice}
                onChange={set('maxApprovedPrice')}
              />
            </Field>
            <Field label="SLA-kategori">
              <input
                type="text"
                className="input-field w-full text-sm"
                value={form.slaCategory}
                onChange={set('slaCategory')}
              />
            </Field>
          </Section>

          <Section title="Datoer">
            <Field label="Ønsket startdato">
              <input type="date" className="input-field w-full text-sm" value={form.requestedStartDate} onChange={set('requestedStartDate')} />
            </Field>
            <Field label="Frist">
              <input type="date" className="input-field w-full text-sm" value={form.requestedDeadline} onChange={set('requestedDeadline')} />
            </Field>
          </Section>

          <Section title="Adresse">
            <Field label="Vejnavn og nr.">
              <input type="text" className="input-field w-full text-sm" value={form.address} onChange={set('address')} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Postnr.">
                <input type="text" className="input-field w-full text-sm" value={form.postalCode} onChange={set('postalCode')} />
              </Field>
              <Field label="By">
                <input type="text" className="input-field w-full text-sm" value={form.city} onChange={set('city')} />
              </Field>
            </div>
            <Field label="Region">
              <select className="input-field w-full text-sm" value={form.region} onChange={set('region')}>
                <option value="">Vælg region...</option>
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
          </Section>

          <Section title="Kontaktperson">
            <Field label="Navn">
              <input type="text" className="input-field w-full text-sm" value={form.contactName} onChange={set('contactName')} />
            </Field>
            <Field label="Telefon">
              <input type="tel" className="input-field w-full text-sm" value={form.contactPhone} onChange={set('contactPhone')} />
            </Field>
            <Field label="E-mail">
              <input type="email" className="input-field w-full text-sm" value={form.contactEmail} onChange={set('contactEmail')} />
            </Field>
          </Section>

          {error && <p className="text-sm text-red-600 rounded-md bg-red-50 px-3 py-2">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Annuller</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Gemmer...' : 'Gem ændringer'}
          </Button>
        </div>
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-display font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-display font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}
