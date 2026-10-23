const configuredUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || 'daftargy_bot';

export const TELEGRAM_BOT_USERNAME = configuredUsername.trim().replace(/^@/, '');
