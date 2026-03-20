import {
  LayoutDashboard,
  PenLine,
  History,
  TrendingUp,
  FileText,
  Users,
  Brain,
  Menu,
  X,
  LogOut,
  User,
} from 'lucide-react';
import { useState } from 'react';
import type { ActiveView } from '../types';
import { useAuth } from '../auth/AuthContext';

interface NavProps {
  activeView: ActiveView;
  setActiveView: (v: ActiveView) => void;
}

const NAV_ITEMS: { id: ActiveView; label: string; icon: React.ReactNode; description: string }[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard size={20} />,
    description: 'Overview & summary',
  },
  {
    id: 'log',
    label: 'Daily Log',
    icon: <PenLine size={20} />,
    description: 'Record today\'s behaviors',
  },
  {
    id: 'history',
    label: 'History',
    icon: <History size={20} />,
    description: 'Past behavior entries',
  },
  {
    id: 'progress',
    label: 'Progress',
    icon: <TrendingUp size={20} />,
    description: 'Charts & trends',
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: <FileText size={20} />,
    description: 'Share with therapist',
  },
  {
    id: 'profiles',
    label: 'Profiles',
    icon: <Users size={20} />,
    description: 'Manage children',
  },
];

export default function Navigation({ activeView, setActiveView }: NavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();

  const handleNav = (id: ActiveView) => {
    setActiveView(id);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-white border-r border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow">
            <Brain size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 leading-tight">ADHD Tracker</h1>
            <p className="text-xs text-slate-400">Behavioral Journal</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                activeView === item.id
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <span className={activeView === item.id ? 'text-indigo-600' : 'text-slate-400'}>
                {item.icon}
              </span>
              <div>
                <div className="text-sm">{item.label}</div>
                <div className="text-xs text-slate-400 font-normal">{item.description}</div>
              </div>
              {activeView === item.id && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600" />
              )}
            </button>
          ))}
        </nav>

        {/* Account strip at bottom of sidebar */}
        <div className="px-4 py-4 border-t border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <User size={14} className="text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-700 truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Brain size={16} className="text-white" />
          </div>
          <span className="font-bold text-slate-800 text-sm">ADHD Tracker</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/40" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute top-0 left-0 bottom-0 w-72 bg-white shadow-xl pt-16"
            onClick={e => e.stopPropagation()}
          >
            <nav className="px-3 py-4 space-y-1 flex-1">
              {NAV_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all ${
                    activeView === item.id
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className={activeView === item.id ? 'text-indigo-600' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <div>
                    <div className="text-sm">{item.label}</div>
                    <div className="text-xs text-slate-400 font-normal">{item.description}</div>
                  </div>
                </button>
              ))}
            </nav>
            <div className="px-4 py-4 border-t border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <User size={14} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{user?.name}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                </div>
                <button onClick={() => { setMobileOpen(false); logout(); }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500">
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
