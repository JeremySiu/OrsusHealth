import React, { useEffect, useState } from 'react';
import { CalendarClock, LineChart, Loader2 } from 'lucide-react';
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
    iconSrc: '/icons/heart-disease.png',
    unit: '%',
    formatValue: (value) => `${value.toFixed(1)}%`,
  },
  {
    id: 'restingBP',
    label: 'Resting Blood Pressure',
    description: 'Tracks resting blood pressure readings over time to highlight whether baseline pressure is moving up or down.',
    iconSrc: '/icons/blood-pressure-gauge.png',
    unit: 'mmHg',
    formatValue: (value) => `${Math.round(value)} mmHg`,
  },
  {
    id: 'cholesterol',
    label: 'Cholesterol',
    description: 'Shows total cholesterol values from each assessment so you can compare longer-term lipid trends.',
    iconSrc: '/icons/cholesterol.png',
    unit: 'mg/dL',
    formatValue: (value) => `${Math.round(value)} mg/dL`,
  },
  {
    id: 'maxHR',
    label: 'Max Heart Rate',
    description: 'Tracks the maximum heart rate recorded during each assessment to show how exertion response changes over time.',
    iconSrc: '/icons/healthcare.png',
    unit: 'bpm',
    formatValue: (value) => `${Math.round(value)} bpm`,
  },
];

const RANGE_OPTIONS = [
  { id: '10d', label: 'Last 10 days', days: 10 },
  { id: '30d', label: 'Last 30 days', days: 30 },
  { id: '90d', label: 'Last 90 days', days: 90 },
  { id: 'all', label: 'All time', days: null },
];

const TREND_CHART_COLORS = {
  riskProbability: '#f43f5e',
  restingBP: '#14b8a6',
  cholesterol: '#f59e0b',
  maxHR: '#3b82f6',
};

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

