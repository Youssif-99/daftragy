export type TransactionType = 'sale' | 'expense';

export type Transaction = {
  id: string;
  created_at: string;
  type: TransactionType;
  item: string | null;
  qty: number;
  amount: number;
  note: string | null;
  raw_text: string | null;
};

export type DayTotals = {
  key: string;
  dayOfMonth: number;
  sales: number;
  expenses: number;
};

export type TopItem = {
  name: string;
  qty: number;
};

export type DashboardSummary = {
  sales: number;
  expenses: number;
  net: number;
  count: number;
  days: DayTotals[];
  topItems: TopItem[];
};

const CAIRO_TIME_ZONE = 'Africa/Cairo';

const cairoDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CAIRO_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function getCairoDateParts(date: Date) {
  const parts = cairoDateFormatter.formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

export function getCairoDayKey(value: string | Date) {
  const parts = getCairoDateParts(value instanceof Date ? value : new Date(value));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getTimeZoneOffset(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CAIRO_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const wallTime = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return wallTime - date.getTime();
}

export function getCairoPeriodStart(periodDays: number, now = new Date()) {
  const today = getCairoDateParts(now);
  const targetDay = new Date(
    Date.UTC(Number(today.year), Number(today.month) - 1, Number(today.day) - periodDays + 1),
  );
  const targetWallTime = Date.UTC(
    targetDay.getUTCFullYear(),
    targetDay.getUTCMonth(),
    targetDay.getUTCDate(),
  );
  const initialGuess = new Date(targetWallTime);
  const start = new Date(targetWallTime - getTimeZoneOffset(initialGuess));
  return start.toISOString();
}

export function getCairoPeriodDays(periodDays: number, now = new Date()): DayTotals[] {
  const today = getCairoDateParts(now);
  const todayUtc = Date.UTC(Number(today.year), Number(today.month) - 1, Number(today.day));

  return Array.from({ length: periodDays }, (_, index) => {
    const date = new Date(todayUtc - (periodDays - index - 1) * 86_400_000);
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    return {
      key,
      dayOfMonth: date.getUTCDate(),
      sales: 0,
      expenses: 0,
    };
  });
}

export function formatNumber(value: number, maximumFractionDigits = 0) {
  return value.toLocaleString('en-US', { maximumFractionDigits });
}

export function formatCairoDateTime(value: string, todayKey: string) {
  const date = new Date(value);
  const dateKey = getCairoDayKey(date);
  const clock = new Intl.DateTimeFormat('en-GB', {
    timeZone: CAIRO_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);

  if (dateKey === todayKey) return { date: 'النهارده', time: clock };

  const [, month, day] = dateKey.split('-');
  return { date: `${Number(day)}/${Number(month)}`, time: clock };
}

export function buildDashboardSummary(transactions: Transaction[], periodDays: number, now = new Date()): DashboardSummary {
  const days = getCairoPeriodDays(periodDays, now);
  const dayIndex = new Map(days.map((day, index) => [day.key, index]));
  const itemQuantities = new Map<string, number>();
  let sales = 0;
  let expenses = 0;

  for (const transaction of transactions) {
    const index = dayIndex.get(getCairoDayKey(transaction.created_at));
    if (index !== undefined) {
      if (transaction.type === 'sale') days[index].sales += transaction.amount;
      else days[index].expenses += transaction.amount;
    }

    if (transaction.type === 'sale') {
      sales += transaction.amount;
      const itemName = transaction.item?.trim() || 'صنف غير محدد';
      itemQuantities.set(itemName, (itemQuantities.get(itemName) ?? 0) + transaction.qty);
    } else {
      expenses += transaction.amount;
    }
  }

  const topItems = [...itemQuantities.entries()]
    .map(([name, qty]) => ({ name, qty }))
    .sort((first, second) => second.qty - first.qty)
    .slice(0, 4);

  return {
    sales,
    expenses,
    net: sales - expenses,
    count: transactions.length,
    days,
    topItems,
  };
}