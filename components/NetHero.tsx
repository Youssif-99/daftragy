import { formatNumber } from '@/lib/dashboard';

type NetHeroProps = {
  sales: number;
  expenses: number;
  net: number;
  count: number;
};

function IsolatedNumber({ value }: { value: string }) {
  return <span className="number-isolate" dir="ltr">{value}</span>;
}

export default function NetHero({ sales, expenses, net, count }: NetHeroProps) {
  const netColor = net < 0 ? 'net-amount net-negative' : 'net-amount net-positive';
  const netSign = net < 0 ? '−' : '';

  return (
    <section className="net-hero" aria-labelledby="net-title">
      <p id="net-title" className="eyebrow">صافي الفترة</p>
      <p className={netColor}>
        <IsolatedNumber value={`${netSign}${formatNumber(Math.abs(net), 2)}`} />
        <span className="net-currency">جنيه</span>
      </p>
      <div className="totals-strip">
        <div className="total-cell">
          <span className="total-label">المبيعات</span>
          <span className="total-value number-isolate" dir="ltr">{formatNumber(sales, 2)}</span>
        </div>
        <div className="total-cell">
          <span className="total-label">المصروفات</span>
          <span className="total-value number-isolate" dir="ltr">{formatNumber(expenses, 2)}</span>
        </div>
        <div className="total-cell">
          <span className="total-label">عدد العمليات</span>
          <span className="total-value number-isolate" dir="ltr">{formatNumber(count)}</span>
        </div>
      </div>
    </section>
  );
}