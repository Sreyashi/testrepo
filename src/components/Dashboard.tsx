import { useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { format, subDays, parseISO } from 'date-fns';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  PenLine,
  AlertCircle,
  CheckCircle2,
  Flame,
  Calendar,
} from 'lucide-react';
import type { Child, BehaviorLog } from '../types';
import { BEHAVIOR_LABELS, DAY_RATING_CONFIG } from '../types';

interface DashboardProps {
  children: Child[];
  logs: BehaviorLog[];
  selectedChildId: string | null;
  setSelectedChildId: (id: string) => void;
  onNavigate: (view: 'log' | 'profiles') => void;
}

export default function Dashboard({
  children,
  logs,
  selectedChildId,
  setSelectedChildId,
  onNavigate,
}: DashboardProps) {
  const child = children.find(c => c.id === selectedChildId);
  const childLogs = useMemo(
    () =>
      logs
        .filter(l => l.childId === selectedChildId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [logs, selectedChildId]
  );

  const latestLog = childLogs[0];
  const last7Days = childLogs.slice(0, 7);
  const prev7Days = childLogs.slice(7, 14);

  const avgRating = (logsSet: BehaviorLog[]) => {
    if (!logsSet.length) return 0;
    const keys = Object.keys(logsSet[0].ratings) as (keyof typeof logsSet[0]['ratings'])[];
    const total = logsSet.reduce((sum, l) => {
      const avg = keys.reduce((s, k) => s + l.ratings[k], 0) / keys.length;
      return sum + avg;
    }, 0);
    return +(total / logsSet.length).toFixed(1);
  };

  const currentAvg = avgRating(last7Days);
  const prevAvg = avgRating(prev7Days);
  const trend = currentAvg - prevAvg;

  // Streak: consecutive days logged
  const streak = useMemo(() => {
    let count = 0;
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const d = format(subDays(today, i), 'yyyy-MM-dd');
      if (childLogs.some(l => l.date === d)) count++;
      else break;
    }
    return count;
  }, [childLogs]);

  // Last 14 days for mini line chart
  const last14 = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 14 }, (_, i) => {
      const d = subDays(today, 13 - i);
      const ds = format(d, 'yyyy-MM-dd');
      const log = childLogs.find(l => l.date === ds);
      if (!log) return { date: format(d, 'MMM d'), avg: null };
      const keys = Object.keys(log.ratings) as (keyof typeof log.ratings)[];
      const avg = +(keys.reduce((s, k) => s + log.ratings[k], 0) / keys.length).toFixed(1);
      return { date: format(d, 'MMM d'), avg };
    });
  }, [childLogs]);

  // Radar data for latest log
  const radarData = useMemo(() => {
    if (!latestLog) return [];
    return Object.entries(latestLog.ratings).map(([key, val]) => ({
      behavior: BEHAVIOR_LABELS[key as keyof typeof BEHAVIOR_LABELS].split(' ')[0],
      value: val,
      fullMark: 5,
    }));
  }, [latestLog]);

  // Today's log status
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayLog = childLogs.find(l => l.date === today);

  if (children.length === 0) {
    return (
      <EmptyState onNavigate={onNavigate} />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
          <p className="text-slate-500 text-sm mt-1">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        {/* Child selector */}
        {children.length > 1 && (
          <select
            value={selectedChildId || ''}
            onChange={e => setSelectedChildId(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            {children.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Today's log CTA */}
      {!todayLog ? (
        <div className="bg-indigo-600 rounded-2xl p-5 flex items-center justify-between gap-4 shadow-lg shadow-indigo-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <PenLine size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-semibold">Today's log is missing</p>
              <p className="text-indigo-200 text-sm">Record {child?.name}'s behavior for today</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('log')}
            className="bg-white text-indigo-700 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-indigo-50 transition flex-shrink-0"
          >
            Log Now
          </button>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-emerald-800 font-semibold text-sm">Today's log recorded</p>
            <p className="text-emerald-600 text-xs">
              Overall: {DAY_RATING_CONFIG[todayLog.overallDay].emoji} {DAY_RATING_CONFIG[todayLog.overallDay].label}
            </p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="7-Day Avg Score"
          value={currentAvg > 0 ? `${currentAvg}/5` : '—'}
          sub={
            trend !== 0 && prevAvg > 0
              ? `${trend > 0 ? '+' : ''}${trend.toFixed(1)} vs prev week`
              : 'No previous data'
          }
          icon={
            trend > 0 ? <TrendingUp size={18} className="text-emerald-500" /> :
            trend < 0 ? <TrendingDown size={18} className="text-red-400" /> :
            <Minus size={18} className="text-slate-400" />
          }
          accent={trend > 0 ? 'emerald' : trend < 0 ? 'red' : 'slate'}
        />
        <StatCard
          label="Logging Streak"
          value={streak > 0 ? `${streak} day${streak === 1 ? '' : 's'}` : '—'}
          sub={streak > 0 ? 'Consecutive days' : 'Start logging!'}
          icon={<Flame size={18} className={streak >= 7 ? 'text-orange-500' : 'text-slate-400'} />}
          accent={streak >= 7 ? 'orange' : 'slate'}
        />
        <StatCard
          label="Total Entries"
          value={childLogs.length.toString()}
          sub={`Since ${childLogs.length ? format(parseISO(childLogs[childLogs.length - 1].date), 'MMM yyyy') : '—'}`}
          icon={<Calendar size={18} className="text-indigo-500" />}
          accent="indigo"
        />
        <StatCard
          label="This Month"
          value={childLogs.filter(l => l.date.startsWith(format(new Date(), 'yyyy-MM'))).length.toString()}
          sub="Days logged"
          icon={<CheckCircle2 size={18} className="text-violet-500" />}
          accent="violet"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 14-day trend */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-700 mb-4">14-Day Overall Trend</h3>
          {last7Days.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={last14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis domain={[1, 5]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip
                  formatter={(v: unknown) => [v ? `${v}/5` : 'No data', 'Avg Score']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="avg"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#6366f1' }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
              No data yet — start logging!
            </div>
          )}
        </div>

        {/* Radar chart */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-700 mb-1">Latest Behavior Profile</h3>
          <p className="text-xs text-slate-400 mb-3">
            {latestLog ? `Entry from ${format(parseISO(latestLog.date), 'MMM d, yyyy')}` : 'No entries yet'}
          </p>
          {latestLog ? (
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="behavior" tick={{ fontSize: 10, fill: '#64748b' }} />
                <Radar
                  name="Score"
                  dataKey="value"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.25}
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
              No data yet
            </div>
          )}
        </div>
      </div>

      {/* Recent entries */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-700 mb-4">Recent Entries</h3>
        {childLogs.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No entries recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {childLogs.slice(0, 5).map(log => {
              const keys = Object.keys(log.ratings) as (keyof typeof log.ratings)[];
              const avg = +(keys.reduce((s, k) => s + log.ratings[k], 0) / keys.length).toFixed(1);
              const cfg = DAY_RATING_CONFIG[log.overallDay];
              return (
                <div key={log.id} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition">
                  <div className="text-2xl">{cfg.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">
                      {format(parseISO(log.date), 'EEEE, MMM d')}
                    </p>
                    <p className="text-xs text-slate-400">
                      {log.positiveObservations.length > 0
                        ? log.positiveObservations[0]
                        : log.parentNotes || 'No notes'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-slate-700">{avg}/5</span>
                    <p className={`text-xs px-2 py-0.5 rounded-full border mt-1 ${cfg.color}`}>{cfg.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  accent: string;
}) {
  const accents: Record<string, string> = {
    emerald: 'bg-emerald-50 border-emerald-100',
    red: 'bg-red-50 border-red-100',
    slate: 'bg-slate-50 border-slate-100',
    indigo: 'bg-indigo-50 border-indigo-100',
    orange: 'bg-orange-50 border-orange-100',
    violet: 'bg-violet-50 border-violet-100',
  };
  return (
    <div className={`rounded-2xl p-4 border ${accents[accent] || accents.slate}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
    </div>
  );
}

function EmptyState({ onNavigate }: { onNavigate: (v: 'log' | 'profiles') => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 space-y-5">
      <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center">
        <AlertCircle size={32} className="text-indigo-500" />
      </div>
      <div className="text-center max-w-sm">
        <h3 className="text-xl font-bold text-slate-800">Get Started</h3>
        <p className="text-slate-500 text-sm mt-2">
          Add a child profile first, then start tracking their daily behaviors.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => onNavigate('profiles')}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition"
        >
          Add Child Profile
        </button>
      </div>
    </div>
  );
}
