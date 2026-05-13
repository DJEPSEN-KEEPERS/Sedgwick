"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthError = void 0;
exports.extractBearerToken = extractBearerToken;
exports.authenticate = authenticate;
exports.requireRoles = requireRoles;
exports.errorResponse = errorResponse;
const jwt_1 = require("../lib/jwt");
function extractBearerToken(req) {
    const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer '))
        return null;
    return authHeader.slice(7);
}
function authenticate(req) {
    const token = extractBearerToken(req);
    if (!token)
        throw new AuthError('Missing authorization token', 401);
    try {
        return (0, jwt_1.verifyAccessToken)(token);
    }
    catch {
        throw new AuthError('Invalid or expired token', 401);
    }
}
function requireRoles(user, ...roles) {
    if (!roles.includes(user.role)) {
        throw new AuthError('Insufficient permissions', 403);
    }
}
class AuthError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'AuthError';
    }
}
exports.AuthError = AuthError;
function errorResponse(err, context) {
    if (err instanceof AuthError) {
        return { status: err.statusCode, jsonBody: { error: err.message, code: 'AUTH_ERROR' } };
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    context.error('Unhandled error:', err);
    return { status: 500, jsonBody: { error: message, code: 'INTERNAL_ERROR' } };
}
