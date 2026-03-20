import { useState, useMemo } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import { FileText, Download, Copy, Check, Mail, Printer } from 'lucide-react';
import type { Child, BehaviorLog } from '../types';
import { BEHAVIOR_LABELS, RATING_LABELS, DAY_RATING_CONFIG } from '../types';

interface ReportsProps {
  children: Child[];
  logs: BehaviorLog[];
  selectedChildId: string | null;
  setSelectedChildId: (id: string) => void;
}

const REPORT_PERIODS = [
  { label: 'Last 7 Days', value: 7 },
  { label: 'Last 14 Days', value: 14 },
  { label: 'Last 30 Days', value: 30 },
  { label: 'Last 60 Days', value: 60 },
];

export default function Reports({
  children,
  logs,
  selectedChildId,
  setSelectedChildId,
}: ReportsProps) {
  const [period, setPeriod] = useState(14);
  const [copied, setCopied] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeActivities, setIncludeActivities] = useState(true);
  const [includeTriggers, setIncludeTriggers] = useState(true);

  const child = children.find(c => c.id === selectedChildId);

  const periodLogs = useMemo(() => {
    const cutoff = format(subDays(new Date(), period), 'yyyy-MM-dd');
    return logs
      .filter(l => l.childId === selectedChildId && l.date >= cutoff)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [logs, selectedChildId, period]);

  const avgRatings = useMemo(() => {
    if (!periodLogs.length) return null;
    const sums: Record<string, number> = {};
    periodLogs.forEach(l => {
      Object.entries(l.ratings).forEach(([k, v]) => {
        sums[k] = (sums[k] || 0) + v;
      });
    });
    return Object.fromEntries(
      Object.entries(sums).map(([k, v]) => [k, +(v / periodLogs.length).toFixed(1)])
    );
  }, [periodLogs]);

  const overallAvg = avgRatings
    ? +(Object.values(avgRatings).reduce((s, v) => s + v, 0) / Object.values(avgRatings).length).toFixed(1)
    : 0;

  const dayBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    periodLogs.forEach(l => { counts[l.overallDay] = (counts[l.overallDay] || 0) + 1; });
    return counts;
  }, [periodLogs]);

  const topPositive = useMemo(() => {
    const counts: Record<string, number> = {};
    periodLogs.forEach(l => l.positiveObservations.forEach(o => { counts[o] = (counts[o] || 0) + 1; }));
    return Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 5);
  }, [periodLogs]);

  const topChallenging = useMemo(() => {
    const counts: Record<string, number> = {};
    periodLogs.forEach(l => l.challengingBehaviors.forEach(b => { counts[b] = (counts[b] || 0) + 1; }));
    return Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 5);
  }, [periodLogs]);

  const topTriggers = useMemo(() => {
    const counts: Record<string, number> = {};
    periodLogs.forEach(l => l.triggerEvents.forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    return Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 5);
  }, [periodLogs]);

  const therapistNotesList = useMemo(
    () => periodLogs.filter(l => l.therapistNotes.trim()).map(l => ({ date: l.date, note: l.therapistNotes })),
    [periodLogs]
  );

  const generateReportText = () => {
    if (!child || !periodLogs.length || !avgRatings) return '';

    const lines: string[] = [
      `ADHD BEHAVIORAL PROGRESS REPORT`,
      `${'='.repeat(50)}`,
      ``,
      `Child: ${child.name}`,
      `Date of Birth: ${format(parseISO(child.dateOfBirth), 'MMMM d, yyyy')}`,
      child.diagnosisDate ? `Diagnosis Date: ${format(parseISO(child.diagnosisDate), 'MMMM d, yyyy')}` : '',
      child.medications.length ? `Current Medications: ${child.medications.join(', ')}` : '',
      ``,
      `Report Period: Last ${period} days (${format(subDays(new Date(), period), 'MMM d')} – ${format(new Date(), 'MMM d, yyyy')})`,
      `Total Entries: ${periodLogs.length} days tracked`,
      `Prepared by Parent: ${format(new Date(), 'MMMM d, yyyy')}`,
      ``,
      `BEHAVIOR RATINGS SUMMARY`,
      `${'-'.repeat(40)}`,
      `Overall Average Score: ${overallAvg}/5`,
      ``,
      ...Object.entries(avgRatings).map(([k, v]) =>
        `${BEHAVIOR_LABELS[k as keyof typeof BEHAVIOR_LABELS].padEnd(30)} ${v}/5  ${RATING_LABELS[Math.round(v)].label}`
      ),
      ``,
      `DAY QUALITY DISTRIBUTION`,
      `${'-'.repeat(40)}`,
      ...Object.entries(DAY_RATING_CONFIG).map(([key, cfg]) =>
        dayBreakdown[key] ? `${cfg.label.padEnd(25)} ${dayBreakdown[key]} day(s)` : ''
      ).filter(Boolean),
      ``,
    ];

    if (topPositive.length > 0) {
      lines.push(`MOST FREQUENT POSITIVE BEHAVIORS`, `${'-'.repeat(40)}`);
      topPositive.forEach(([obs, count]) => lines.push(`• ${obs} (${count}x)`));
      lines.push('');
    }

    if (topChallenging.length > 0) {
      lines.push(`MOST FREQUENT CHALLENGING BEHAVIORS`, `${'-'.repeat(40)}`);
      topChallenging.forEach(([beh, count]) => lines.push(`• ${beh} (${count}x)`));
      lines.push('');
    }

    if (includeTriggers && topTriggers.length > 0) {
      lines.push(`IDENTIFIED TRIGGERS`, `${'-'.repeat(40)}`);
      topTriggers.forEach(([t, count]) => lines.push(`• ${t} (${count}x)`));
      lines.push('');
    }

    if (includeNotes && therapistNotesList.length > 0) {
      lines.push(`PARENT NOTES FOR THERAPIST`, `${'-'.repeat(40)}`);
      therapistNotesList.forEach(({ date, note }) => {
        lines.push(`[${format(parseISO(date), 'MMM d')}] ${note}`);
      });
      lines.push('');
    }

    if (includeActivities) {
      const actCounts: Record<string, number> = {};
      periodLogs.forEach(l => l.activities.forEach(a => { actCounts[a] = (actCounts[a] || 0) + 1; }));
      const topActivities = Object.entries(actCounts).sort(([, a], [, b]) => b - a).slice(0, 5);
      if (topActivities.length > 0) {
        lines.push(`FREQUENT ACTIVITIES`, `${'-'.repeat(40)}`);
        topActivities.forEach(([act, count]) => lines.push(`• ${act} (${count}x)`));
        lines.push('');
      }
    }

    lines.push(`${'-'.repeat(50)}`);
    lines.push(`Generated by ADHD Behavioral Tracker`);
    lines.push(`Report Date: ${format(new Date(), 'MMMM d, yyyy')}`);

    return lines.filter(l => l !== null).join('\n');
  };

  const reportText = generateReportText();

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `adhd-report-${child?.name.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>ADHD Report - ${child?.name}</title>
          <style>
            body { font-family: monospace; font-size: 12px; padding: 20px; line-height: 1.6; color: #1e293b; }
            pre { white-space: pre-wrap; }
          </style>
        </head>
        <body><pre>${reportText}</pre></body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleEmail = () => {
    const subject = `ADHD Progress Report - ${child?.name} - ${format(new Date(), 'MMM d, yyyy')}`;
    const mailto = child?.therapistEmail
      ? `mailto:${child.therapistEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(reportText)}`
      : `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(reportText)}`;
    window.location.href = mailto;
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
          <h2 className="text-2xl font-bold text-slate-800">Reports</h2>
          <p className="text-slate-500 text-sm mt-1">Generate & share progress reports with your therapist</p>
        </div>
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
      </div>

      {/* Report config */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <h3 className="font-semibold text-slate-700 mb-4">Report Settings</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-slate-500 font-medium mb-2">Time Period</p>
            <div className="flex flex-wrap gap-2">
              {REPORT_PERIODS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs border font-medium transition ${
                    period === p.value
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-500 font-medium mb-2">Include Sections</p>
            <div className="space-y-2">
              {[
                { label: 'Parent & Therapist Notes', state: includeNotes, set: setIncludeNotes },
                { label: 'Activities', state: includeActivities, set: setIncludeActivities },
                { label: 'Trigger Events', state: includeTriggers, set: setIncludeTriggers },
              ].map(opt => (
                <label key={opt.label} className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => opt.set(!opt.state)}
                    className={`w-9 h-5 rounded-full relative transition-colors ${opt.state ? 'bg-indigo-600' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${opt.state ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-xs text-slate-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Therapist info */}
      {child?.therapistName && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center gap-3">
          <Mail size={18} className="text-indigo-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-indigo-800">{child.therapistName}</p>
            {child.therapistEmail && (
              <p className="text-xs text-indigo-500">{child.therapistEmail}</p>
            )}
          </div>
        </div>
      )}

      {/* Summary cards */}
      {periodLogs.length > 0 && avgRatings && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 text-center shadow-sm">
            <p className="text-3xl font-bold text-indigo-600">{periodLogs.length}</p>
            <p className="text-xs text-slate-500 mt-1">Days tracked</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 text-center shadow-sm">
            <p className="text-3xl font-bold text-emerald-600">{overallAvg}/5</p>
            <p className="text-xs text-slate-500 mt-1">Average score</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 text-center shadow-sm">
            <p className="text-3xl font-bold text-violet-600">
              {periodLogs.filter(l => l.medicationTaken).length}
            </p>
            <p className="text-xs text-slate-500 mt-1">Medication days</p>
          </div>
        </div>
      )}

      {/* Report preview */}
      {periodLogs.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-slate-100 text-center text-slate-400 text-sm">
          No data in selected period. Try expanding the time range.
        </div>
      ) : (
        <>
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition"
            >
              {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy Text'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition"
            >
              <Download size={16} /> Download .txt
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition"
            >
              <Printer size={16} /> Print
            </button>
            <button
              onClick={handleEmail}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
            >
              <Mail size={16} />
              {child?.therapistEmail ? 'Email Therapist' : 'Send via Email'}
            </button>
          </div>

          {/* Report preview box */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50">
              <FileText size={16} className="text-slate-400" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Report Preview</span>
            </div>
            <pre className="p-5 text-xs text-slate-700 font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto">
              {reportText}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}
