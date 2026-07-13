'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type AdminTheme = 'light' | 'dark';

type AdminPreferences = {
  theme: AdminTheme;
  reducedMotion: boolean;
  setTheme: (theme: AdminTheme) => void;
  setReducedMotion: (enabled: boolean) => void;
};

const AdminPreferencesContext = createContext<AdminPreferences | null>(null);

function applyPreferences(theme: AdminTheme, reducedMotion: boolean) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.reducedMotion = String(reducedMotion);
  document.documentElement.style.colorScheme = theme;
}

export function AdminPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AdminTheme>('light');
  const [reducedMotion, setReducedMotionState] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem('admin-theme') === 'dark' ? 'dark' : 'light';
    const storedMotion = localStorage.getItem('admin-reduced-motion') === 'true';
    setThemeState(storedTheme);
    setReducedMotionState(storedMotion);
    applyPreferences(storedTheme, storedMotion);
  }, []);

  const value = useMemo<AdminPreferences>(() => ({
    theme,
    reducedMotion,
    setTheme(nextTheme) {
      setThemeState(nextTheme);
      localStorage.setItem('admin-theme', nextTheme);
      applyPreferences(nextTheme, reducedMotion);
    },
    setReducedMotion(enabled) {
      setReducedMotionState(enabled);
      localStorage.setItem('admin-reduced-motion', String(enabled));
      applyPreferences(theme, enabled);
    },
  }), [reducedMotion, theme]);

  return <AdminPreferencesContext.Provider value={value}>{children}</AdminPreferencesContext.Provider>;
}

export function useAdminPreferences() {
  const context = useContext(AdminPreferencesContext);
  if (!context) throw new Error('useAdminPreferences phải nằm trong AdminPreferencesProvider.');
  return context;
}
