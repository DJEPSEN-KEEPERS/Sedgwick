import jwt from 'jsonwebtoken'

export interface JwtPayload {
  sub: string
  email: string
  role: string
  linkedEntityId: string | null
  iat: number
  exp: number
}

const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRY = process.env.JWT_EXPIRY ?? '8h'
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY ?? '7d'

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}

export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: JWT_EXPIRY } as jwt.SignOptions)
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, type: 'refresh' }, JWT_SECRET!, {
    expiresIn: JWT_REFRESH_EXPIRY,
  } as jwt.SignOptions)
}

export function signTempToken(userId: string): string {
  return jwt.sign({ sub: userId, type: 'temp_2fa' }, JWT_SECRET!, {
    expiresIn: '10m',
  } as jwt.SignOptions)
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET!) as JwtPayload
}

export function verifyRefreshToken(token: string): { sub: string; type: string } {
  return jwt.verify(token, JWT_SECRET!) as { sub: string; type: string }
}

export function verifyTempToken(token: string): { sub: string; type: string } {
  return jwt.verify(token, JWT_SECRET!) as { sub: string; type: string }
}