function getTimeValue(value) {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function filterPointsByRange(points, rangeId) {
  if (rangeId === 'all') return points;

  const selectedRange = RANGE_OPTIONS.find((range) => range.id === rangeId);
  if (!selectedRange?.days) return points;

  const datedPoints = points.filter((point) => getTimeValue(point.recordedAt) != null);
  if (datedPoints.length === 0) return points;

  const latestTimestamp = Math.max(...datedPoints.map((point) => getTimeValue(point.recordedAt)));
  const cutoff = latestTimestamp - selectedRange.days * 24 * 60 * 60 * 1000;
  const filtered = points.filter((point) => {
    const timestamp = getTimeValue(point.recordedAt);
    return timestamp != null && timestamp >= cutoff;
  });

  return filtered.length > 0 ? filtered : [points[points.length - 1]].filter(Boolean);
}

function getVisibleTickIndexes(points, maxTicks) {
  if (points.length <= maxTicks) {
    return points.map((_, index) => index);
  }

  const indexes = new Set([0, points.length - 1]);

  for (let tick = 1; tick < maxTicks - 1; tick += 1) {
    const ratio = tick / (maxTicks - 1);
    indexes.add(Math.round(ratio * (points.length - 1)));
  }

  return Array.from(indexes).sort((a, b) => a - b);
}

function TrendChart({ points, color, formatValue, metricLabel, unit, chartKey }) {
  const [activePointIndex, setActivePointIndex] = useState(points.length > 0 ? points.length - 1 : null);
  const width = 760;
  const height = 340;
  const padding = { top: 32, right: 28, bottom: 58, left: 56 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  useEffect(() => {
    setActivePointIndex(points.length > 0 ? points.length - 1 : null);
  }, [chartKey, points.length]);

  if (points.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-dashed border-zinc-200/90 bg-white/50 text-center"
        style={{ minHeight: '320px', padding: '1.5rem' }}
      >
        <div style={{ maxWidth: '32rem' }}>
          <p className="text-base font-semibold text-zinc-700">No data available for this metric yet.</p>
          <p className="text-sm text-zinc-500" style={{ marginTop: '0.5rem' }}>
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

  const xTickIndexes = getVisibleTickIndexes(positionedPoints, points.length > 10 ? 4 : 5);
  const linePath = positionedPoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const gradientId = `trend-fill-${metricLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const activePoint = activePointIndex != null ? positionedPoints[activePointIndex] : null;
  const tooltipWidth = 152;
  const tooltipHeight = 56;
  const tooltipX = activePoint
    ? Math.max(padding.left, Math.min(activePoint.x - tooltipWidth / 2, width - padding.right - tooltipWidth))
    : 0;
  const tooltipY = activePoint
    ? Math.max(10, activePoint.y - tooltipHeight - 18)
    : 0;

  return (
    <div
      className="w-full overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-b from-white/85 to-white/45 shadow-inner"
      style={{ padding: '0.5rem', animation: 'trend-chart-in 420ms cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      <style>
        {`
          @keyframes trend-chart-in {
            0% { opacity: 0; transform: translateY(12px) scale(0.985); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}
      </style>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${metricLabel} trend chart`}
        style={{ display: 'block', overflow: 'visible', touchAction: 'pan-y' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.03" />
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

        {activePoint ? (
          <line
            x1={activePoint.x}
            y1={padding.top}
            x2={activePoint.x}
            y2={height - padding.bottom}
            stroke={color}
            strokeOpacity="0.2"
            strokeDasharray="5 7"
          />
        ) : null}

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

        {xTickIndexes.map((tickIndex) => {
          const point = positionedPoints[tickIndex];
          const isFirstTick = tickIndex === 0;
          const isLastTick = tickIndex === positionedPoints.length - 1;
          return (
            <text
              key={`${point.recordedAt}-${point.index}`}
              x={point.x}
              y={height - padding.bottom + 24}
              textAnchor={isFirstTick ? 'start' : isLastTick ? 'end' : 'middle'}
              fontSize="12"
              fill="#71717a"
            >
              {point.label}
            </text>
          );
        })}

        {positionedPoints.map((point, index) => {
          const isActive = index === activePointIndex;
          return (
            <g key={`${point.recordedAt}-${point.index}`}>
              <rect
                x={index === 0 ? padding.left : (positionedPoints[index - 1].x + point.x) / 2}
                y={padding.top}
                width={
                  index === positionedPoints.length - 1
                    ? width - padding.right - (index === 0 ? padding.left : (positionedPoints[index - 1].x + point.x) / 2)
                    : ((positionedPoints[index + 1].x + point.x) / 2) - (index === 0 ? padding.left : (positionedPoints[index - 1].x + point.x) / 2)
                }
                height={plotHeight}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setActivePointIndex(index)}
                onFocus={() => setActivePointIndex(index)}
                onPointerDown={() => setActivePointIndex(index)}
              />
              <circle cx={point.x} cy={point.y} r={isActive ? '8' : '6'} fill={color} />
              <circle cx={point.x} cy={point.y} r={isActive ? '16' : '12'} fill={color} fillOpacity={isActive ? '0.18' : '0.1'} />
            </g>
          );
        })}

        {activePoint ? (
          <g>
            <rect
              x={tooltipX}
              y={tooltipY}
              width={tooltipWidth}
              height={tooltipHeight}
              rx="14"
              fill="rgba(255,255,255,0.96)"
              stroke="rgba(228,228,231,0.95)"
            />
            <text x={tooltipX + 12} y={tooltipY + 22} fontSize="12" fill="#71717a">
              {activePoint.label}
            </text>
            <text x={tooltipX + 12} y={tooltipY + 42} fontSize="16" fontWeight="700" fill="#18181b">
              {formatValue(activePoint.value)}
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}

export default function MyTrends({
  useAuthHook = useAuth,
  fetchRecords = fetchAssessmentRecords,
  normalizeHistory = normalizeAssessmentHistory,
  standalonePreview = false,
}) {
  const { user } = useAuthHook();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTrendId, setActiveTrendId] = useState(TREND_OPTIONS[0].id);
  const [activeRangeId, setActiveRangeId] = useState(RANGE_OPTIONS[0].id);

  useEffect(() => {
    if (!user?.id) {
      setRecords([]);
      setLoading(false);
      return;
    }

    async function fetchTrendHistory() {
      try {
        const rawRecords = await fetchRecords(user.id, { ascending: true });
        setRecords(normalizeHistory(rawRecords));
      } catch (error) {
        console.error('Error fetching trends:', error);
        setRecords([]);
      } finally {
        setLoading(false);
      }
    }

    fetchTrendHistory();
  }, [fetchRecords, normalizeHistory, user]);

  const activeTrend = TREND_OPTIONS.find((trend) => trend.id === activeTrendId) || TREND_OPTIONS[0];
  const activeTrendColor = TREND_CHART_COLORS[activeTrend.id] || '#3f3f46';
  const allChartPoints = buildChartPoints(records, activeTrend.id);
  const chartPoints = filterPointsByRange(allChartPoints, activeRangeId);
  const latestRecord = records[records.length - 1] || null;
  const latestMetricPoint = allChartPoints[allChartPoints.length - 1] || null;
  const activeRange = RANGE_OPTIONS.find((range) => range.id === activeRangeId) || RANGE_OPTIONS[0];
  const chartKey = `${activeTrendId}-${activeRangeId}`;

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center animate-in fade-in duration-500" style={{ padding: '2rem' }}>
        <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
        <p className="text-sm font-medium text-zinc-600" style={{ marginTop: '1rem' }}>Loading trend history...</p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center animate-in fade-in duration-700" style={{ padding: '2rem' }}>
        <div className="rounded-full bg-zinc-100/70" style={{ padding: '1.25rem' }}>
          <LineChart className="h-12 w-12 text-zinc-400" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-800" style={{ fontFamily: 'var(--font-heading)', marginTop: '1.5rem' }}>
          No Trends Yet
        </h2>
        <p className="text-sm text-zinc-500" style={{ marginTop: '0.75rem', maxWidth: '28rem' }}>
          Complete a cardiovascular assessment to start building a history of report data on the Trends page.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col ${standalonePreview ? '' : 'h-full overflow-y-auto'}`}
      style={{
        padding: '1.5rem',
        scrollbarWidth: 'none',
        minHeight: standalonePreview ? '100%' : undefined,
        overflowY: standalonePreview ? 'visible' : undefined,
      }}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col" style={{ gap: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-900" style={{ fontFamily: 'var(--font-heading)' }}>
            My Trends
          </h2>
          <p className="text-sm text-zinc-500">
            Review how your most important assessment values have changed across past reports.
          </p>
        </div>

        <Card className="border-white/55 bg-white/40 shadow-xl backdrop-blur-xl">
          <CardHeader style={{ padding: '1.5rem 1.5rem 1rem' }}>
            <CardTitle className="text-lg font-semibold text-zinc-800" style={{ fontFamily: 'var(--font-heading)' }}>
              Trend Picker
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '0.75rem', padding: '0 1.5rem 1.5rem' }}>
            {TREND_OPTIONS.map((trend) => {
              const isActive = trend.id === activeTrend.id;

              return (
                <Button
                  key={trend.id}
                  type="button"
                  variant="ghost"
                  onClick={() => setActiveTrendId(trend.id)}
                  className={cn(
                    'h-auto justify-start rounded-2xl border text-left shadow-sm transition-all duration-300 hover:bg-white/90',
                    isActive
                      ? 'border-transparent bg-white shadow-md ring-2 ring-teal-500/35'
                      : 'border-zinc-200/80 bg-white/65'
                  )}
                  style={{ padding: '1rem' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
                    <span
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${trend.color}15`, color: trend.color }}
                    >
                      <img
                        src={trend.iconSrc}
                        alt=""
                        aria-hidden="true"
                        style={{ width: '1.5rem', height: '1.5rem', objectFit: 'contain' }}
                      />
                    </span>
                    <span className="text-sm font-semibold text-zinc-900">{trend.label}</span>
                  </div>
                </Button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-white/55 bg-white/40 shadow-xl backdrop-blur-xl">
          <CardHeader
            className="border-b border-white/40 md:flex-row md:items-start md:justify-between"
            style={{ gap: '1rem', padding: '1.5rem 1.5rem 1.25rem' }}
          >
            <div>
              <CardTitle className="text-xl font-semibold text-zinc-800" style={{ fontFamily: 'var(--font-heading)' }}>
                {activeTrend.label}
              </CardTitle>
              <p className="text-sm leading-6 text-zinc-500" style={{ marginTop: '0.5rem', maxWidth: '42rem' }}>
                {activeTrend.description}
              </p>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/70 shadow-sm" style={{ padding: '0.75rem 1rem' }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">Assessments tracked</p>
              <p className="text-2xl font-semibold tracking-tight text-zinc-800" style={{ marginTop: '0.25rem' }}>{chartPoints.length}</p>
            </div>
          </CardHeader>
          <CardContent style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div
                className="rounded-2xl border border-white/60 bg-white/55"
                style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                  }}
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">Visible date range</p>
                    <p className="text-sm text-zinc-600" style={{ marginTop: '0.25rem' }}>
                      {activeRange.label}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {RANGE_OPTIONS.map((range) => {
                      const isActive = range.id === activeRangeId;
                      return (
                        <Button
                          key={range.id}
                          type="button"
                          variant="ghost"
                          onClick={() => setActiveRangeId(range.id)}
                          className={cn(
                            'rounded-full border text-sm font-medium transition-all duration-200',
                            isActive
                              ? 'border-transparent bg-zinc-900 text-white shadow-sm'
                              : 'border-zinc-200/80 bg-white/75 text-zinc-700 hover:bg-white'
                          )}
                          style={{ padding: '0.6rem 0.9rem' }}
                        >
                          {range.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <TrendChart
                  key={chartKey}
                  points={chartPoints}
                  color={activeTrendColor}
                  formatValue={activeTrend.formatValue}
                  metricLabel={activeTrend.label}
                  unit={activeTrend.unit}
                  chartKey={chartKey}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '0.75rem' }}>
                <div className="rounded-2xl border border-white/60 bg-white/65 shadow-sm" style={{ padding: '1rem' }}>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                    <CalendarClock className="h-4 w-4" />
                    Latest Report
                  </div>
                  <p className="text-sm font-semibold text-zinc-800" style={{ marginTop: '0.5rem' }}>
                    {latestRecord?.dateLabel || 'Unavailable'}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/60 bg-white/65 shadow-sm" style={{ padding: '1rem' }}>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                    <img
                      src={activeTrend.iconSrc}
                      alt=""
                      aria-hidden="true"
                      style={{ width: '1rem', height: '1rem', objectFit: 'contain' }}
                    />
                    Latest Value
                  </div>
                  <p className="text-sm font-semibold text-zinc-800" style={{ marginTop: '0.5rem' }}>
                    {latestMetricPoint ? activeTrend.formatValue(latestMetricPoint.value) : 'Unavailable'}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/60 bg-white/65 shadow-sm" style={{ padding: '1rem' }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">What this shows</p>
                  <p className="text-sm leading-6 text-zinc-600" style={{ marginTop: '0.5rem' }}>{activeTrend.description}</p>
                </div>
              </div>

              {chartPoints.length === 1 ? (
                <div className="rounded-2xl border border-dashed border-zinc-200/90 bg-zinc-50/70 text-sm text-zinc-500" style={{ padding: '0.75rem 1rem' }}>
                  Only one completed report is available in this range so far. Expanding the range or completing more assessments will make this trend line more informative.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
