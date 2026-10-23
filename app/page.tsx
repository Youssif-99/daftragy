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
import { supabase } from '@/lib/supabase';

type DashboardStatus = 'loading' | 'error' | 'unlinked' | 'empty' | 'ready';

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
  const [telegramError, setTelegramError] = useState('');
  const [isTelegramLinkedNotice, setIsTelegramLinkedNotice] = useState(false);
  const [linkedChatId, setLinkedChatId] = useState<string | null>(null);
  const [manualChatId, setManualChatId] = useState('');
  const [isSavingChatId, setIsSavingChatId] = useState(false);

  const markTelegramLinked = useCallback((chatId: string) => {
    setStatus('loading');
    setIsTelegramLinkedNotice(true);
    setTelegramError('');
    setLinkedChatId(chatId);
    setRetryKey((value) => value + 1);
  }, []);

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
        router.replace('/login');
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
        let chatId = linkedChatId;
        if (!chatId) {
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
          chatId = String(profile.chat_id);
        }

        const fromISO = getCairoPeriodStart(period);
        const { data, error: transactionsError } = await supabase
          .from('transactions')
          .select('id, created_at, type, item, qty, amount, note, raw_text')
          .eq('chat_id', chatId)
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
  }, [userId, period, retryKey, linkedChatId, isDevelopment]);

  const retry = useCallback(() => setRetryKey((value) => value + 1), []);

  async function saveManualChatId() {
    if (!userId) return;
    const chatId = manualChatId.trim();
    if (!/^-?\d{5,20}$/.test(chatId)) {
      setTelegramError('اكتب رقم حساب تيليجرام صح. هتلاقيه من @userinfobot');
      return;
    }

    setIsSavingChatId(true);
    setTelegramError('');
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ chat_id: chatId })
        .eq('id', userId)
        .select('id, chat_id')
        .maybeSingle();

      if (error) throw error;
      if (!data || String(data.chat_id) !== chatId) {
        throw new Error('Profile update did not affect the signed-in user row.');
      }

      markTelegramLinked(chatId);
    } catch (error) {
      if (isDevelopment) console.log('profile update error', error);
      setTelegramError('لم يتم حفظ الرقم. تحقق من صلاحية UPDATE لصفك في profiles عبر RLS.');
    } finally {
      setIsSavingChatId(false);
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
              أدخل رقم حسابك في تيليجرام. يمكنك معرفته من
              {' '}
              <a href="https://t.me/userinfobot" rel="noreferrer" target="_blank">@userinfobot</a>
              .
            </p>
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
              {telegramError && <p className="telegram-copy-error" role="alert">{telegramError}</p>}
            </form>
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