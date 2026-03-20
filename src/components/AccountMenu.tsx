import { useState, useRef, useEffect } from 'react';
import {
  User,
  ChevronDown,
  LogOut,
  Copy,
  Check,
  Link,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export default function AccountMenu() {
  const { user, logout, refreshToken, magicLink } = useAuth();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmRefresh, setConfirmRefresh] = useState(false);
  const [refreshedLink, setRefreshedLink] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirmRefresh(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) return null;

  const currentLink = refreshedLink || magicLink(user);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = () => {
    if (!confirmRefresh) { setConfirmRefresh(true); return; }
    const newLink = refreshToken();
    setRefreshedLink(newLink);
    setConfirmRefresh(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-xl px-3.5 py-2 shadow-sm hover:bg-slate-50 transition"
      >
        <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
          <User size={14} className="text-indigo-600" />
        </div>
        <div className="text-left">
          <p className="text-xs font-semibold text-slate-700 leading-none">{user.name}</p>
          <p className="text-xs text-slate-400 leading-none mt-0.5">{user.email}</p>
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl shadow-slate-200 border border-slate-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                <User size={16} className="text-indigo-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">{user.name}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Magic link section */}
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-1.5 mb-2">
              <Link size={13} className="text-indigo-500" />
              <p className="text-xs font-semibold text-slate-600">Your Login Link</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 mb-2">
              <p className="font-mono text-xs text-slate-500 break-all leading-relaxed">
                {currentLink}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl font-medium transition ${
                  copied
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy Link</>}
              </button>

              <button
                onClick={handleRefresh}
                className={`flex items-center justify-center gap-1.5 text-xs py-2 px-3 rounded-xl font-medium transition ${
                  confirmRefresh
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title="Generate a new token (invalidates old link)"
              >
                {confirmRefresh ? (
                  <><AlertTriangle size={13} /> Confirm</>
                ) : (
                  <><RefreshCw size={13} /> Refresh</>
                )}
              </button>
            </div>
            {confirmRefresh && (
              <p className="text-xs text-amber-600 mt-2">
                This will invalidate your current link. Click Confirm to proceed.
              </p>
            )}
            {refreshedLink && (
              <p className="text-xs text-emerald-600 mt-1.5">
                ✓ Link refreshed — copy and save your new link above.
              </p>
            )}
          </div>

          {/* Logout */}
          <div className="px-5 py-3">
            <button
              onClick={() => { setOpen(false); logout(); }}
              className="w-full flex items-center gap-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-xl transition font-medium"
            >
              <LogOut size={15} /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
