"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAccessToken = signAccessToken;
exports.signRefreshToken = signRefreshToken;
exports.signTempToken = signTempToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.verifyTempToken = verifyTempToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY ?? '8h';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY ?? '7d';
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}
function signAccessToken(payload) {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}
function signRefreshToken(userId) {
    return jsonwebtoken_1.default.sign({ sub: userId, type: 'refresh' }, JWT_SECRET, {
        expiresIn: JWT_REFRESH_EXPIRY,
    });
}
function signTempToken(userId) {
    return jsonwebtoken_1.default.sign({ sub: userId, type: 'temp_2fa' }, JWT_SECRET, {
        expiresIn: '10m',
    });
}
function verifyAccessToken(token) {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
}
function verifyRefreshToken(token) {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
}
function verifyTempToken(token) {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
}
