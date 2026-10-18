import type { Transaction } from '@/lib/dashboard';
import { formatCairoDateTime, formatNumber } from '@/lib/dashboard';

type LedgerProps = {
  todayKey: string;
  transactions: Transaction[];
};

export default function Ledger({ todayKey, transactions }: LedgerProps) {
  return (
    <section className="ledger-section" aria-labelledby="ledger-heading">
      <h2 id="ledger-heading" className="section-title">آخر العمليات</h2>
      <div className="ledger-surface">
        <table className="ledger-table">
          <thead>
            <tr>
              <th className="ledger-time-heading" scope="col">الوقت</th>
              <th scope="col">العملية</th>
              <th className="ledger-amount-heading" scope="col">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => {
              const dateTime = formatCairoDateTime(transaction.created_at, todayKey);
              const amount = formatNumber(transaction.amount, 2);
              const isSale = transaction.type === 'sale';
              const label = isSale
                ? `بيع: ${transaction.item?.trim() || 'صنف غير محدد'} × ${formatNumber(transaction.qty, 2)}`
                : `مصروف: ${transaction.item?.trim() || transaction.note?.trim() || 'مصروف غير محدد'}`;

              return (
                <tr key={transaction.id}>
                  <td className="ledger-time-cell">
                    <span>{dateTime.date}</span>
                    <bdi dir="ltr">{dateTime.time}</bdi>
                  </td>
                  <td className="ledger-description-cell">
                    <span className="ledger-description">{label}</span>
                    {transaction.raw_text && (
                      <span className="ledger-raw-text">«{transaction.raw_text}»</span>
                    )}
                  </td>
                  <td className={`ledger-amount-cell ${isSale ? 'amount-sale' : 'amount-expense'}`}>
                    <bdi dir="ltr">{isSale ? '+' : '−'}{amount}</bdi>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}