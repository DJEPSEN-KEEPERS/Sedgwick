"use strict";
// SMS service stub — swap implementation for Azure Communication Services in production
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.smsService = void 0;
class AzureSmsService {
    async sendCode(phone, code) {
        const connectionString = process.env.ACS_CONNECTION_STRING;
        const from = process.env.ACS_SMS_FROM;
        if (!connectionString || !from) {
            console.warn('[SmsService] ACS not configured — SMS not sent. Code:', code);
            return;
        }
        // Dynamically import to avoid load-time errors when not configured
        const { SmsClient } = await Promise.resolve().then(() => __importStar(require('@azure/communication-sms')));
        const client = new SmsClient(connectionString);
        await client.send({
            from,
            to: [phone],
            message: `Din Sedgwick-kode: ${code}. Gælder i 10 minutter.`,
        });
    }
}
exports.smsService = new AzureSmsService();
