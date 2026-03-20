import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { User } from '../types/auth';

const USERS_KEY = 'adhd_users';
const SESSION_KEY = 'adhd_session_token';

// ── Storage helpers ──────────────────────────────────────────────────────────

function loadUsers(): User[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveUsers(users: User[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function findUserByToken(token: string): User | null {
  return loadUsers().find(u => u.token === token) ?? null;
}

// ── Auth context ─────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  /** Create a new account; returns the generated magic-link URL */
  register: (name: string, email: string) => { user: User; magicLink: string };
  /** Sign in with token from URL or manually pasted. Returns success. */
  loginWithToken: (token: string) => boolean;
  logout: () => void;
  /** Regenerate a fresh token for the current user */
  refreshToken: () => string;
  magicLink: (user: User) => string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Build a magic-link URL from a token
  const magicLink = useCallback((u: User): string => {
    const base = window.location.origin + window.location.pathname;
    return `${base}?token=${u.token}`;
  }, []);

  // Attempt to restore session on mount
  useEffect(() => {
    const urlToken = new URLSearchParams(window.location.search).get('token');

    if (urlToken) {
      const found = findUserByToken(urlToken);
      if (found) {
        setUser(found);
        localStorage.setItem(SESSION_KEY, urlToken);
        // Clean token from URL without a page reload
        window.history.replaceState({}, '', window.location.pathname);
      }
    } else {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const found = findUserByToken(saved);
        if (found) setUser(found);
        else localStorage.removeItem(SESSION_KEY);
      }
    }

    setIsLoading(false);
  }, []);

  const register = useCallback((name: string, email: string) => {
    const users = loadUsers();

    // Reuse existing account for same email (idempotent)
    const existing = users.find(
      u => u.email.toLowerCase() === email.toLowerCase()
    );
    if (existing) {
      localStorage.setItem(SESSION_KEY, existing.token);
      setUser(existing);
      return { user: existing, magicLink: magicLink(existing) };
    }

    const newUser: User = {
      id: uuidv4(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      token: uuidv4(),
      createdAt: new Date().toISOString(),
    };

    saveUsers([...users, newUser]);
    localStorage.setItem(SESSION_KEY, newUser.token);
    setUser(newUser);
    return { user: newUser, magicLink: magicLink(newUser) };
  }, [magicLink]);

  const loginWithToken = useCallback((token: string): boolean => {
    const found = findUserByToken(token.trim());
    if (!found) return false;
    localStorage.setItem(SESSION_KEY, found.token);
    setUser(found);
    return true;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  const refreshToken = useCallback((): string => {
    if (!user) return '';
    const newToken = uuidv4();
    const users = loadUsers().map(u =>
      u.id === user.id ? { ...u, token: newToken } : u
    );
    saveUsers(users);
    const updated = { ...user, token: newToken };
    localStorage.setItem(SESSION_KEY, newToken);
    setUser(updated);
    return magicLink(updated);
  }, [user, magicLink]);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, register, loginWithToken, logout, refreshToken, magicLink }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
