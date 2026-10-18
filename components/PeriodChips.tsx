'use client';

const periods = [
  { days: 7, label: 'آخر 7 أيام' },
  { days: 14, label: 'آخر 14 يوم' },
  { days: 30, label: 'آخر 30 يوم' },
] as const;

type PeriodChipsProps = {
  value: number;
  onChange: (days: number) => void;
};

export default function PeriodChips({ value, onChange }: PeriodChipsProps) {
  return (
    <div className="period-chips" aria-label="الفترة الزمنية">
      {periods.map((period) => (
        <button
          aria-pressed={value === period.days}
          className="period-chip"
          key={period.days}
          onClick={() => onChange(period.days)}
          type="button"
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}