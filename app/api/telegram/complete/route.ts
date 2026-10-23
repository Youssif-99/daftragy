import { NextResponse } from 'next/server';
import { isTelegramAuthFresh, verifyTelegramLogin } from '@/lib/telegram-auth';
import type { TelegramWidgetUser } from '@/lib/telegram-widget';
import { createUserSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!botToken) {
    return NextResponse.json({ ok: false, error: 'bot_token_missing' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization') || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!accessToken) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let payload: TelegramWidgetUser;
  try {
    payload = (await request.json()) as TelegramWidgetUser;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  if (!payload?.id || !payload.hash || !payload.auth_date) {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
  }

  if (!isTelegramAuthFresh(Number(payload.auth_date)) || !verifyTelegramLogin(payload, botToken)) {
    return NextResponse.json({ ok: false, error: 'invalid_telegram_login' }, { status: 403 });
  }

  const supabase = createUserSupabaseClient(accessToken);
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const chatId = String(payload.id);
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ chat_id: chatId })
    .eq('id', userData.user.id);

  if (updateError) {
    return NextResponse.json(
      { ok: false, error: 'profile_update_failed', details: updateError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, chat_id: chatId });
}
