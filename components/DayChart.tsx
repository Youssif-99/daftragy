import type { DayTotals } from '@/lib/dashboard';
import { formatNumber } from '@/lib/dashboard';

type DayChartProps = {
  days: DayTotals[];
};

export default function DayChart({ days }: DayChartProps) {
  const maximum = Math.max(1, ...days.flatMap((day) => [day.sales, day.expenses]));
  const baseline = 170;
  const chartHeight = 140;
  const chartWidth = 760;
  const step = days.length > 1 ? 710 / (days.length - 1) : 0;
  const labelEvery = days.length <= 7 ? 1 : days.length <= 14 ? 2 : 5;
  const chartSummary = days
    .map((day) => `${day.dayOfMonth}: مبيعات ${formatNumber(day.sales, 2)}، مصروفات ${formatNumber(day.expenses, 2)}`)
    .join('؛ ');

  return (
    <section className="day-section" aria-labelledby="day-heading">
      <div className="section-heading-row">
        <h2 id="day-heading" className="section-title">يوم بيوم</h2>
        <div className="chart-legend" aria-label="مفتاح الرسم البياني">
          <span><i className="legend-square legend-sales" />مبيعات</span>
          <span><i className="legend-square legend-expenses" />مصروفات</span>
        </div>
      </div>
      <svg
        aria-label={`المبيعات والمصروفات يومًا بيوم، الأقدم جهة اليمين. ${chartSummary}`}
        className="day-chart"
        direction="ltr"
        role="img"
        viewBox={`0 0 ${chartWidth} 212`}
      >
        <line className="chart-baseline" x1="20" x2="740" y1={baseline} y2={baseline} />
        {days.map((day, index) => {
          const center = chartWidth - 25 - index * step;
          const salesHeight = (day.sales / maximum) * chartHeight;
          const expensesHeight = (day.expenses / maximum) * chartHeight;
          const showLabel = index % labelEvery === 0 || index === days.length - 1;

          return (
            <g key={day.key}>
              <rect
                className="chart-bar chart-bar-sales"
                height={Math.max(day.sales ? 2 : 0, salesHeight)}
                rx="2"
                width="10"
                x={center - 12}
                y={baseline - salesHeight}
              >
                <title>{`يوم ${day.dayOfMonth}: مبيعات ${formatNumber(day.sales, 2)}`}</title>
              </rect>
              <rect
                className="chart-bar chart-bar-expenses"
                height={Math.max(day.expenses ? 2 : 0, expensesHeight)}
                rx="2"
                width="10"
                x={center + 2}
                y={baseline - expensesHeight}
              >
                <title>{`يوم ${day.dayOfMonth}: مصروفات ${formatNumber(day.expenses, 2)}`}</title>
              </rect>
              {showLabel && (
                <text className="chart-day-label" textAnchor="middle" x={center} y="195">
                  {day.dayOfMonth}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </section>
  );
}