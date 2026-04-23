import React, { useEffect, useState } from 'react';
import { Activity, CalendarClock, HeartPulse, LineChart, Loader2, Waves } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { fetchAssessmentRecords, normalizeAssessmentHistory } from '../lib/assessmentHistory';
import { cn } from '@/lib/utils';

const TREND_OPTIONS = [
  {
    id: 'riskProbability',
    label: 'Heart Risk Probability',
    description: 'Shows how the model-estimated cardiovascular risk score has changed across completed assessments.',
    icon: HeartPulse,
    color: '#f43f5e',
    unit: '%',
    formatValue: (value) => `${value.toFixed(1)}%`,
  },
  {
    id: 'restingBP',
    label: 'Resting Blood Pressure',
    description: 'Tracks resting blood pressure readings over time to highlight whether baseline pressure is moving up or down.',
    icon: Waves,
    color: '#14b8a6',
    unit: 'mmHg',
    formatValue: (value) => `${Math.round(value)} mmHg`,
  },
  {
    id: 'cholesterol',
    label: 'Cholesterol',
    description: 'Shows total cholesterol values from each assessment so you can compare longer-term lipid trends.',
    icon: Activity,
    color: '#f59e0b',
    unit: 'mg/dL',
    formatValue: (value) => `${Math.round(value)} mg/dL`,
  },
  {
    id: 'maxHR',
    label: 'Max Heart Rate',
    description: 'Tracks the maximum heart rate recorded during each assessment to show how exertion response changes over time.',
    icon: LineChart,
    color: '#3b82f6',
    unit: 'bpm',
    formatValue: (value) => `${Math.round(value)} bpm`,
  },
];

function buildChartPoints(records, trendKey) {
  const points = [];

  records.forEach((record, index) => {
    const value = record[trendKey];
    if (value == null) return;

    points.push({
      index,
      label: record.dateLabel,
      recordedAt: record.recordedAt,
      value,
    });
  });

  return points;
}

