import { useState, useEffect } from 'react';
import './index.css';
import { AuthProvider, useAuth } from './auth/AuthContext';
import LoginPage from './components/LoginPage';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import LogEntry from './components/LogEntry';
import History from './components/History';
import Progress from './components/Progress';
import Reports from './components/Reports';
import Profiles from './components/Profiles';
import AccountMenu from './components/AccountMenu';
import { useStore } from './store/useStore';
import type { ActiveView } from './types';

// ── Inner app (rendered only when authenticated) ─────────────────────────────

function AuthenticatedApp() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');

  const {
    children,
    logs,
    addChild,
    updateChild,
    deleteChild,
    addLog,
    updateLog,
    deleteLog,
    seedDemoData,
  } = useStore(user!.id);

  const [selectedChildId, setSelectedChildId] = useState<string | null>(
    children[0]?.id ?? null
  );

  useEffect(() => {
    if (!selectedChildId && children.length > 0) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  const handleEditLog = (_date: string) => setActiveView('log');

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Navigation activeView={activeView} setActiveView={setActiveView} />

      <main className="flex-1 min-w-0">
        {/* Mobile top bar spacing */}
        <div className="lg:hidden h-14" />

        {/* Desktop account bar */}
        <div className="hidden lg:flex items-center justify-end px-8 pt-5 pb-0">
          <AccountMenu />
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6 lg:px-8">
          {activeView === 'dashboard' && (
            <Dashboard
              children={children}
              logs={logs}
              selectedChildId={selectedChildId}
              setSelectedChildId={setSelectedChildId}
              onNavigate={v => setActiveView(v)}
            />
          )}

          {activeView === 'log' && (
            <LogEntry
              children={children}
              logs={logs}
              selectedChildId={selectedChildId}
              setSelectedChildId={setSelectedChildId}
              onSave={addLog}
              onUpdate={updateLog}
              onNavigate={v => setActiveView(v)}
              parentEmail={user!.email}
            />
          )}

          {activeView === 'history' && (
            <History
              children={children}
              logs={logs}
              selectedChildId={selectedChildId}
              setSelectedChildId={setSelectedChildId}
              onDelete={deleteLog}
              onEditLog={handleEditLog}
            />
          )}

          {activeView === 'progress' && (
            <Progress
              children={children}
              logs={logs}
              selectedChildId={selectedChildId}
              setSelectedChildId={setSelectedChildId}
            />
          )}

          {activeView === 'reports' && (
            <Reports
              children={children}
              logs={logs}
              selectedChildId={selectedChildId}
              setSelectedChildId={setSelectedChildId}
            />
          )}

          {activeView === 'profiles' && (
            <Profiles
              children={children}
              logs={logs}
              onAdd={child => {
                addChild(child);
                setSelectedChildId(child.id);
              }}
              onUpdate={updateChild}
              onDelete={id => {
                deleteChild(id);
                if (selectedChildId === id) {
                  const remaining = children.filter(c => c.id !== id);
                  setSelectedChildId(remaining[0]?.id ?? null);
                }
              }}
              selectedChildId={selectedChildId}
              setSelectedChildId={setSelectedChildId}
              onSeedDemo={seedDemoData}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// ── Root: gate on auth state ─────────────────────────────────────────────────

function AppGate() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return user ? <AuthenticatedApp /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  );
}
