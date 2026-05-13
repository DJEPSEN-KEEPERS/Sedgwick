import type { HttpRequest, InvocationContext } from '@azure/functions'
import { verifyAccessToken, type JwtPayload } from '../lib/jwt'

export interface AuthContext {
  user: JwtPayload
}

export function extractBearerToken(req: HttpRequest): string | null {
  const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.slice(7)
}

export function authenticate(req: HttpRequest): JwtPayload {
  const token = extractBearerToken(req)
  if (!token) throw new AuthError('Missing authorization token', 401)

  try {
    return verifyAccessToken(token)
  } catch {
    throw new AuthError('Invalid or expired token', 401)
  }
}

export function requireRoles(user: JwtPayload, ...roles: string[]): void {
  if (!roles.includes(user.role)) {
    throw new AuthError('Insufficient permissions', 403)
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

export function errorResponse(
  err: unknown,
  context: InvocationContext,
): { status: number; jsonBody: { error: string; code?: string } } {
  if (err instanceof AuthError) {
    return { status: err.statusCode, jsonBody: { error: err.message, code: 'AUTH_ERROR' } }
  }

  const message = err instanceof Error ? err.message : 'Internal server error'
  context.error('Unhandled error:', err)
  return { status: 500, jsonBody: { error: message, code: 'INTERNAL_ERROR' } }
}
