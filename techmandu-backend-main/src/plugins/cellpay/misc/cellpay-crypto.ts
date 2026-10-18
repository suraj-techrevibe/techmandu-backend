import crypto from "crypto";

export function signPayload(privateKey: string, payload: string): string {
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(payload);
  sign.end();
  return sign.sign(privateKey, "base64");
}

export function generateAESKey(): Buffer {
  return crypto.randomBytes(32);
}

export function encryptAES(data: string, secretKey: Buffer): string {
  const cipher = crypto.createCipheriv("aes-256-ecb", secretKey, null);
  let encrypted = cipher.update(data, "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
}

export function encryptRSA(secretKey: Buffer, publicKey: string): string {
  return crypto.publicEncrypt(
    { key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING },
    secretKey
  ).toString("base64");
}
