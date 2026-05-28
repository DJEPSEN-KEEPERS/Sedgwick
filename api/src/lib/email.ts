/**
 * Azure Communication Services – e-mail helper
 *
 * Requires two environment variables:
 *   ACS_CONNECTION_STRING  – connection string from ACS resource
 *   ACS_EMAIL_SENDER       – verified sender address, e.g.
 *                            DoNotReply@<domain>.azurecomm.net
 *
 * If either variable is missing the send is silently skipped so that
 * local development (without ACS) never breaks.
 */
import { EmailClient } from '@azure/communication-email'

const CONNECTION_STRING = process.env.ACS_CONNECTION_STRING ?? ''
const SENDER            = process.env.ACS_EMAIL_SENDER       ?? ''
const APP_URL           = process.env.APP_URL                ?? 'https://black-mud-094afdb03.azurestaticapps.net'

const ROLE_LABEL: Record<string, string> = {
  SEDGWICK_ADMIN:  'Sedgwick intern medarbejder',
  INSURER_USER:    'Forsikringsportal',
  CONTRACTOR_USER: 'Håndværkerportal',
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface WelcomeEmailParams {
  toEmail:   string
  fullName:  string
  role:      string
  password:  string          // plain-text temporary password
  companyName?: string       // insurer or contractor company, if applicable
}

/**
 * Send a welcome e-mail to a newly created user.
 * Fire-and-forget — never throws, logs errors to console instead.
 */
export function sendWelcomeEmail(params: WelcomeEmailParams): void {
  if (!CONNECTION_STRING || !SENDER) {
    console.warn('[email] ACS not configured — welcome e-mail skipped')
    return
  }

  _send(params).catch((err) =>
    console.error('[email] Failed to send welcome e-mail:', err),
  )
}

// ── Internal ──────────────────────────────────────────────────────────────────

async function _send(params: WelcomeEmailParams): Promise<void> {
  const client  = new EmailClient(CONNECTION_STRING)
  const subject = 'Din konto hos Sedgwick Claims Management er oprettet'

  const message = {
    senderAddress: SENDER,
    recipients:    { to: [{ address: params.toEmail, displayName: params.fullName }] },
    content: {
      subject,
      html:      buildHtml(params),
      plainText: buildPlainText(params),
    },
  }

  const poller = await client.beginSend(message)
  await poller.pollUntilDone()
}

// ── HTML template ─────────────────────────────────────────────────────────────

function buildHtml(p: WelcomeEmailParams): string {
  const roleLabel    = ROLE_LABEL[p.role] ?? p.role
  const companyLine  = p.companyName
    ? `<p style="margin:0 0 8px">Tilknyttet: <strong>${p.companyName}</strong></p>`
    : ''

  return /* html */ `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:8px;overflow:hidden;
                      box-shadow:0 1px 4px rgba(0,0,0,.08);">

          <!-- Header -->
          <tr>
            <td style="background:#1d3557;padding:28px 36px;">
              <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;
                        letter-spacing:-.3px;">Sedgwick Claims Management</p>
              <p style="margin:4px 0 0;color:#a8c4e0;font-size:13px;">Portalen til skadeshåndtering</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 36px;">
              <p style="margin:0 0 16px;font-size:16px;color:#111827;">
                Hej <strong>${p.fullName}</strong>,
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">
                Din konto er nu oprettet. Herunder finder du dine login-oplysninger.
              </p>

              <!-- Credentials box -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f8fafc;border:1px solid #e2e8f0;
                            border-radius:6px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 12px;font-size:12px;font-weight:600;
                               color:#6b7280;text-transform:uppercase;letter-spacing:.6px;">
                      Dine loginoplysninger
                    </p>
                    <p style="margin:0 0 8px;font-size:14px;color:#111827;">
                      Portal:&nbsp;&nbsp;&nbsp;<strong>${APP_URL}</strong>
                    </p>
                    <p style="margin:0 0 8px;font-size:14px;color:#111827;">
                      E-mail:&nbsp;&nbsp;&nbsp;<strong>${p.toEmail}</strong>
                    </p>
                    <p style="margin:0 0 8px;font-size:14px;color:#111827;">
                      Adgangskode:&nbsp;&nbsp;&nbsp;
                      <strong style="font-family:monospace;background:#e0f2fe;
                                     padding:2px 8px;border-radius:4px;">${p.password}</strong>
                    </p>
                    <p style="margin:0 0 8px;font-size:14px;color:#111827;">
                      Adgang:&nbsp;&nbsp;&nbsp;<strong>${roleLabel}</strong>
                    </p>
                    ${companyLine}
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:#1d3557;border-radius:6px;">
                    <a href="${APP_URL}"
                       style="display:inline-block;padding:12px 28px;color:#ffffff;
                              font-size:14px;font-weight:600;text-decoration:none;">
                      Log ind på portalen →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
                Vi anbefaler at du skifter din adgangskode ved første login.<br/>
                Hvis du har spørgsmål, kan du kontakte din Sedgwick-administrator.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e5e7eb;
                       padding:16px 36px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#9ca3af;">
                Denne e-mail er automatisk genereret af Sedgwick Claims Management.
                Besvar venligst ikke denne e-mail.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ── Plain-text fallback ───────────────────────────────────────────────────────

function buildPlainText(p: WelcomeEmailParams): string {
  const roleLabel = ROLE_LABEL[p.role] ?? p.role
  const companyLine = p.companyName ? `Tilknyttet: ${p.companyName}\n` : ''

  return [
    'Sedgwick Claims Management — Ny konto oprettet',
    '='.repeat(48),
    '',
    `Hej ${p.fullName},`,
    '',
    'Din konto er nu oprettet. Herunder finder du dine loginoplysninger:',
    '',
    `Portal:       ${APP_URL}`,
    `E-mail:       ${p.toEmail}`,
    `Adgangskode:  ${p.password}`,
    `Adgang:       ${roleLabel}`,
    companyLine,
    'Vi anbefaler at du skifter din adgangskode ved første login.',
    '',
    'Denne e-mail er automatisk genereret. Besvar venligst ikke denne besked.',
  ].join('\n')
}
