import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import {
  Save,
  ChevronDown,
  ChevronUp,
  Pill,
  Moon,
  Activity,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Star,
} from 'lucide-react';
import type { Child, BehaviorLog, BehaviorRating, AgentInsight } from '../types';
import {
  POSITIVE_OBSERVATIONS,
  CHALLENGING_BEHAVIORS,
  ACTIVITIES,
  TRIGGER_EVENTS,
  BEHAVIOR_LABELS,
  BEHAVIOR_DESCRIPTIONS,
  RATING_LABELS,
  DAY_RATING_CONFIG,
} from '../types';
import AgentInsights from './AgentInsights';

interface LogEntryProps {
  children: Child[];
  logs: BehaviorLog[];
  selectedChildId: string | null;
  setSelectedChildId: (id: string) => void;
  onSave: (log: BehaviorLog) => void;
  onUpdate: (id: string, updates: Partial<BehaviorLog>) => void;
  onNavigate: (view: 'profiles') => void;
  parentEmail?: string;
}

const DEFAULT_RATINGS: BehaviorRating = {
  attention: 3,
  hyperactivity: 3,
  impulsivity: 3,
  emotionRegulation: 3,
  socialInteraction: 3,
  sleepQuality: 3,
  taskCompletion: 3,
  moodOverall: 3,
};

type Section = 'ratings' | 'observations' | 'medication' | 'sleep' | 'activities' | 'notes';

