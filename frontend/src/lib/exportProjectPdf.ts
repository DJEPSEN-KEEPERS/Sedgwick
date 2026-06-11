import type { Project } from '@/types'

function fmt(date?: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('da-DK', { day: '2-digit', month: 'long', year: 'numeric' })
}

function cur(amount?: number | null): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 }).format(amount)
}

const MILESTONE_LABELS: Record<string, string> = {
  CASE_RECEIVED: 'Sag modtaget',
  BIDDING_IN_PROGRESS: 'Tilbud i gang',
  CONTRACTOR_SELECTED: 'Håndværker valgt',
  WORK_SCHEDULED: 'Arbejde planlagt',
  WORK_STARTED: 'Arbejde startet',
  WORK_COMPLETED: 'Arbejde færdigt',
  FINAL_REPORT_SUBMITTED: 'Slutrapport indsendt',
  CASE_CLOSED: 'Sag lukket',
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Lav', NORMAL: 'Normal', HIGH: 'Høj', URGENT: 'Kritisk',
}

export function exportProjectPdf(project: Project): void {
  const html = `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8" />
  <title>Sag ${project.claimId} — Sedgwick</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #111; background: #fff; padding: 20mm 20mm 15mm; }
    @page { size: A4; margin: 15mm 15mm 12mm; }
    @media print { body { padding: 0; } }

    header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #003366; padding-bottom: 10px; margin-bottom: 18px; }
    header h1 { font-size: 18pt; font-weight: 700; color: #003366; letter-spacing: -0.3px; }
    header .meta { text-align: right; font-size: 9pt; color: #555; line-height: 1.6; }
    .badge { display: inline-block; font-size: 8pt; font-weight: 600; padding: 2px 8px; border-radius: 99px; margin-left: 6px; }
    .badge-urgent { background: #fef2f2; color: #b91c1c; }
    .badge-high { background: #fff7ed; color: #c2410c; }
    .badge-normal { background: #f0fdf4; color: #166534; }
    .badge-low { background: #f9fafb; color: #6b7280; }

    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
    .card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 14px; page-break-inside: avoid; }
    .card h2 { font-size: 8pt; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; padding-bottom: 5px; border-bottom: 1px solid #f3f4f6; }
    .row { display: flex; justify-content: space-between; gap: 10px; font-size: 9.5pt; margin-bottom: 5px; }
    .row:last-child { margin-bottom: 0; }
    .row .label { color: #6b7280; flex-shrink: 0; }
    .row .value { font-weight: 500; text-align: right; word-break: break-word; }
    .row .mono { font-family: 'Courier New', monospace; font-size: 9pt; }
    .full-width { margin-bottom: 14px; }
    .description { font-size: 10pt; line-height: 1.6; color: #374151; white-space: pre-line; }
    .entreprise-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin-top: 8px; }
    .entreprise-table th { background: #f9fafb; color: #6b7280; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.3px; text-align: left; padding: 5px 8px; border: 1px solid #e5e7eb; }
    .entreprise-table td { padding: 5px 8px; border: 1px solid #e5e7eb; vertical-align: top; }
    .entreprise-table tr:nth-child(even) td { background: #f9fafb; }
    footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 8pt; color: #9ca3af; }
    .status-chip { display: inline-block; font-size: 8pt; font-weight: 600; padding: 2px 7px; border-radius: 99px; background: #f0fdf4; color: #166534; }
  </style>
</head>
<body>

<header>
  <div>
    <h1>${project.claimId}
      <span class="badge badge-${project.priorityLevel.toLowerCase()}">${PRIORITY_LABELS[project.priorityLevel] ?? project.priorityLevel}</span>
    </h1>
    <div style="margin-top:4px;font-size:10pt;color:#374151;">${project.damageType} — ${project.buildingType}</div>
    <div style="font-size:9pt;color:#6b7280;margin-top:2px;">${project.address}, ${project.postalCode} ${project.city}</div>
  </div>
  <div class="meta">
    <div><strong>Sedgwick sagsstyring</strong></div>
    <div>Udskrevet: ${fmt(new Date().toISOString())}</div>
    <div>Status: <strong>${MILESTONE_LABELS[project.currentMilestone] ?? project.currentMilestone}</strong></div>
    ${project.progressPercent != null ? `<div>Fremgang: ${project.progressPercent}%</div>` : ''}
  </div>
</header>

<div class="grid2">
  <div class="card">
    <h2>Sagsinformation</h2>
    <div class="row"><span class="label">Forsikringsselskab</span><span class="value">${project.insuranceCompany?.name ?? '—'}</span></div>
    <div class="row"><span class="label">Police-nr.</span><span class="value mono">${project.insurancePolicyNumber ?? '—'}</span></div>
    <div class="row"><span class="label">Forsikrings sags-ID</span><span class="value mono">${project.insurerCaseId ?? '—'}</span></div>
    <div class="row"><span class="label">Skadetype</span><span class="value">${project.damageType}</span></div>
    <div class="row"><span class="label">Bygningstype</span><span class="value">${project.buildingType}</span></div>
    ${project.slaCategory ? `<div class="row"><span class="label">SLA-kategori</span><span class="value">${project.slaCategory}</span></div>` : ''}
    <div class="row"><span class="label">Maks godkendt pris</span><span class="value">${cur(project.maxApprovedPrice)}</span></div>
  </div>

  <div class="card">
    <h2>Kontakt og adresse</h2>
    <div class="row"><span class="label">Kontaktperson</span><span class="value">${project.contactName}</span></div>
    <div class="row"><span class="label">Telefon</span><span class="value">${project.contactPhone}</span></div>
    <div class="row"><span class="label">E-mail</span><span class="value">${project.contactEmail}</span></div>
    <div style="margin:8px 0;border-top:1px solid #f3f4f6;"></div>
    <div class="row"><span class="label">Adresse</span><span class="value">${project.address}</span></div>
    <div class="row"><span class="label">By</span><span class="value">${project.postalCode} ${project.city}</span></div>
    <div class="row"><span class="label">Region</span><span class="value">${project.region}</span></div>
  </div>
</div>

<div class="grid2">
  <div class="card">
    <h2>Datoer og frister</h2>
    <div class="row"><span class="label">Oprettet</span><span class="value">${fmt(project.createdAt)}</span></div>
    <div class="row"><span class="label">Ønsket start</span><span class="value">${fmt(project.requestedStartDate)}</span></div>
    <div class="row"><span class="label">Frist</span><span class="value">${fmt(project.requestedDeadline)}</span></div>
    ${project.finalCompletionDate ? `<div class="row"><span class="label">Afsluttet</span><span class="value">${fmt(project.finalCompletionDate)}</span></div>` : ''}
  </div>

  <div class="card">
    <h2>Ansvarlig og håndværker</h2>
    <div class="row"><span class="label">Sedgwick ansvarlig</span><span class="value">${project.responsibleUser?.fullName ?? '—'}</span></div>
    ${project.responsibleUser ? `<div class="row"><span class="label">E-mail</span><span class="value">${project.responsibleUser.email}</span></div>` : ''}
    <div style="margin:8px 0;border-top:1px solid #f3f4f6;"></div>
    <div class="row"><span class="label">Valgt håndværker</span><span class="value">${project.selectedContractor?.companyName ?? '—'}</span></div>
    ${project.selectedContractor ? `<div class="row"><span class="label">Kontakt</span><span class="value">${project.selectedContractor.contactName}</span></div>` : ''}
  </div>
</div>

<div class="full-width card">
  <h2>Skadesomfang og beskrivelse</h2>
  <p class="description">${project.damageDescription ?? '—'}</p>
  ${project.estimatedScope ? `<div style="margin-top:10px;padding-top:8px;border-top:1px solid #f3f4f6;"><div style="font-size:8pt;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Estimeret omfang</div><p class="description">${project.estimatedScope}</p></div>` : ''}
</div>

${project.entreprises && project.entreprises.filter(e => e.isRelevant).length > 0 ? `
<div class="full-width card">
  <h2>Entrepriser</h2>
  <table class="entreprise-table">
    <thead>
      <tr>
        <th>Type</th>
        <th>Status</th>
        <th>Fremgang</th>
        <th>Planlagt start</th>
        <th>Planlagt slut</th>
      </tr>
    </thead>
    <tbody>
      ${project.entreprises.filter(e => e.isRelevant).map(e => `
      <tr>
        <td>${e.type}</td>
        <td>${e.currentMilestone.replace(/_/g, ' ')}</td>
        <td>${e.progressPercent}%</td>
        <td>${fmt(e.scheduledStart)}</td>
        <td>${fmt(e.scheduledEnd)}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>` : ''}

<footer>
  <span>Sedgwick Sagsstyring · ${project.claimId}</span>
  <span>Fortroligt dokument — genereret ${new Date().toLocaleString('da-DK')}</span>
</footer>

</body>
</html>`

  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  // Small delay so images/fonts are ready before print dialog opens
  setTimeout(() => win.print(), 400)
}
