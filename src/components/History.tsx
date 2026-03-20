import { useState, useMemo } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Trash2, Edit3, Search } from 'lucide-react';
import type { Child, BehaviorLog } from '../types';
import { BEHAVIOR_LABELS, RATING_LABELS, DAY_RATING_CONFIG } from '../types';

interface HistoryProps {
  children: Child[];
  logs: BehaviorLog[];
  selectedChildId: string | null;
  setSelectedChildId: (id: string) => void;
  onDelete: (id: string) => void;
  onEditLog: (date: string) => void;
}

export default function History({
  children,
  logs,
  selectedChildId,
  setSelectedChildId,
  onDelete,
  onEditLog,
}: HistoryProps) {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [search, setSearch] = useState('');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedLog, setSelectedLog] = useState<BehaviorLog | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const childLogs = useMemo(
    () =>
      logs
        .filter(l => l.childId === selectedChildId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [logs, selectedChildId]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return childLogs;
    const q = search.toLowerCase();
    return childLogs.filter(
      l =>
        l.parentNotes.toLowerCase().includes(q) ||
        l.therapistNotes.toLowerCase().includes(q) ||
        l.positiveObservations.some(o => o.toLowerCase().includes(q)) ||
        l.challengingBehaviors.some(b => b.toLowerCase().includes(q))
    );
  }, [childLogs, search]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const start = startOfMonth(calendarDate);
    const end = endOfMonth(calendarDate);
    return eachDayOfInterval({ start, end });
  }, [calendarDate]);

  const logByDate = useMemo(() => {
    const map: Record<string, BehaviorLog> = {};
    childLogs.forEach(l => { map[l.date] = l; });
    return map;
  }, [childLogs]);

  const avgScore = (log: BehaviorLog) => {
    const keys = Object.keys(log.ratings) as (keyof typeof log.ratings)[];
    return +(keys.reduce((s, k) => s + log.ratings[k], 0) / keys.length).toFixed(1);
  };

  if (children.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-400">No profiles added yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">History</h2>
          <p className="text-slate-500 text-sm mt-1">{childLogs.length} entries recorded</p>
        </div>
        <div className="flex items-center gap-2">
          {children.length > 1 && (
            <select
              value={selectedChildId || ''}
              onChange={e => setSelectedChildId(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white shadow-sm"
            >
              {children.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <div className="flex rounded-xl border border-slate-200 overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-xs font-medium transition ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-2 text-xs font-medium transition ${viewMode === 'calendar' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              Calendar
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'list' ? (
        <>
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search entries..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              {search ? 'No entries match your search.' : 'No entries yet — start logging!'}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(log => {
                const cfg = DAY_RATING_CONFIG[log.overallDay];
                const avg = avgScore(log);
                return (
                  <div
                    key={log.id}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
                  >
                    <button
                      className="w-full text-left p-4 hover:bg-slate-50 transition"
                      onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{cfg.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-700 text-sm">
                              {format(parseISO(log.date), 'EEEE, MMMM d, yyyy')}
                            </p>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.color}`}>
                              {cfg.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-slate-500">Avg: {avg}/5</span>
                            {log.medicationTaken && (
                              <span className="text-xs text-violet-600">💊 Medication taken</span>
                            )}
                            {log.positiveObservations.length > 0 && (
                              <span className="text-xs text-emerald-600">
                                ✓ {log.positiveObservations.length} positive
                              </span>
                            )}
                            {log.challengingBehaviors.length > 0 && (
                              <span className="text-xs text-red-500">
                                ✗ {log.challengingBehaviors.length} challenging
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight
                          size={16}
                          className={`text-slate-300 transition-transform ${selectedLog?.id === log.id ? 'rotate-90' : ''}`}
                        />
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {selectedLog?.id === log.id && (
                      <div className="border-t border-slate-100 px-4 pb-4 pt-3 bg-slate-50/50">
                        {/* Ratings grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                          {(Object.entries(log.ratings) as [keyof typeof log.ratings, number][]).map(([k, v]) => (
                            <div key={k} className="bg-white rounded-xl p-2.5 border border-slate-100 text-center">
                              <p className="text-xs text-slate-500 leading-tight">{BEHAVIOR_LABELS[k].split(' ')[0]}</p>
                              <p
                                className="text-lg font-bold mt-0.5"
                                style={{ color: RATING_LABELS[v].color }}
                              >
                                {v}
                              </p>
                              <p className="text-xs" style={{ color: RATING_LABELS[v].color }}>
                                {RATING_LABELS[v].label.split(' ')[0]}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Observations */}
                        {log.positiveObservations.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Positive</p>
                            <div className="flex flex-wrap gap-1.5">
                              {log.positiveObservations.map(o => (
                                <span key={o} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                  {o}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {log.challengingBehaviors.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Challenging</p>
                            <div className="flex flex-wrap gap-1.5">
                              {log.challengingBehaviors.map(b => (
                                <span key={b} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                  {b}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {log.triggerEvents.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Triggers</p>
                            <div className="flex flex-wrap gap-1.5">
                              {log.triggerEvents.map(t => (
                                <span key={t} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                  ⚡ {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        {log.parentNotes && (
                          <div className="mb-2 bg-white rounded-xl p-3 border border-slate-100">
                            <p className="text-xs font-semibold text-slate-500 mb-1">Parent Notes</p>
                            <p className="text-sm text-slate-700">{log.parentNotes}</p>
                          </div>
                        )}
                        {log.therapistNotes && (
                          <div className="mb-2 bg-white rounded-xl p-3 border border-slate-100">
                            <p className="text-xs font-semibold text-slate-500 mb-1">Notes for Therapist</p>
                            <p className="text-sm text-slate-700">{log.therapistNotes}</p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => onEditLog(log.date)}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl font-medium hover:bg-indigo-100 transition"
                          >
                            <Edit3 size={14} /> Edit
                          </button>
                          {confirmDelete === log.id ? (
                            <>
                              <button
                                onClick={() => { onDelete(log.id); setConfirmDelete(null); }}
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition"
                              >
                                Confirm Delete
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(log.id)}
                              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Calendar view */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => setCalendarDate(d => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n; })}
              className="p-2 rounded-xl hover:bg-slate-100 transition"
            >
              <ChevronLeft size={18} className="text-slate-500" />
            </button>
            <h3 className="font-semibold text-slate-700">
              {format(calendarDate, 'MMMM yyyy')}
            </h3>
            <button
              onClick={() => setCalendarDate(d => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; })}
              className="p-2 rounded-xl hover:bg-slate-100 transition"
            >
              <ChevronRight size={18} className="text-slate-500" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
            ))}
          </div>

          {/* Fill leading empty cells */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: calendarDays[0].getDay() }, (_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {calendarDays.map(day => {
              const ds = format(day, 'yyyy-MM-dd');
              const log = logByDate[ds];
              const inMonth = isSameMonth(day, calendarDate);
              const cfg = log ? DAY_RATING_CONFIG[log.overallDay] : null;

              return (
                <button
                  key={ds}
                  onClick={() => log && setSelectedLog(selectedLog?.id === log.id ? null : log)}
                  className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs transition ${
                    !inMonth ? 'opacity-30' : ''
                  } ${
                    log
                      ? 'hover:ring-2 hover:ring-indigo-300 cursor-pointer'
                      : 'cursor-default'
                  } ${
                    selectedLog?.date === ds ? 'ring-2 ring-indigo-500' : ''
                  }`}
                  style={log ? { backgroundColor: cfg?.color.match(/bg-(\w+)-/)?.[0].replace('bg-', '#') || '#f0fdf4' } : {}}
                >
                  {cfg && <span className="text-base leading-none">{cfg.emoji}</span>}
                  <span className={`font-medium ${log ? 'text-slate-700' : 'text-slate-400'}`}>
                    {day.getDate()}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected log detail */}
          {selectedLog && selectedLog.childId === selectedChildId && (
            <div className="mt-5 pt-4 border-t border-slate-100">
              <h4 className="font-semibold text-slate-700 text-sm mb-3">
                {format(parseISO(selectedLog.date), 'EEEE, MMMM d')} — {DAY_RATING_CONFIG[selectedLog.overallDay].emoji} {DAY_RATING_CONFIG[selectedLog.overallDay].label}
              </h4>
              <div className="grid grid-cols-4 gap-2">
                {(Object.entries(selectedLog.ratings) as [keyof typeof selectedLog.ratings, number][]).map(([k, v]) => (
                  <div key={k} className="text-center bg-slate-50 rounded-xl p-2">
                    <p className="text-xs text-slate-500 leading-tight">{BEHAVIOR_LABELS[k].split(' ')[0]}</p>
                    <p className="font-bold text-lg" style={{ color: RATING_LABELS[v].color }}>{v}</p>
                  </div>
                ))}
              </div>
              {selectedLog.parentNotes && (
                <p className="text-sm text-slate-600 mt-3 bg-slate-50 rounded-xl p-3">
                  {selectedLog.parentNotes}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
