import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
// AES-256-GCM field encryption for card numbers. Key derived from a server secret.
// We never store CVV/PIN/OTP; only the full PAN is encrypted, and only last4 is shown by default.
const keyFrom=(secret:string)=>scryptSync(secret,'ffm-card-salt',32);
const secret=()=>{const s=process.env.CARD_ENCRYPTION_KEY||process.env.JWT_ACCESS_SECRET;if(!s)throw new Error('CARD_ENCRYPTION_KEY (or JWT_ACCESS_SECRET) is required for card encryption');return s};

export function encryptCard(pan:string):string{
  const iv=randomBytes(12); const cipher=createCipheriv('aes-256-gcm',keyFrom(secret()),iv);
  const enc=Buffer.concat([cipher.update(pan,'utf8'),cipher.final()]); const tag=cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

export function decryptCard(blob:string):string{
  const [ivB,tagB,dataB]=blob.split(':'); if(!ivB||!tagB||!dataB)throw new Error('Malformed encrypted card value');
  const decipher=createDecipheriv('aes-256-gcm',keyFrom(secret()),Buffer.from(ivB,'base64')); decipher.setAuthTag(Buffer.from(tagB,'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB,'base64')),decipher.final()]).toString('utf8');
}
