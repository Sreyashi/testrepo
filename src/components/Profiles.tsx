import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO, differenceInYears } from 'date-fns';
import {
  Plus,
  Edit3,
  Trash2,
  User,
  Save,
  X,
  Pill,
  UserPlus,
  CheckCircle2,
} from 'lucide-react';
import type { Child } from '../types';

interface ProfilesProps {
  children: Child[];
  logs: { childId: string }[];
  onAdd: (child: Child) => void;
  onUpdate: (id: string, updates: Partial<Child>) => void;
  onDelete: (id: string) => void;
  selectedChildId: string | null;
  setSelectedChildId: (id: string) => void;
  onSeedDemo: () => void;
}

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-600',
  'bg-emerald-100 text-emerald-600',
  'bg-amber-100 text-amber-600',
  'bg-violet-100 text-violet-600',
  'bg-rose-100 text-rose-600',
  'bg-cyan-100 text-cyan-600',
];

type FormData = {
  name: string;
  dateOfBirth: string;
  diagnosisDate: string;
  medications: string;
  therapistName: string;
  therapistEmail: string;
  notes: string;
};

const EMPTY_FORM: FormData = {
  name: '',
  dateOfBirth: '',
  diagnosisDate: '',
  medications: '',
  therapistName: '',
  therapistEmail: '',
  notes: '',
};

