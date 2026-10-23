export function extractStartCode(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = text
    .trim()
    .match(/^\/start(?:@[A-Za-z0-9_]+)?(?:\s+|_)([A-Za-z0-9_-]+)$/);
  return match?.[1] ?? null;
}

export function parseTelegramLinkRequest(payload: unknown): { code: string; chatId: string } | null {
  if (!payload || typeof payload !== 'object') return null;
  const body = payload as Record<string, unknown>;

  const directCode = typeof body.code === 'string' ? body.code.trim() : '';
  const directChatId = body.chat_id ?? body.chatId;
  if (directCode && directChatId != null && String(directChatId).trim()) {
    return { code: directCode, chatId: String(directChatId).trim() };
  }

  const message = body.message;
  if (!message || typeof message !== 'object') return null;
  const msg = message as Record<string, unknown>;
  const chat = msg.chat;
  const chatId =
    chat && typeof chat === 'object' ? (chat as Record<string, unknown>).id : undefined;
  const code = extractStartCode(typeof msg.text === 'string' ? msg.text : undefined);
  if (!code || chatId == null || !String(chatId).trim()) return null;
  return { code, chatId: String(chatId).trim() };
}
