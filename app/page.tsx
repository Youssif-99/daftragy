'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DayChart from '@/components/DayChart';
import Ledger from '@/components/Ledger';
import NetHero from '@/components/NetHero';
import PeriodChips from '@/components/PeriodChips';
import TopItems from '@/components/TopItems';
import {
  buildDashboardSummary,
  getCairoDayKey,
  getCairoPeriodStart,
  type Transaction,
  type TransactionType,
} from '@/lib/dashboard';
import TelegramLoginButton from '@/components/TelegramLoginButton';
import { supabase } from '@/lib/supabase';
import { TELEGRAM_BOT_USERNAME } from '@/lib/telegram';
import type { TelegramWidgetUser } from '@/lib/telegram-widget';

type DashboardStatus = 'loading' | 'error' | 'unlinked' | 'empty' | 'ready';
type TelegramLinkStatus = 'idle' | 'creating' | 'waiting' | 'expired' | 'error' | 'linked';

type TransactionRecord = {
  id: string;
  created_at: string;
  type: string;
  item: string | null;
  qty: number | string | null;
  amount: number | string | null;
  note: string | null;
  raw_text: string | null;
};

function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton" aria-label="جاري تحميل البيانات" role="status">
      <span className="skeleton-line skeleton-short" />
      <span className="skeleton-line skeleton-figure" />
      <span className="skeleton-line skeleton-strip" />
      <span className="skeleton-line skeleton-chart" />
      <span className="skeleton-line skeleton-bottom" />
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const [userId, setUserId] = useState<string | null>(null);
  const [period, setPeriod] = useState(7);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [renderNow, setRenderNow] = useState<Date | null>(null);
  const [status, setStatus] = useState<DashboardStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [telegramLinkStatus, setTelegramLinkStatus] = useState<TelegramLinkStatus>('idle');
  const [telegramCode, setTelegramCode] = useState<string | null>(null);
  const [telegramExpiresAt, setTelegramExpiresAt] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [telegramError, setTelegramError] = useState('');
  const [hasCopiedCode, setHasCopiedCode] = useState(false);
  const [isTelegramLinkedNotice, setIsTelegramLinkedNotice] = useState(false);
  const [manualChatId, setManualChatId] = useState('');
  const [isSavingChatId, setIsSavingChatId] = useState(false);

  const markTelegramLinked = useCallback(() => {
    setTelegramLinkStatus('linked');
    setIsTelegramLinkedNotice(true);
    setRetryKey((value) => value + 1);
    router.refresh();
  }, [router]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setRenderNow(new Date()));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      if (!session) {
        setUserId(null);
        router.replace('/login');
      } else {
        setUserId(session.user.id);
      }
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      if (error) {
        setErrorMessage('تعذر التحقق من تسجيل الدخول. حاول مرة تانية.');
        setStatus('error');
      } else if (!data.session) {
        router.replace('/login');
      } else {
        setUserId(data.session.user.id);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    let isCurrentRequest = true;

    async function loadDashboard() {
      setStatus('loading');
      setErrorMessage('');

      if (isDevelopment) {
        console.log('session user id', userId);
      }

      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('chat_id')
          .eq('id', userId)
          .maybeSingle();

        if (isDevelopment) {
          console.log('profile query result', profile);
          console.log('profile query error', profileError);
        }

        if (profileError) throw profileError;
        if (profile?.chat_id == null) {
          if (isCurrentRequest) setStatus('unlinked');
          return;
        }

        const fromISO = getCairoPeriodStart(period);
        const { data, error: transactionsError } = await supabase
          .from('transactions')
          .select('id, created_at, type, item, qty, amount, note, raw_text')
          .eq('chat_id', String(profile.chat_id))
          .gte('created_at', fromISO)
          .order('created_at', { ascending: false })
          .limit(1000);

        if (isDevelopment) {
          console.log('transactions query result', data);
          console.log('transactions query error', transactionsError);
        }

        if (transactionsError) throw transactionsError;
        const rows = ((data ?? []) as TransactionRecord[]).map((row): Transaction => ({
          id: row.id,
          created_at: row.created_at,
          type: row.type as TransactionType,
          item: row.item,
          qty: Number(row.qty ?? 0),
          amount: Number(row.amount ?? 0),
          note: row.note,
          raw_text: row.raw_text,
        }));

        if (isCurrentRequest) {
          setTransactions(rows);
          setStatus(rows.length === 0 ? 'empty' : 'ready');
        }
      } catch (error) {
        if (isDevelopment) {
          console.log('dashboard fetch error', error);
        }

        if (isCurrentRequest) {
          setErrorMessage('حصلت مشكلة أثناء تحميل العمليات. حاول مرة تانية.');
          setStatus('error');
        }
      }
    }

    void loadDashboard();
    return () => {
      isCurrentRequest = false;
    };
  }, [userId, period, retryKey, isDevelopment]);

  useEffect(() => {
    if (telegramLinkStatus !== 'waiting' || !telegramExpiresAt) return;

    const updateRemaining = () => {
      const seconds = Math.max(0, Math.ceil((telegramExpiresAt - Date.now()) / 1000));
      setRemainingSeconds(seconds);
      if (seconds === 0) setTelegramLinkStatus('expired');
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [telegramExpiresAt, telegramLinkStatus]);

  useEffect(() => {
    const shouldWatchLink =
      !!userId &&
      (telegramLinkStatus === 'idle' ||
        telegramLinkStatus === 'creating' ||
        telegramLinkStatus === 'waiting' ||
        telegramLinkStatus === 'expired' ||
        telegramLinkStatus === 'error' ||
        status === 'unlinked');

    if (!shouldWatchLink) return;

    let isCurrentRequest = true;

    async function checkTelegramLink() {
      if (!userId) return;

      if (telegramLinkStatus === 'waiting' && telegramExpiresAt && Date.now() >= telegramExpiresAt) {
        if (isCurrentRequest) setTelegramLinkStatus('expired');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('chat_id')
        .eq('id', userId)
        .maybeSingle();

      if (isDevelopment) {
        console.log('waiting profile query result', data);
        console.log('waiting profile query error', error);
      }

      if (!isCurrentRequest || error || data?.chat_id == null) return;

      if (isCurrentRequest) {
        setTelegramLinkStatus('linked');
        setIsTelegramLinkedNotice(true);
        setRetryKey((value) => value + 1);
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkTelegramLink();
      }
    };

    const handleFocus = () => {
      void checkTelegramLink();
    };

    void checkTelegramLink();
    const poll = window.setInterval(() => void checkTelegramLink(), 3000);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      isCurrentRequest = false;
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [telegramExpiresAt, telegramLinkStatus, userId, status, isDevelopment]);

  const retry = useCallback(() => setRetryKey((value) => value + 1), []);

  async function createTelegramLink() {
    if (!userId) return;
    setTelegramLinkStatus('creating');
    setTelegramError('');
    setTelegramCode(null);

    if (!TELEGRAM_BOT_USERNAME) {
      setTelegramError('إعداد اسم بوت تيليجرام ناقص. أضف NEXT_PUBLIC_BOT_USERNAME ثم حاول تاني.');
      setTelegramLinkStatus('error');
      return;
    }

    try {
      const bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      const code = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
      const expiresAt = Date.now() + 15 * 60 * 1000;
      const { error } = await supabase.from('link_codes').insert({
        code,
        user_id: userId,
        expires_at: new Date(expiresAt).toISOString(),
        used: false,
      });

      if (error) throw error;

      setTelegramCode(code);
      setTelegramExpiresAt(expiresAt);
      setRemainingSeconds(15 * 60);
      setHasCopiedCode(false);
      setTelegramLinkStatus('waiting');
    } catch {
      setTelegramError('مقدرناش نجهّز الكود، حاول تاني.');
      setTelegramLinkStatus('error');
    }
  }

  async function saveManualChatId() {
    if (!userId) return;
    const chatId = manualChatId.trim();
    if (!/^-?\d{5,20}$/.test(chatId)) {
      setTelegramError('اكتب رقم حساب تيليجرام صح. هتلاقيه من @userinfobot');
      setTelegramLinkStatus('error');
      return;
    }

    setIsSavingChatId(true);
    setTelegramError('');
    const { error } = await supabase.from('profiles').update({ chat_id: chatId }).eq('id', userId);
    setIsSavingChatId(false);

    if (error) {
      setTelegramError('مقدرناش نحفظ رقم تيليجرام. تأكد إن صلاحية تعديل الملف الشخصي مفتوحة.');
      setTelegramLinkStatus('error');
      return;
    }

    markTelegramLinked();
  }

  async function completeTelegramLogin(user: TelegramWidgetUser) {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setTelegramError('سجّل دخول تاني بعدين حاول الربط.');
      setTelegramLinkStatus('error');
      return;
    }

    setTelegramError('');
    const response = await fetch('/api/telegram/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(user),
    });
    const result = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

    if (!response.ok || !result?.ok) {
      if (result?.error === 'bot_token_missing') {
        setTelegramError('ضيف TELEGRAM_BOT_TOKEN في إعدادات المشروع بعدين جرّب زر تيليجرام تاني.');
      } else {
        setTelegramError('مقدرناش نأكد تسجيل تيليجرام. استخدم رقم الشات اليدوي تحت.');
      }
      setTelegramLinkStatus('error');
      return;
    }

    markTelegramLinked();
  }

  async function copyTelegramCommand() {
    if (!telegramCode) return;

    try {
      await navigator.clipboard.writeText(`/start ${telegramCode}`);
      setHasCopiedCode(true);
    } catch {
      setTelegramError('مش قادرين ننسخ الأمر تلقائياً. انسخه يدويًا.');
    }
  }

  async function signOut() {
    setIsSigningOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setIsSigningOut(false);
      setErrorMessage('تعذر تسجيل الخروج. حاول مرة تانية.');
      setStatus('error');
      return;
    }
    router.replace('/login');
  }

  const summary = renderNow ? buildDashboardSummary(transactions, period, renderNow) : null;
  const todayKey = renderNow ? getCairoDayKey(renderNow) : '';

  return (
    <main className="dashboard" dir="rtl">
      <div className="dashboard-shell">
        <header className="dashboard-header">
          <Link className="brand-lockup" href="/" aria-label="دفترجي، الصفحة الرئيسية">
            <span className="brand-mark" aria-hidden="true">
              <i /><i /><i /><i /><i />
            </span>
            <span className="brand-wordmark">دفترجي</span>
          </Link>
          <button className="sign-out-button" disabled={isSigningOut} onClick={signOut} type="button">
            {isSigningOut ? 'جاري الخروج' : 'تسجيل الخروج'}
          </button>
        </header>

        {status === 'loading' && <DashboardSkeleton />}

        {isTelegramLinkedNotice && (
          <p className="telegram-linked-notice" role="status">«تم ربط حسابك ✅»</p>
        )}

        {status === 'error' && (
          <section className="state-message" role="alert">
            <p>{errorMessage || 'حصلت مشكلة أثناء تحميل العمليات. حاول مرة تانية.'}</p>
            <button className="action-button" onClick={retry} type="button">إعادة المحاولة</button>
          </section>
        )}

        {status === 'unlinked' && (
          <section className="state-message">
            <p>«حسابك لسه مش مربوط بتيليجرام.»</p>
            <p className="telegram-help">
              البوت بيرد «سجّل الأول» لأن n8n مش بيسجّل كود /start. اربط الحساب من هنا، أو انسخ رقمك من
              {' '}
              <a href="https://t.me/userinfobot" rel="noreferrer" target="_blank">@userinfobot</a>
              .
            </p>
            <TelegramLoginButton onAuth={completeTelegramLogin} />
            <form
              className="telegram-manual-form"
              onSubmit={(event) => {
                event.preventDefault();
                void saveManualChatId();
              }}
            >
              <label htmlFor="telegram-chat-id">رقم حساب تيليجرام</label>
              <div className="telegram-copy-line">
                <input
                  id="telegram-chat-id"
                  inputMode="numeric"
                  autoComplete="off"
                  dir="ltr"
                  placeholder="123456789"
                  value={manualChatId}
                  onChange={(event) => setManualChatId(event.target.value)}
                />
                <button className="action-button telegram-primary-button" disabled={isSavingChatId} type="submit">
                  {isSavingChatId ? 'جاري الربط…' : 'ربط'}
                </button>
              </div>
            </form>
            {(telegramLinkStatus === 'idle' || telegramLinkStatus === 'creating') && (
              <button
                className="action-button"
                disabled={telegramLinkStatus === 'creating'}
                onClick={createTelegramLink}
                type="button"
              >
                {telegramLinkStatus === 'creating' ? 'جاري تجهيز الكود…' : 'أو أنشئ كود /start'}
              </button>
            )}
            {telegramLinkStatus === 'error' && (
              <div className="telegram-link-error" role="alert">
                <p>{telegramError || 'مقدرناش نجهّز الكود، حاول تاني.'}</p>
                <button className="action-button" onClick={createTelegramLink} type="button">حاول تاني</button>
              </div>
            )}
            {telegramLinkStatus === 'waiting' && telegramCode && (
              <div className="telegram-link-panel" aria-live="polite">
                <a
                  className="action-button telegram-primary-button"
                  href={`https://t.me/${TELEGRAM_BOT_USERNAME}?start=${telegramCode}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  افتح تيليجرام
                </a>
                <div className="telegram-copy-line">
                  <code dir="ltr">/start {telegramCode}</code>
                  <button className="action-button" onClick={copyTelegramCommand} type="button">
                    {hasCopiedCode ? 'تم النسخ' : 'نسخ'}
                  </button>
                </div>
                <p className="telegram-countdown">
                  الكود صالح لمدة <bdi dir="ltr">{String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:{String(remainingSeconds % 60).padStart(2, '0')}</bdi>
                </p>
                {telegramError && <p className="telegram-copy-error" role="alert">{telegramError}</p>}
              </div>
            )}
            {telegramLinkStatus === 'expired' && (
              <div className="telegram-link-error" role="status">
                <p>«الكود انتهى.»</p>
                <button className="action-button telegram-primary-button" onClick={createTelegramLink} type="button">
                  إنشاء كود جديد
                </button>
              </div>
            )}
          </section>
        )}

        {status === 'empty' && (
          <section className="state-message empty-message">
            <p>«لسه مفيش عمليات. ابعت أول فويس نوت للبوت وهتظهر هنا.»</p>
          </section>
        )}

        {status === 'ready' && summary && (
          <>
            <PeriodChips value={period} onChange={setPeriod} />
            <NetHero
              count={summary.count}
              expenses={summary.expenses}
              net={summary.net}
              sales={summary.sales}
            />
            <DayChart days={summary.days} />
            <div className="detail-columns">
              <TopItems items={summary.topItems} />
              <Ledger todayKey={todayKey} transactions={transactions.slice(0, 10)} />
            </div>
            <footer className="dashboard-footer">
              «كل عملية بتتسجل من فويس أو رسالة على تيليجرام وتظهر هنا.»
            </footer>
          </>
        )}
      </div>
    </main>
  );
}