function TrendChart({ points, color, formatValue, metricLabel, unit }) {
  const width = 760;
  const height = 320;
  const padding = { top: 24, right: 28, bottom: 52, left: 52 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  if (points.length === 0) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-zinc-200/90 bg-white/50 px-6 text-center">
        <div className="max-w-md">
          <p className="text-base font-semibold text-zinc-700">No data available for this metric yet.</p>
          <p className="mt-2 text-sm text-zinc-500">
            Completed assessments will appear here once they include a valid {metricLabel.toLowerCase()} value.
          </p>
        </div>
      </div>
    );
  }

  const values = points.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const hasRange = maxValue !== minValue;
  const paddingValue = hasRange ? (maxValue - minValue) * 0.18 : Math.max(Math.abs(maxValue) * 0.12, 1);
  const domainMin = minValue - paddingValue;
  const domainMax = maxValue + paddingValue;
  const yTicks = Array.from({ length: 4 }, (_, index) => domainMin + ((domainMax - domainMin) / 3) * index).reverse();

  const positionedPoints = points.map((point, pointIndex) => {
    const x = points.length === 1
      ? padding.left + plotWidth / 2
      : padding.left + (plotWidth * pointIndex) / (points.length - 1);
    const normalized = domainMax === domainMin ? 0.5 : (point.value - domainMin) / (domainMax - domainMin);
    const y = padding.top + plotHeight - normalized * plotHeight;

    return { ...point, x, y };
  });

  const linePath = positionedPoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const gradientId = `trend-fill-${metricLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-b from-white/80 to-white/45 shadow-inner">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={`${metricLabel} trend chart`}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => {
          const normalized = domainMax === domainMin ? 0.5 : (tick - domainMin) / (domainMax - domainMin);
          const y = padding.top + plotHeight - normalized * plotHeight;
          return (
            <g key={tick}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="rgba(24,24,27,0.08)" strokeDasharray="4 6" />
              <text x={padding.left - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#71717a">
                {unit === '%' ? `${Math.round(tick)}%` : Math.round(tick)}
              </text>
            </g>
          );
        })}

        {positionedPoints.length > 1 ? (
            <path
            d={`${linePath} L ${positionedPoints[positionedPoints.length - 1].x} ${height - padding.bottom} L ${positionedPoints[0].x} ${height - padding.bottom} Z`}
            fill={`url(#${gradientId})`}
          />
        ) : null}

        {positionedPoints.length > 1 ? (
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {positionedPoints.map((point) => (
          <g key={`${point.recordedAt}-${point.index}`}>
            <circle cx={point.x} cy={point.y} r="6" fill={color} />
            <circle cx={point.x} cy={point.y} r="12" fill={color} fillOpacity="0.12" />
            <text x={point.x} y={height - padding.bottom + 22} textAnchor="middle" fontSize="12" fill="#71717a">
              {point.label}
            </text>
            <text x={point.x} y={point.y - 14} textAnchor="middle" fontSize="12" fontWeight="600" fill="#27272a">
              {formatValue(point.value)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function MyTrends() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTrendId, setActiveTrendId] = useState(TREND_OPTIONS[0].id);

  useEffect(() => {
    if (!user?.id) return;

    async function fetchTrendHistory() {
      try {
        const rawRecords = await fetchAssessmentRecords(user.id, { ascending: true });
        setRecords(normalizeAssessmentHistory(rawRecords));
      } catch (error) {
        console.error('Error fetching trends:', error);
        setRecords([]);
      } finally {
        setLoading(false);
      }
    }

    fetchTrendHistory();
  }, [user]);

  const activeTrend = TREND_OPTIONS.find((trend) => trend.id === activeTrendId) || TREND_OPTIONS[0];
  const ActiveTrendIcon = activeTrend.icon;
  const chartPoints = buildChartPoints(records, activeTrend.id);
  const latestRecord = records[records.length - 1] || null;
  const latestMetricPoint = chartPoints[chartPoints.length - 1] || null;

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 animate-in fade-in duration-500">
        <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
        <p className="mt-4 text-sm font-medium text-zinc-600">Loading trend history...</p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
        <div className="rounded-full bg-zinc-100/70 p-5">
          <LineChart className="h-12 w-12 text-zinc-400" />
        </div>
        <h2 className="mt-6 text-2xl font-semibold tracking-tight text-zinc-800" style={{ fontFamily: 'var(--font-heading)' }}>
          No Trends Yet
        </h2>
        <p className="mt-3 max-w-md text-sm text-zinc-500">
          Complete a cardiovascular assessment to start building a history of report data on the Trends page.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6 md:p-8" style={{ scrollbarWidth: 'none' }}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-900" style={{ fontFamily: 'var(--font-heading)' }}>
            My Trends
          </h2>
          <p className="text-sm text-zinc-500">
            Review how your most important assessment values have changed across past reports.
          </p>
        </div>

        <Card className="border-white/55 bg-white/40 shadow-xl backdrop-blur-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-zinc-800" style={{ fontFamily: 'var(--font-heading)' }}>
              Trend Picker
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {TREND_OPTIONS.map((trend) => {
              const Icon = trend.icon;
              const isActive = trend.id === activeTrend.id;

              return (
                <Button
                  key={trend.id}
                  type="button"
                  variant="ghost"
                  onClick={() => setActiveTrendId(trend.id)}
                  className={cn(
                    'h-auto justify-start rounded-2xl border px-4 py-4 text-left shadow-sm transition-all hover:bg-white/90',
                    isActive
                      ? 'border-transparent bg-white shadow-md ring-2 ring-teal-500/35'
                      : 'border-zinc-200/80 bg-white/65'
                  )}
                  style={{ padding: '1rem' }}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${trend.color}15`, color: trend.color }}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="flex flex-col">
                      <span className="text-sm font-semibold text-zinc-900">{trend.label}</span>
                      <span className="mt-1 text-xs leading-5 text-zinc-500">{trend.description}</span>
                    </span>
                  </div>
                </Button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-white/55 bg-white/40 shadow-xl backdrop-blur-xl">
          <CardHeader className="gap-4 border-b border-white/40 pb-5 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="text-xl font-semibold text-zinc-800" style={{ fontFamily: 'var(--font-heading)' }}>
                {activeTrend.label}
              </CardTitle>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">{activeTrend.description}</p>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">Assessments tracked</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-800">{chartPoints.length}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <TrendChart
              points={chartPoints}
              color={activeTrend.color}
              formatValue={activeTrend.formatValue}
              metricLabel={activeTrend.label}
              unit={activeTrend.unit}
            />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/60 bg-white/65 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                  <CalendarClock className="h-4 w-4" />
                  Latest Report
                </div>
                <p className="mt-2 text-sm font-semibold text-zinc-800">
                  {latestRecord?.dateLabel || 'Unavailable'}
                </p>
              </div>

              <div className="rounded-2xl border border-white/60 bg-white/65 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                  <ActiveTrendIcon className="h-4 w-4" />
                  Latest Value
                </div>
                <p className="mt-2 text-sm font-semibold text-zinc-800">
                  {latestMetricPoint ? activeTrend.formatValue(latestMetricPoint.value) : 'Unavailable'}
                </p>
              </div>

              <div className="rounded-2xl border border-white/60 bg-white/65 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">What this shows</p>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{activeTrend.description}</p>
              </div>
            </div>

            {chartPoints.length === 1 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200/90 bg-zinc-50/70 px-4 py-3 text-sm text-zinc-500">
                Only one completed report is available so far. New assessments will make this trend line more informative.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
