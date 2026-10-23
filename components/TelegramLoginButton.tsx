'use client';

import { useEffect, useRef } from 'react';
import { TELEGRAM_BOT_USERNAME } from '@/lib/telegram';
import type { TelegramWidgetUser } from '@/lib/telegram-widget';

type TelegramLoginButtonProps = {
  onAuth: (user: TelegramWidgetUser) => void;
};

export default function TelegramLoginButton({ onAuth }: TelegramLoginButtonProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onAuthRef = useRef(onAuth);

  useEffect(() => {
    onAuthRef.current = onAuth;
  }, [onAuth]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !TELEGRAM_BOT_USERNAME) return;

    window.onTelegramAuth = (user: TelegramWidgetUser) => {
      onAuthRef.current(user);
    };

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', TELEGRAM_BOT_USERNAME);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '8');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-lang', 'ar');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    host.replaceChildren(script);

    return () => {
      delete window.onTelegramAuth;
      host.replaceChildren();
    };
  }, []);

  return <div ref={hostRef} className="telegram-widget-host" />;
}

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramWidgetUser) => void;
  }
}
