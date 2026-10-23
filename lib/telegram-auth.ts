import { createHash, createHmac, timingSafeEqual } from 'crypto';
import type { TelegramWidgetUser } from '@/lib/telegram-widget';

export type { TelegramWidgetUser };

export function verifyTelegramLogin(
  payload: TelegramWidgetUser,
  botToken: string,
): boolean {
  const hash = payload.hash?.trim();
  if (!hash || !botToken) return false;

  const dataCheckString = Object.entries(payload)
    .filter(([key, value]) => key !== 'hash' && value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n');

  const secret = createHash('sha256').update(botToken).digest();
  const hmac = createHmac('sha256', secret).update(dataCheckString).digest('hex');

  try {
    return timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

export function isTelegramAuthFresh(authDate: number, maxAgeSeconds = 24 * 60 * 60): boolean {
  const now = Math.floor(Date.now() / 1000);
  return Number.isFinite(authDate) && Math.abs(now - authDate) <= maxAgeSeconds;
}
