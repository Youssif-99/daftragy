import type { TopItem } from '@/lib/dashboard';
import { formatNumber } from '@/lib/dashboard';

type TopItemsProps = {
  items: TopItem[];
};

export default function TopItems({ items }: TopItemsProps) {
  const maxQuantity = items[0]?.qty ?? 0;

  return (
    <section className="top-items-section" aria-labelledby="top-items-heading">
      <h2 id="top-items-heading" className="section-title">أكتر الأصناف اتباعاً</h2>
      {items.length === 0 ? (
        <p className="quiet-message">مفيش أصناف مباعة في الفترة دي.</p>
      ) : (
        <ol className="top-items-list">
          {items.map((item) => (
            <li className="top-item" key={item.name}>
              <div className="top-item-line">
                <span className="top-item-name">{item.name}</span>
                <span className="top-item-quantity"><bdi dir="ltr">{formatNumber(item.qty, 2)}</bdi> قطعة</span>
              </div>
              <div className="item-progress-track" aria-hidden="true">
                <span className="item-progress-fill" style={{ width: `${Math.max(4, (item.qty / maxQuantity) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}