export default function Profiles({
  children,
  logs,
  onAdd,
  onUpdate,
  onDelete,
  selectedChildId,
  setSelectedChildId,
  onSeedDemo,
}: ProfilesProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const startAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setErrors({});
    setShowForm(true);
  };

  const startEdit = (child: Child) => {
    setForm({
      name: child.name,
      dateOfBirth: child.dateOfBirth,
      diagnosisDate: child.diagnosisDate || '',
      medications: child.medications.join(', '),
      therapistName: child.therapistName || '',
      therapistEmail: child.therapistEmail || '',
      notes: child.notes || '',
    });
    setEditingId(child.id);
    setErrors({});
    setShowForm(true);
  };

  const validate = (): boolean => {
    const newErrors: Partial<FormData> = {};
    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (!form.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const medications = form.medications
      .split(',')
      .map(m => m.trim())
      .filter(Boolean);

    if (editingId) {
      onUpdate(editingId, {
        name: form.name.trim(),
        dateOfBirth: form.dateOfBirth,
        diagnosisDate: form.diagnosisDate || undefined,
        medications,
        therapistName: form.therapistName.trim() || undefined,
        therapistEmail: form.therapistEmail.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
    } else {
      const newChild: Child = {
        id: uuidv4(),
        name: form.name.trim(),
        dateOfBirth: form.dateOfBirth,
        diagnosisDate: form.diagnosisDate || undefined,
        medications,
        therapistName: form.therapistName.trim() || undefined,
        therapistEmail: form.therapistEmail.trim() || undefined,
        notes: form.notes.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      onAdd(newChild);
      setSelectedChildId(newChild.id);
    }

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setShowForm(false);
      setEditingId(null);
    }, 1200);
  };

  const colorForIndex = (i: number) => AVATAR_COLORS[i % AVATAR_COLORS.length];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Profiles</h2>
          <p className="text-slate-500 text-sm mt-1">Manage your children's profiles</p>
        </div>
        <button
          onClick={startAdd}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-sm"
        >
          <Plus size={16} /> Add Child
        </button>
      </div>

      {/* Empty state */}
      {children.length === 0 && !showForm && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center space-y-4">
          <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto">
            <UserPlus size={28} className="text-indigo-500" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-700">No profiles yet</h3>
            <p className="text-sm text-slate-400 mt-1">
              Add your child's profile to start tracking their progress.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={startAdd}
              className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition"
            >
              Add Profile
            </button>
            <button
              onClick={onSeedDemo}
              className="bg-slate-100 text-slate-700 px-5 py-2 rounded-xl font-semibold text-sm hover:bg-slate-200 transition"
            >
              Load Demo Data
            </button>
          </div>
        </div>
      )}

      {/* Profile cards */}
      <div className="space-y-4">
        {children.map((child, i) => {
          const age = differenceInYears(new Date(), parseISO(child.dateOfBirth));
          const logCount = logs.filter(l => l.childId === child.id).length;
          const isSelected = child.id === selectedChildId;

          return (
            <div
              key={child.id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition ${
                isSelected ? 'border-indigo-300 ring-2 ring-indigo-200' : 'border-slate-100'
              }`}
            >
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold flex-shrink-0 ${colorForIndex(i)}`}>
                    {child.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-800">{child.name}</h3>
                      {isSelected && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Age {age} · Born {format(parseISO(child.dateOfBirth), 'MMM d, yyyy')}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                      <span>📋 {logCount} entries</span>
                      {child.therapistName && <span>👩‍⚕️ {child.therapistName}</span>}
                      {child.medications.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Pill size={12} /> {child.medications[0]}{child.medications.length > 1 ? ` +${child.medications.length - 1}` : ''}
                        </span>
                      )}
                    </div>
                    {child.notes && (
                      <p className="text-xs text-slate-400 mt-2 italic line-clamp-2">{child.notes}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 flex-shrink-0">
                    {!isSelected && (
                      <button
                        onClick={() => setSelectedChildId(child.id)}
                        className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl font-medium hover:bg-indigo-100 transition"
                      >
                        Select
                      </button>
                    )}
                    <button
                      onClick={() => startEdit(child)}
                      className="p-2 rounded-xl hover:bg-slate-100 transition text-slate-400"
                    >
                      <Edit3 size={15} />
                    </button>
                    {confirmDelete === child.id ? (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => { onDelete(child.id); setConfirmDelete(null); }}
                          className="text-xs px-2 py-1.5 bg-red-600 text-white rounded-xl font-medium"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(child.id)}
                        className="p-2 rounded-xl hover:bg-red-50 transition text-slate-300 hover:text-red-400"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <User size={18} className="text-indigo-500" />
              <span className="font-semibold text-slate-700">
                {editingId ? 'Edit Profile' : 'New Profile'}
              </span>
            </div>
            <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
              <X size={16} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Child's Name *"
                error={errors.name}
              >
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Alex Johnson"
                  className={`form-input ${errors.name ? 'border-red-300' : ''}`}
                />
              </FormField>

              <FormField label="Date of Birth *" error={errors.dateOfBirth}>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))}
                  className={`form-input ${errors.dateOfBirth ? 'border-red-300' : ''}`}
                />
              </FormField>

              <FormField label="Diagnosis Date">
                <input
                  type="date"
                  value={form.diagnosisDate}
                  onChange={e => setForm(f => ({ ...f, diagnosisDate: e.target.value }))}
                  className="form-input"
                />
              </FormField>

              <FormField label="Medications" hint="Comma-separated">
                <input
                  type="text"
                  value={form.medications}
                  onChange={e => setForm(f => ({ ...f, medications: e.target.value }))}
                  placeholder="e.g. Ritalin 10mg, Melatonin 3mg"
                  className="form-input"
                />
              </FormField>

              <FormField label="Therapist Name">
                <input
                  type="text"
                  value={form.therapistName}
                  onChange={e => setForm(f => ({ ...f, therapistName: e.target.value }))}
                  placeholder="Dr. Sarah Mitchell"
                  className="form-input"
                />
              </FormField>

              <FormField label="Therapist Email">
                <input
                  type="email"
                  value={form.therapistEmail}
                  onChange={e => setForm(f => ({ ...f, therapistEmail: e.target.value }))}
                  placeholder="therapist@example.com"
                  className="form-input"
                />
              </FormField>
            </div>

            <FormField label="Notes">
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any important context about your child..."
                rows={3}
                className="form-input resize-none"
              />
            </FormField>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition ${
                  saved
                    ? 'bg-emerald-500 text-white'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
                {saved ? 'Saved!' : editingId ? 'Update Profile' : 'Create Profile'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demo data */}
      {children.length === 0 && showForm && (
        <div className="text-center">
          <button
            onClick={onSeedDemo}
            className="text-sm text-slate-400 hover:text-slate-600 underline transition"
          >
            Or load demo data to explore the app
          </button>
        </div>
      )}
    </div>
  );
}

function FormField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <label className="text-xs font-medium text-slate-600">{label}</label>
        {hint && <span className="text-xs text-slate-400">({hint})</span>}
      </div>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
