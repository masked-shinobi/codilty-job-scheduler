import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import {
  LayoutDashboard,
  ListTodo,
  Search,
  Server,
  BarChart3,
  Zap,
  Sun,
  Moon,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Overview' },
  { to: '/queues', icon: ListTodo, label: 'Queues' },
  { to: '/jobs', icon: Search, label: 'Job Explorer' },
  { to: '/workers', icon: Server, label: 'Workers' },
  { to: '/metrics', icon: BarChart3, label: 'Metrics' },
];

export default function DashboardLayout() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ─── Sidebar ───────────────────────────────────────────────────── */}
      <aside className="w-72 bg-white/80 dark:bg-surface-800/40 backdrop-blur-xl border-r border-slate-200 dark:border-white/5 flex flex-col transition-all duration-300">
        {/* Logo */}
        <div className="p-8 flex items-center gap-4 border-b border-slate-200 dark:border-white/5">
          <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/25">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">JobFlow</h1>
            <p className="text-[11px] text-slate-500 dark:text-gray-500 uppercase tracking-widest font-bold">Scheduler Platform</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-4 px-5 py-3.5 rounded-2xl text-base font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-500/10 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-500/20 dark:border-brand-500/20 shadow-sm'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200 hover:bg-slate-200/50 dark:hover:bg-white/5'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User section with Theme Toggle */}
        <div className="p-5 border-t border-slate-200 dark:border-white/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'w-10 h-10',
                },
              }}
            />
            <span className="text-base font-semibold text-slate-700 dark:text-gray-400">Account</span>
          </div>
          
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2.5 rounded-xl bg-slate-200/50 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-400 dark:hover:text-gray-200 transition-all active:scale-90"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </aside>

      {/* ─── Main content ──────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto bg-slate-50 dark:bg-gradient-to-br dark:from-surface-900 dark:via-surface-900 dark:to-brand-950/20 transition-all duration-300">
        <div className="p-10 md:p-12 max-w-[1600px] mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
