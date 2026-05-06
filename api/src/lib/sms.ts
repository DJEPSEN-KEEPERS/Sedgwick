// SMS service stub — swap implementation for Azure Communication Services in production

export interface SmsService {
  sendCode(phone: string, code: string): Promise<void>
}

class AzureSmsService implements SmsService {
  async sendCode(phone: string, code: string): Promise<void> {
    const connectionString = process.env.ACS_CONNECTION_STRING
    const from = process.env.ACS_SMS_FROM

    if (!connectionString || !from) {
      console.warn('[SmsService] ACS not configured — SMS not sent. Code:', code)
      return
    }

    // Dynamically import to avoid load-time errors when not configured
    const { SmsClient } = await import('@azure/communication-sms')
    const client = new SmsClient(connectionString)
    await client.send({
      from,
      to: [phone],
      message: `Din Sedgwick-kode: ${code}. Gælder i 10 minutter.`,
    })
  }
}

export const smsService: SmsService = new AzureSmsService()