export default function LogEntry({
  children,
  logs,
  selectedChildId,
  setSelectedChildId,
  onSave,
  onUpdate,
  onNavigate,
  parentEmail,
}: LogEntryProps) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [openSections, setOpenSections] = useState<Section[]>(['ratings', 'observations']);

  const existingLog = logs.find(
    l => l.childId === selectedChildId && l.date === date
  );

  const [ratings, setRatings] = useState<BehaviorRating>(
    existingLog?.ratings ?? DEFAULT_RATINGS
  );
  const [overallDay, setOverallDay] = useState<BehaviorLog['overallDay']>(
    existingLog?.overallDay ?? 'good'
  );
  const [positiveObs, setPositiveObs] = useState<string[]>(
    existingLog?.positiveObservations ?? []
  );
  const [challengingBeh, setChallengingBeh] = useState<string[]>(
    existingLog?.challengingBehaviors ?? []
  );
  const [medicationTaken, setMedicationTaken] = useState(existingLog?.medicationTaken ?? true);
  const [medicationTime, setMedicationTime] = useState(existingLog?.medicationTime ?? '08:00');
  const [medicationNotes, setMedicationNotes] = useState(existingLog?.medicationNotes ?? '');
  const [sleepHours, setSleepHours] = useState<number>(existingLog?.sleepHours ?? 8);
  const [sleepTime, setSleepTime] = useState(existingLog?.sleepTime ?? '21:00');
  const [wakeTime, setWakeTime] = useState(existingLog?.wakeTime ?? '07:00');
  const [activities, setActivities] = useState<string[]>(existingLog?.activities ?? []);
  const [triggerEvents, setTriggerEvents] = useState<string[]>(existingLog?.triggerEvents ?? []);
  const [parentNotes, setParentNotes] = useState(existingLog?.parentNotes ?? '');
  const [therapistNotes, setTherapistNotes] = useState(existingLog?.therapistNotes ?? '');
  const [environment, setEnvironment] = useState<BehaviorLog['environment']>(
    existingLog?.environment ?? 'home'
  );
  const [saved, setSaved] = useState(false);
  const [agentInsight, setAgentInsight] = useState<AgentInsight | null>(null);

  // Reset form when date or child changes
  useEffect(() => {
    const log = logs.find(l => l.childId === selectedChildId && l.date === date);
    setRatings(log?.ratings ?? DEFAULT_RATINGS);
    setOverallDay(log?.overallDay ?? 'good');
    setPositiveObs(log?.positiveObservations ?? []);
    setChallengingBeh(log?.challengingBehaviors ?? []);
    setMedicationTaken(log?.medicationTaken ?? true);
    setMedicationTime(log?.medicationTime ?? '08:00');
    setMedicationNotes(log?.medicationNotes ?? '');
    setSleepHours(log?.sleepHours ?? 8);
    setSleepTime(log?.sleepTime ?? '21:00');
    setWakeTime(log?.wakeTime ?? '07:00');
    setActivities(log?.activities ?? []);
    setTriggerEvents(log?.triggerEvents ?? []);
    setParentNotes(log?.parentNotes ?? '');
    setTherapistNotes(log?.therapistNotes ?? '');
    setEnvironment(log?.environment ?? 'home');
    setSaved(false);
  }, [date, selectedChildId, logs]);

  const toggleSection = (s: Section) =>
    setOpenSections(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );

  const toggleArray = (arr: string[], item: string): string[] =>
    arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];

  const handleSave = () => {
    if (!selectedChildId) return;

    const logData: BehaviorLog = {
      id: existingLog?.id ?? uuidv4(),
      childId: selectedChildId,
      date,
      ratings,
      positiveObservations: positiveObs,
      challengingBehaviors: challengingBeh,
      medicationTaken,
      medicationTime: medicationTaken ? medicationTime : undefined,
      medicationNotes: medicationNotes || undefined,
      sleepHours,
      sleepTime,
      wakeTime,
      activities,
      parentNotes,
      therapistNotes,
      triggerEvents,
      environment,
      overallDay,
      createdAt: existingLog?.createdAt ?? new Date().toISOString(),
    };

    if (existingLog) {
      onUpdate(existingLog.id, logData);
    } else {
      onSave(logData);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);

    // Fire Agent 2 (email therapist) + Agent 3 (analysis) in parallel
    const childProfile = children.find(c => c.id === selectedChildId);
    if (childProfile) {
      runAgents(logData, childProfile);
    }
  };

  const runAgents = async (logData: BehaviorLog, childProfile: Child) => {
    // Collect historical logs (sorted newest first, exclude today)
    const allChildLogs = logs
      .filter(l => l.childId === childProfile.id && l.date !== logData.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const previousDay = allChildLogs[0] ?? undefined;
    const previousWeekLogs = allChildLogs.slice(0, 14); // up to 14 days
    const recentLogsForEmail = allChildLogs.slice(0, 7);

    // Show loading state for Agent 3
    setAgentInsight({ status: 'loading' } as AgentInsight);

    // Agent 2: Email therapist (fire and forget — no need to await for UX)
    if (childProfile.therapistEmail) {
      fetch('/api/send-therapist-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childName: childProfile.name,
          therapistName: childProfile.therapistName ?? 'Therapist',
          therapistEmail: childProfile.therapistEmail,
          parentEmail: parentEmail ?? '',
          currentLog: logData,
          recentLogs: recentLogsForEmail,
        }),
      }).catch(err => console.warn('[Agent 2] Email send failed:', err));
    }

    // Agent 3: Progress analysis with Claude (await for UI update)
    try {
      const res = await fetch('/api/analyze-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childName: childProfile.name,
          currentLog: logData,
          previousDay,
          previousWeekLogs,
          therapistName: childProfile.therapistName,
          medications: childProfile.medications,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      setAgentInsight({ status: 'done', ...result });

      // Agent 1: Update last log date for reminder system
      if (childProfile.reminderEnabled && childProfile.reminderEmail) {
        fetch('/api/subscribe-reminder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_log_date',
            email: childProfile.reminderEmail,
            childName: childProfile.name,
            lastLogDate: logData.date,
          }),
        }).catch(() => {});
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      setAgentInsight({ status: 'error', error: message } as AgentInsight);
    }
  };

  if (children.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-slate-500">No child profiles yet.</p>
        <button
          onClick={() => onNavigate('profiles')}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm"
        >
          Create Profile
        </button>
      </div>
    );
  }

  const child = children.find(c => c.id === selectedChildId);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Daily Log</h2>
          <p className="text-slate-500 text-sm mt-1">Record behavioral observations</p>
        </div>
        <div className="flex items-center gap-3">
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
          <input
            type="date"
            value={date}
            max={format(new Date(), 'yyyy-MM-dd')}
            onChange={e => setDate(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white shadow-sm"
          />
        </div>
      </div>

      {existingLog && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
          <AlertTriangle size={16} />
          Editing existing entry for this date. Changes will be saved over the previous entry.
        </div>
      )}

      {/* Overall Day Rating */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Star size={18} className="text-amber-400" /> How was {child?.name}'s day overall?
        </h3>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(DAY_RATING_CONFIG) as [BehaviorLog['overallDay'], typeof DAY_RATING_CONFIG[keyof typeof DAY_RATING_CONFIG]][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setOverallDay(key)}
              className={`px-4 py-2 rounded-xl border text-sm font-medium transition ${
                overallDay === key ? cfg.color + ' ring-2 ring-offset-1 ring-current' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cfg.emoji} {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section: Behavior Ratings */}
      <CollapsibleSection
        id="ratings"
        label="Behavior Ratings"
        open={openSections.includes('ratings')}
        toggle={() => toggleSection('ratings')}
        icon={<Activity size={18} className="text-indigo-500" />}
      >
        <div className="space-y-5">
          {(Object.keys(ratings) as (keyof BehaviorRating)[]).map(key => (
            <div key={key}>
              <div className="flex justify-between items-start mb-1.5">
                <div>
                  <p className="text-sm font-medium text-slate-700">{BEHAVIOR_LABELS[key]}</p>
                  <p className="text-xs text-slate-400">{BEHAVIOR_DESCRIPTIONS[key]}</p>
                </div>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: RATING_LABELS[ratings[key]].color + '20',
                    color: RATING_LABELS[ratings[key]].color,
                  }}
                >
                  {RATING_LABELS[ratings[key]].label}
                </span>
              </div>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4, 5].map(v => (
                  <button
                    key={v}
                    onClick={() => setRatings(prev => ({ ...prev, [key]: v }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
                      ratings[key] === v
                        ? 'text-white shadow'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                    style={
                      ratings[key] === v
                        ? { backgroundColor: RATING_LABELS[v].color }
                        : {}
                    }
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Section: Observations */}
      <CollapsibleSection
        id="observations"
        label="Observations"
        open={openSections.includes('observations')}
        toggle={() => toggleSection('observations')}
        icon={<CheckCircle2 size={18} className="text-emerald-500" />}
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Positive Behaviors</p>
            <div className="flex flex-wrap gap-2">
              {POSITIVE_OBSERVATIONS.map(obs => (
                <button
                  key={obs}
                  onClick={() => setPositiveObs(prev => toggleArray(prev, obs))}
                  className={`text-xs px-3 py-1.5 rounded-full border transition ${
                    positiveObs.includes(obs)
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-700 font-medium'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {positiveObs.includes(obs) && '✓ '}{obs}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Challenging Behaviors</p>
            <div className="flex flex-wrap gap-2">
              {CHALLENGING_BEHAVIORS.map(beh => (
                <button
                  key={beh}
                  onClick={() => setChallengingBeh(prev => toggleArray(prev, beh))}
                  className={`text-xs px-3 py-1.5 rounded-full border transition ${
                    challengingBeh.includes(beh)
                      ? 'bg-red-100 border-red-300 text-red-700 font-medium'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {challengingBeh.includes(beh) && '✗ '}{beh}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Trigger Events</p>
            <div className="flex flex-wrap gap-2">
              {TRIGGER_EVENTS.map(t => (
                <button
                  key={t}
                  onClick={() => setTriggerEvents(prev => toggleArray(prev, t))}
                  className={`text-xs px-3 py-1.5 rounded-full border transition ${
                    triggerEvents.includes(t)
                      ? 'bg-amber-100 border-amber-300 text-amber-700 font-medium'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {triggerEvents.includes(t) && '⚡ '}{t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Environment</p>
            <div className="flex gap-2 flex-wrap">
              {(['home', 'school', 'both', 'other'] as const).map(env => (
                <button
                  key={env}
                  onClick={() => setEnvironment(env)}
                  className={`px-3 py-1.5 rounded-xl text-xs border font-medium capitalize transition ${
                    environment === env
                      ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {env}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Section: Medication */}
      <CollapsibleSection
        id="medication"
        label="Medication"
        open={openSections.includes('medication')}
        toggle={() => toggleSection('medication')}
        icon={<Pill size={18} className="text-violet-500" />}
      >
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setMedicationTaken(!medicationTaken)}
              className={`w-12 h-6 rounded-full relative transition-colors ${
                medicationTaken ? 'bg-indigo-600' : 'bg-slate-200'
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  medicationTaken ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </div>
            <span className="text-sm font-medium text-slate-700">
              {medicationTaken ? 'Medication taken today' : 'No medication today'}
            </span>
          </label>

          {medicationTaken && (
            <>
              {child?.medications && child.medications.length > 0 && (
                <p className="text-xs text-slate-500">
                  Medications: {child.medications.join(', ')}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 font-medium block mb-1">Time taken</label>
                  <input
                    type="time"
                    value={medicationTime}
                    onChange={e => setMedicationTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium block mb-1">Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. with food"
                    value={medicationNotes}
                    onChange={e => setMedicationNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </CollapsibleSection>

      {/* Section: Sleep */}
      <CollapsibleSection
        id="sleep"
        label="Sleep"
        open={openSections.includes('sleep')}
        toggle={() => toggleSection('sleep')}
        icon={<Moon size={18} className="text-blue-500" />}
      >
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">Bedtime</label>
            <input
              type="time"
              value={sleepTime}
              onChange={e => setSleepTime(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">Wake time</label>
            <input
              type="time"
              value={wakeTime}
              onChange={e => setWakeTime(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">Total hours</label>
            <input
              type="number"
              min="1"
              max="14"
              step="0.5"
              value={sleepHours}
              onChange={e => setSleepHours(parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Section: Activities */}
      <CollapsibleSection
        id="activities"
        label="Activities"
        open={openSections.includes('activities')}
        toggle={() => toggleSection('activities')}
        icon={<Activity size={18} className="text-teal-500" />}
      >
        <div className="flex flex-wrap gap-2">
          {ACTIVITIES.map(act => (
            <button
              key={act}
              onClick={() => setActivities(prev => toggleArray(prev, act))}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                activities.includes(act)
                  ? 'bg-teal-100 border-teal-300 text-teal-700 font-medium'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {activities.includes(act) && '✓ '}{act}
            </button>
          ))}
        </div>
      </CollapsibleSection>

      {/* Section: Notes */}
      <CollapsibleSection
        id="notes"
        label="Notes"
        open={openSections.includes('notes')}
        toggle={() => toggleSection('notes')}
        icon={<MessageSquare size={18} className="text-slate-500" />}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">Parent's Notes</label>
            <textarea
              value={parentNotes}
              onChange={e => setParentNotes(e.target.value)}
              placeholder="Describe what happened today, any notable moments..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">Notes for Therapist</label>
            <textarea
              value={therapistNotes}
              onChange={e => setTherapistNotes(e.target.value)}
              placeholder="Specific observations you want to share with the therapist..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={!selectedChildId}
        className={`w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition ${
          saved
            ? 'bg-emerald-500 text-white'
            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200'
        }`}
      >
        {saved ? (
          <><CheckCircle2 size={18} /> Saved Successfully!</>
        ) : (
          <><Save size={18} /> {existingLog ? 'Update Entry' : 'Save Entry'}</>
        )}
      </button>

      {/* Agent 3: AI Insights (shown after save) */}
      {agentInsight && <AgentInsights insight={agentInsight} />}

      {/* Agent 2: Email status indicator */}
      {saved && child?.therapistEmail && (
        <div className="flex items-center gap-2 justify-center text-xs text-emerald-600">
          <CheckCircle2 size={14} />
          <span>Report sent to {child.therapistName ?? 'therapist'}</span>
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({
  label,
  open,
  toggle,
  icon,
  children,
}: {
  id?: string;
  label: string;
  open: boolean;
  toggle: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-slate-700 text-sm">{label}</span>
        </div>
        {open ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-slate-50">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  );
}
