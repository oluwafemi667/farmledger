import { chartSeries, type FarmDay } from "@/lib/domain/overview";
import { formatShortDate } from "@/lib/domain/dates";

const W = 760;
const H = 260;
const M = { t: 16, r: 12, b: 30, l: 44 };

/**
 * Thirty days of egg collection: a bar per day, a line for the trailing
 * seven-day average. Days with nothing recorded are drawn as hatched gaps,
 * never as zero-height bars, because a missed entry is not a bad day.
 * Drawn as plain SVG so it works offline and prints cleanly.
 */
export function ProductionChart({ days, expected, paper = false }: { days: FarmDay[]; expected?: (number | null)[]; paper?: boolean }) {
  const series = chartSeries(days);
  const max = Math.max(1, ...series.map((p) => p.eggs), ...(expected ?? []).map((v) => v ?? 0));
  const top = Math.ceil(max / 500) * 500 || 500;
  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;
  const slot = iw / Math.max(1, series.length);
  const bw = Math.max(3, slot * 0.62);
  const x = (i: number) => M.l + slot * i + slot / 2;
  const y = (v: number) => M.t + ih - (v / top) * ih;

  const line = series
    .map((p, i) => (p.average === null ? null : `${x(i).toFixed(1)},${y(p.average).toFixed(1)}`))
    .filter(Boolean)
    .join(" ");
  const expectedLine = (expected ?? [])
    .map((v, i) => (v === null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`))
    .filter(Boolean)
    .join(" ");
  const ticks = [0, 0.5, 1].map((f) => Math.round((top * f) / 100) * 100);
  const logged = series.filter((p) => !p.unlogged);
  const summary = logged.length
    ? `Eggs collected per day over ${series.length} days. Highest ${Math.max(...logged.map((p) => p.eggs)).toLocaleString("en-NG")}, lowest ${Math.min(...logged.map((p) => p.eggs)).toLocaleString("en-NG")}. ${series.length - logged.length} days have no record.`
    : "No eggs have been recorded in this period.";

  return (
    <figure className="flex flex-col gap-3">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} className="h-auto w-full">
        <defs>
          <pattern id="gap-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="5" stroke="#4E6A5C" strokeWidth="1.4" />
          </pattern>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke={paper ? "rgb(var(--c-ivory-300))" : "#1B2420"} strokeWidth="1" />
            <text x={M.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill={paper ? "rgb(var(--c-stone-600))" : "#93A89C"} className="font-mono">
              {t.toLocaleString("en-NG")}
            </text>
          </g>
        ))}
        {series.map((p, i) =>
          p.unlogged ? (
            <rect key={p.day} x={x(i) - bw / 2} y={M.t} width={bw} height={ih} fill="url(#gap-hatch)" opacity="0.55" />
          ) : (
            <rect
              key={p.day}
              x={x(i) - bw / 2}
              y={y(p.eggs)}
              width={bw}
              height={Math.max(1, M.t + ih - y(p.eggs))}
              fill="#CFA23F"
              rx="1"
            >
              <title>{`${formatShortDate(p.day)}: ${p.eggs.toLocaleString("en-NG")} eggs`}</title>
            </rect>
          ),
        )}
        {line ? <polyline points={line} fill="none" stroke={paper ? "rgb(var(--c-stone-800))" : "#8AD0F0"} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /> : null}
        {expectedLine ? <polyline points={expectedLine} fill="none" stroke={paper ? "rgb(var(--c-forest-800))" : "#86E3AE"} strokeWidth="1.5" strokeDasharray="5 4" strokeLinejoin="round" /> : null}
        {series.map((p, i) =>
          i % 7 === 0 || (i === series.length - 1 && (series.length - 1) % 7 >= 4) ? (
            <text key={`l${p.day}`} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill={paper ? "rgb(var(--c-stone-600))" : "#93A89C"} className="font-mono">
              {formatShortDate(p.day).replace(/^\w+ /, "")}
            </text>
          ) : null,
        )}
      </svg>
      <figcaption className={`flex flex-wrap gap-x-6 gap-y-1 text-xs ${paper ? "text-stone-700" : "text-night-300"}`}>
        <span className="inline-flex items-center gap-2"><span aria-hidden className="h-2.5 w-2.5 bg-wheat-500" />Eggs per day</span>
        <span className="inline-flex items-center gap-2"><span aria-hidden className={`h-0.5 w-4 ${paper ? "bg-stone-800" : "bg-sky-300"}`} />7-day average</span>
        {expectedLine ? <span className="inline-flex items-center gap-2"><span aria-hidden className={`w-4 border-t border-dashed ${paper ? "border-forest-800" : "border-signal-300"}`} />Breed standard for the flocks&apos; ages</span> : null}
        <span className="inline-flex items-center gap-2"><span aria-hidden className="h-2.5 w-2.5 border border-night-600 bg-night-800" />Hatched: nothing recorded</span>
      </figcaption>
    </figure>
  );
}
