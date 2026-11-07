import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import { session } from '../services/session';
import { Role, SessionUser } from '../types/community';
import { storage } from '../services/storage';

interface AuthContextType {
  user: SessionUser | null;
  login: (name: string, role: Role) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SessionUser | null>(() => session.get());

  // Stay in sync when the API client clears a stale/invalid session (HTTP 401).
  useEffect(() => session.subscribe(() => setUser(session.get())), []);

  const login = useCallback(async (name: string, role: Role) => {
    const u = await api.login(name.trim(), role);
    session.set(u);
    // The old local onboarding is replaced by the role login; remember the display name for the senior app.
    const settings = storage.getSettings();
    storage.saveSettings({ ...settings, displayName: u.name, completedOnboarding: true });
  }, []);

  const logout = useCallback(() => session.clear(), []);

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
