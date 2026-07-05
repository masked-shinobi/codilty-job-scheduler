import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import {
  LayoutDashboard,
  ListTodo,
  Search,
  Server,
  BarChart3,
  Zap,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Overview' },
  { to: '/queues', icon: ListTodo, label: 'Queues' },
  { to: '/jobs', icon: Search, label: 'Job Explorer' },
  { to: '/workers', icon: Server, label: 'Workers' },
  { to: '/metrics', icon: BarChart3, label: 'Metrics' },
];

export default function DashboardLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* ─── Sidebar ───────────────────────────────────────────────────── */}
      <aside className="w-64 bg-surface-800/40 backdrop-blur-xl border-r border-white/5 flex flex-col">
        {/* Logo */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/25">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">JobFlow</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Scheduler Platform</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20 shadow-sm shadow-brand-500/5'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'w-8 h-8',
                },
              }}
            />
            <span className="text-sm text-gray-400">Account</span>
          </div>
        </div>
      </aside>

      {/* ─── Main content ──────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto bg-gradient-to-br from-surface-900 via-surface-900 to-brand-950/20">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
