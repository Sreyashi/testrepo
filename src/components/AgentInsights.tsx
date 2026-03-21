import { TrendingUp, TrendingDown, Minus, Brain, AlertTriangle, CheckCircle2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { AgentInsight } from '../types';

interface AgentInsightsProps {
  insight: AgentInsight;
}

export default function AgentInsights({ insight }: AgentInsightsProps) {
  const [expanded, setExpanded] = useState(true);

  if (insight.status === 'loading') {
    return (
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
            <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
          </div>
          <div>
            <p className="text-sm font-semibold text-indigo-800">AI Agents Running…</p>
            <p className="text-xs text-indigo-500 mt-0.5">Analyzing trends · Emailing therapist</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-2 bg-indigo-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-400 rounded-full animate-pulse w-3/4" />
          </div>
          <div className="h-2 bg-indigo-100 rounded-full overflow-hidden">
            <div className="h-full bg-purple-400 rounded-full animate-pulse w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (insight.status === 'error') {
    return (
      <div className="bg-red-50 rounded-2xl border border-red-100 p-5">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700">Analysis Unavailable</p>
            <p className="text-xs text-red-400 mt-0.5">{insight.error ?? 'Something went wrong'}</p>
          </div>
        </div>
      </div>
    );
  }

  const trendConfig = {
    improving: { icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Improving' },
    declining: { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-100', label: 'Declining' },
    stable: { icon: Minus, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Stable' },
  };

  const therapyConfig = {
    on_track: {
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      icon: CheckCircle2,
      iconColor: 'text-emerald-500',
      label: 'Therapy On Track',
    },
    review_recommended: {
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: AlertTriangle,
      iconColor: 'text-amber-500',
      label: 'Review Recommended',
    },
    change_recommended: {
      color: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: AlertTriangle,
      iconColor: 'text-red-500',
      label: 'Consider Changing Approach',
    },
  };

  const trend = trendConfig[insight.overallTrend];
  const TrendIcon = trend.icon;
  const therapy = therapyConfig[insight.therapyRecommendation];
  const TherapyIcon = therapy.icon;

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-white rounded-2xl border border-indigo-100 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-indigo-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-indigo-900">AI Behavioral Analysis</p>
            <p className="text-xs text-indigo-400">Based on today's log + history</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${trend.bg} ${trend.color}`}>
            <TrendIcon className="w-3.5 h-3.5" />
            {trend.label}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-indigo-400" /> : <ChevronDown className="w-4 h-4 text-indigo-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          {/* Comparison row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-slate-100 p-3">
              <p className="text-xs text-slate-400 font-medium mb-1.5">vs Yesterday</p>
              <p className="text-xs text-slate-700 leading-relaxed">{insight.vsYesterday}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 p-3">
              <p className="text-xs text-slate-400 font-medium mb-1.5">vs Last Week</p>
              <p className="text-xs text-slate-700 leading-relaxed">{insight.vsLastWeek}</p>
            </div>
          </div>

          {/* Therapy assessment */}
          <div className={`rounded-xl border p-4 ${therapy.bg} ${therapy.border}`}>
            <div className="flex items-center gap-2 mb-2">
              <TherapyIcon className={`w-4 h-4 ${therapy.iconColor}`} />
              <span className={`text-sm font-semibold ${therapy.color}`}>{therapy.label}</span>
            </div>
            <p className={`text-xs leading-relaxed ${therapy.color.replace('700', '600')}`}>
              {insight.therapyMessage}
            </p>
          </div>

          {/* Key observations */}
          {insight.keyObservations.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Key Observations</p>
              <ul className="space-y-1.5">
                {insight.keyObservations.map((obs, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                    <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                    {obs}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action items */}
          {insight.actionItems.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Suggested Actions</p>
              <ul className="space-y-1.5">
                {insight.actionItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                    <span className="mt-0.5 text-indigo-500 font-bold">{i + 1}.</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
