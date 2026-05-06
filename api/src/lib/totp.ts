import { authenticator } from 'otplib'
import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.JWT_SECRET?.slice(0, 32) ?? 'sedgwick-dev-key-CHANGE-IN-PROD!!'
const IV_LENGTH = 16

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32))
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

function decrypt(text: string): string {
  const [ivHex, encryptedHex] = text.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32))
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()])
  return decrypted.toString('utf8')
}

export function generateTotpSecret(): string {
  return authenticator.generateSecret()
}

export function encryptSecret(secret: string): string {
  return encrypt(secret)
}

export function decryptSecret(encryptedSecret: string): string {
  return decrypt(encryptedSecret)
}

export function verifyTotpToken(encryptedSecret: string, token: string): boolean {
  const secret = decrypt(encryptedSecret)
  return authenticator.verify({ token, secret })
}

export function generateTotpUri(secret: string, email: string): string {
  return authenticator.keyuri(email, 'Sedgwick CMS', secret)
}
