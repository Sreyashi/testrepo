import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ReferenceLine,
} from 'recharts';
import { format, subDays, parseISO } from 'date-fns';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { Child, BehaviorLog } from '../types';
import { BEHAVIOR_LABELS, RATING_LABELS } from '../types';

interface ProgressProps {
  children: Child[];
  logs: BehaviorLog[];
  selectedChildId: string | null;
  setSelectedChildId: (id: string) => void;
}

const COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
];

const PERIODS = [
  { label: '14 Days', value: 14 },
  { label: '30 Days', value: 30 },
  { label: '60 Days', value: 60 },
  { label: '90 Days', value: 90 },
];

export default function Progress({
  children,
  logs,
  selectedChildId,
  setSelectedChildId,
}: ProgressProps) {
  const [period, setPeriod] = useState(30);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'attention', 'emotionRegulation', 'moodOverall',
  ]);

  const childLogs = useMemo(
    () =>
      logs
        .filter(l => l.childId === selectedChildId)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [logs, selectedChildId]
  );

  // Build time-series data for selected period
  const timeSeriesData = useMemo(() => {
    const today = new Date();
    return Array.from({ length: period }, (_, i) => {
      const d = subDays(today, period - 1 - i);
      const ds = format(d, 'yyyy-MM-dd');
      const log = childLogs.find(l => l.date === ds);
      if (!log) return { date: format(d, 'MMM d'), ...Object.fromEntries(Object.keys(BEHAVIOR_LABELS).map(k => [k, null])) };
      return {
        date: format(d, 'MMM d'),
        ...Object.fromEntries(
          Object.entries(log.ratings).map(([k, v]) => [k, v])
        ),
      };
    });
  }, [childLogs, period]);

  // Weekly averages for bar chart
  const weeklyData = useMemo(() => {
    const weeks: Record<string, { sum: Record<string, number>; count: number }> = {};
    childLogs.forEach(log => {
      const d = parseISO(log.date);
      const weekLabel = `W${Math.ceil(d.getDate() / 7)} ${format(d, 'MMM')}`;
      if (!weeks[weekLabel]) weeks[weekLabel] = { sum: {}, count: 0 };
      Object.entries(log.ratings).forEach(([k, v]) => {
        weeks[weekLabel].sum[k] = (weeks[weekLabel].sum[k] || 0) + v;
      });
      weeks[weekLabel].count++;
    });

    return Object.entries(weeks)
      .slice(-8)
      .map(([week, { sum, count }]) => ({
        week,
        ...Object.fromEntries(
          Object.entries(sum).map(([k, v]) => [k, +(v / count).toFixed(1)])
        ),
      }));
  }, [childLogs]);

  // Comparison: first half vs second half
  const comparisonData = useMemo(() => {
    const sorted = [...childLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (sorted.length < 4) return [];
    const half = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, half);
    const secondHalf = sorted.slice(half);

    const avg = (logsSet: BehaviorLog[], key: string) => {
      const sum = logsSet.reduce((s, l) => s + l.ratings[key as keyof typeof l.ratings], 0);
      return +(sum / logsSet.length).toFixed(1);
    };

    return Object.keys(BEHAVIOR_LABELS).map(key => ({
      behavior: BEHAVIOR_LABELS[key as keyof typeof BEHAVIOR_LABELS],
      early: avg(firstHalf, key),
      recent: avg(secondHalf, key),
      change: +(avg(secondHalf, key) - avg(firstHalf, key)).toFixed(1),
    }));
  }, [childLogs]);


  // Radar: compare first vs last week
  const radarComparison = useMemo(() => {
    const sorted = [...childLogs];
    const last7 = sorted.slice(-7);
    const first7 = sorted.slice(0, 7);
    if (!last7.length) return [];
    const avg = (logsSet: BehaviorLog[], key: string) =>
      logsSet.length
        ? +(logsSet.reduce((s, l) => s + l.ratings[key as keyof typeof l.ratings], 0) / logsSet.length).toFixed(1)
        : 0;
    return Object.keys(BEHAVIOR_LABELS).map(key => ({
      behavior: BEHAVIOR_LABELS[key as keyof typeof BEHAVIOR_LABELS].split(' ')[0],
      start: avg(first7, key),
      current: avg(last7, key),
    }));
  }, [childLogs]);

  const toggleMetric = (key: string) => {
    setSelectedMetrics(prev =>
      prev.includes(key)
        ? prev.length > 1 ? prev.filter(k => k !== key) : prev
        : [...prev, key]
    );
  };

  if (children.length === 0 || childLogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-2">
        <TrendingUp size={40} className="text-slate-300" />
        <p className="text-slate-400 text-sm">No data to show yet — start logging daily!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Progress</h2>
          <p className="text-slate-500 text-sm mt-1">Track behavioral improvements over time</p>
        </div>
        <div className="flex items-center gap-2">
          {children.length > 1 && (
            <select
              value={selectedChildId || ''}
              onChange={e => setSelectedChildId(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
            >
              {children.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <div className="flex rounded-xl border border-slate-200 overflow-hidden">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-2 text-xs font-medium transition ${period === p.value ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metric improvement cards */}
      {comparisonData.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {comparisonData.map(d => {
            return (
              <div key={d.behavior} className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm">
                <p className="text-xs text-slate-500 font-medium leading-tight mb-1">{d.behavior}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-bold text-slate-800">{d.recent}</span>
                  <span className="text-xs text-slate-400">/5</span>
                  {d.change > 0 ? (
                    <TrendingUp size={14} className="text-emerald-500 ml-auto" />
                  ) : d.change < 0 ? (
                    <TrendingDown size={14} className="text-red-400 ml-auto" />
                  ) : (
                    <Minus size={14} className="text-slate-300 ml-auto" />
                  )}
                </div>
                <p className={`text-xs font-semibold mt-0.5 ${d.change > 0 ? 'text-emerald-600' : d.change < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                  {d.change > 0 ? '+' : ''}{d.change} overall
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Metric selector */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <h3 className="font-semibold text-slate-700 mb-3">Trend Over Time</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(BEHAVIOR_LABELS).map(([key, label], i) => (
            <button
              key={key}
              onClick={() => toggleMetric(key)}
              className={`text-xs px-3 py-1.5 rounded-full border transition font-medium ${
                selectedMetrics.includes(key)
                  ? 'text-white border-transparent'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
              }`}
              style={selectedMetrics.includes(key) ? { backgroundColor: COLORS[i % COLORS.length] } : {}}
            >
              {label}
            </button>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              interval={Math.floor(period / 7)}
            />
            <YAxis domain={[1, 5]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
              formatter={(v: unknown, name: unknown) => [v ? `${v}/5` : 'No data', BEHAVIOR_LABELS[(name as string) as keyof typeof BEHAVIOR_LABELS] || String(name)]}
            />
            <ReferenceLine y={3} stroke="#e2e8f0" strokeDasharray="4 4" />
            {selectedMetrics.map((key) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={COLORS[Object.keys(BEHAVIOR_LABELS).indexOf(key) % COLORS.length]}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Radar comparison */}
      {radarComparison.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-1">Behavior Profile: Start vs Now</h3>
          <p className="text-xs text-slate-400 mb-4">Comparing first 7 logged days vs most recent 7 days</p>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radarComparison}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="behavior" tick={{ fontSize: 10, fill: '#64748b' }} />
              <Radar name="Start" dataKey="start" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.2} />
              <Radar name="Now" dataKey="current" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Weekly averages bar chart */}
      {weeklyData.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-4">Weekly Averages</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis domain={[0, 5]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              {selectedMetrics.slice(0, 3).map((key) => (
                <Bar
                  key={key}
                  dataKey={key}
                  name={BEHAVIOR_LABELS[key as keyof typeof BEHAVIOR_LABELS]}
                  fill={COLORS[Object.keys(BEHAVIOR_LABELS).indexOf(key) % COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Improvement summary table */}
      {comparisonData.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-4">Improvement Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-100">
                  <th className="text-left pb-2 font-semibold">Behavior</th>
                  <th className="text-center pb-2 font-semibold">Early Avg</th>
                  <th className="text-center pb-2 font-semibold">Recent Avg</th>
                  <th className="text-center pb-2 font-semibold">Change</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map(d => (
                  <tr key={d.behavior} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5 text-slate-700 font-medium">{d.behavior}</td>
                    <td className="text-center py-2.5 text-slate-500">{d.early}</td>
                    <td className="text-center py-2.5 font-semibold" style={{ color: RATING_LABELS[Math.round(d.recent)]?.color }}>
                      {d.recent}
                    </td>
                    <td className="text-center py-2.5">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        d.change > 0 ? 'bg-emerald-100 text-emerald-700' :
                        d.change < 0 ? 'bg-red-100 text-red-600' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {d.change > 0 ? <TrendingUp size={12} /> : d.change < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                        {d.change > 0 ? '+' : ''}{d.change}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
