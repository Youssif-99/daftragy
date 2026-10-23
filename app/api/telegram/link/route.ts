import { NextResponse } from 'next/server';
import { parseTelegramLinkRequest } from '@/lib/telegram-link';
import { createLinkSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const parsed = parseTelegramLinkRequest(payload);
  if (!parsed) {
    return NextResponse.json({ ok: false, error: 'not_a_link_command' }, { status: 200 });
  }

  const supabase = createLinkSupabaseClient();
  const { data, error } = await supabase.rpc('link_telegram_account', {
    p_code: parsed.code,
    p_chat_id: parsed.chatId,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: 'rpc_unavailable', details: error.message },
      { status: 500 },
    );
  }

  const result = data as { ok?: boolean; error?: string } | null;
  if (!result?.ok) {
    return NextResponse.json(
      { ok: false, error: result?.error || 'invalid_code' },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
