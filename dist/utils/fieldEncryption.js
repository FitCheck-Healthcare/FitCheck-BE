"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptField = encryptField;
exports.decryptField = decryptField;
exports.normalizePhone = normalizePhone;
exports.hashPhone = hashPhone;
exports.maskPhone = maskPhone;
exports.isEncryptedField = isEncryptedField;
const node_crypto_1 = require("node:crypto");
const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const VERSION = 'v1';
function getEncryptionKey() {
    const raw = process.env.ENCRYPTION_KEY?.trim();
    if (!raw) {
        throw new Error('ENCRYPTION_KEY 환경변수가 없습니다. backend/.env 를 확인하세요.');
    }
    const key = Buffer.from(raw, 'base64');
    if (key.length !== 32) {
        throw new Error('ENCRYPTION_KEY는 32바이트(base64)여야 합니다.');
    }
    return key;
}
function getPhoneHmacPepper() {
    const pepper = process.env.PHONE_HMAC_PEPPER?.trim();
    if (!pepper) {
        throw new Error('PHONE_HMAC_PEPPER 환경변수가 없습니다. backend/.env 를 확인하세요.');
    }
    return pepper;
}
/** AES-256-GCM; returns `v1:<iv>:<tag>:<ciphertext>` (base64url). */
function encryptField(plaintext) {
    if (!plaintext)
        return plaintext;
    const key = getEncryptionKey();
    const iv = (0, node_crypto_1.randomBytes)(IV_LEN);
    const cipher = (0, node_crypto_1.createCipheriv)(ALGO, key, iv);
    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return [
        VERSION,
        iv.toString('base64url'),
        tag.toString('base64url'),
        encrypted.toString('base64url'),
    ].join(':');
}
/** Decrypts v1 ciphertext; legacy plaintext (no prefix) is returned as-is. */
function decryptField(value) {
    if (!value)
        return value;
    if (!value.startsWith(`${VERSION}:`))
        return value;
    const parts = value.split(':');
    if (parts.length !== 4)
        return value;
    const [, ivB64, tagB64, dataB64] = parts;
    const key = getEncryptionKey();
    const decipher = (0, node_crypto_1.createDecipheriv)(ALGO, key, Buffer.from(ivB64, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    return (decipher.update(dataB64, 'base64url', 'utf8') + decipher.final('utf8'));
}
function normalizePhone(phone) {
    return phone.replace(/\D/g, '');
}
function hashPhone(phone) {
    const normalized = normalizePhone(phone);
    return (0, node_crypto_1.createHmac)('sha256', getPhoneHmacPepper())
        .update(normalized)
        .digest('hex');
}
/** Masks phone for list responses, e.g. 010-****-5678 */
function maskPhone(phone) {
    const digits = normalizePhone(phone);
    if (digits.length < 8)
        return '****';
    const last4 = digits.slice(-4);
    if (digits.startsWith('02')) {
        return `02-****-${last4}`;
    }
    if (digits.length >= 11) {
        return `${digits.slice(0, 3)}-****-${last4}`;
    }
    return `${digits.slice(0, 3)}-****-${last4}`;
}
function isEncryptedField(value) {
    return value.startsWith(`${VERSION}:`);
}
