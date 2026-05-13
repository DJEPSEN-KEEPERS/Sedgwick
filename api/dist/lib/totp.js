"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTotpSecret = generateTotpSecret;
exports.encryptSecret = encryptSecret;
exports.decryptSecret = decryptSecret;
exports.verifyTotpToken = verifyTotpToken;
exports.generateTotpUri = generateTotpUri;
const otplib_1 = require("otplib");
const crypto_1 = __importDefault(require("crypto"));
const ENCRYPTION_KEY = process.env.JWT_SECRET?.slice(0, 32) ?? 'sedgwick-dev-key-CHANGE-IN-PROD!!';
const IV_LENGTH = 16;
function encrypt(text) {
    const iv = crypto_1.default.randomBytes(IV_LENGTH);
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
    const cipher = crypto_1.default.createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}
function decrypt(text) {
    const [ivHex, encryptedHex] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
    const decipher = crypto_1.default.createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()]);
    return decrypted.toString('utf8');
}
function generateTotpSecret() {
    return otplib_1.authenticator.generateSecret();
}
function encryptSecret(secret) {
    return encrypt(secret);
}
function decryptSecret(encryptedSecret) {
    return decrypt(encryptedSecret);
}
function verifyTotpToken(encryptedSecret, token) {
    const secret = decrypt(encryptedSecret);
    return otplib_1.authenticator.verify({ token, secret });
}
function generateTotpUri(secret, email) {
    return otplib_1.authenticator.keyuri(email, 'Sedgwick CMS', secret);
}
