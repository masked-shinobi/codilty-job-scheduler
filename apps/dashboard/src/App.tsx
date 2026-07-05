import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardLayout from './components/Layout';
import OverviewPage from './pages/OverviewPage';
import QueuesPage from './pages/QueuesPage';
import JobExplorerPage from './pages/JobExplorerPage';
import JobDetailPage from './pages/JobDetailPage';
import WorkersPage from './pages/WorkersPage';
import MetricsPage from './pages/MetricsPage';
import { Zap } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 2000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SignedIn>
          <Routes>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/queues" element={<QueuesPage />} />
              <Route path="/jobs" element={<JobExplorerPage />} />
              <Route path="/jobs/:id" element={<JobDetailPage />} />
              <Route path="/workers" element={<WorkersPage />} />
              <Route path="/metrics" element={<MetricsPage />} />
            </Route>
          </Routes>
        </SignedIn>

        <SignedOut>
          <div className="min-h-screen bg-surface-900 flex items-center justify-center">
            <div className="text-center animate-fade-in">
              {/* Logo */}
              <div className="w-20 h-20 bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-brand-500/30">
                <Zap className="w-10 h-10 text-white" />
              </div>

              <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">JobFlow</h1>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                Distributed job scheduling platform. Manage queues, inspect jobs, and monitor workers in real-time.
              </p>

              <SignInButton mode="modal">
                <button className="btn-primary text-lg px-8 py-3">
                  Sign In to Continue
                </button>
              </SignInButton>

              <div className="mt-12 grid grid-cols-3 gap-8 max-w-lg mx-auto text-left">
                <div>
                  <div className="w-10 h-10 bg-emerald-500/15 rounded-xl flex items-center justify-center mb-3">
                    <span className="text-emerald-400 text-lg">⚡</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">Fast Processing</h3>
                  <p className="text-xs text-gray-500">Atomic job claiming with Postgres row-level locking</p>
                </div>
                <div>
                  <div className="w-10 h-10 bg-brand-500/15 rounded-xl flex items-center justify-center mb-3">
                    <span className="text-brand-400 text-lg">🔄</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">Smart Retries</h3>
                  <p className="text-xs text-gray-500">Configurable retry strategies with exponential backoff</p>
                </div>
                <div>
                  <div className="w-10 h-10 bg-amber-500/15 rounded-xl flex items-center justify-center mb-3">
                    <span className="text-amber-400 text-lg">📊</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">Live Metrics</h3>
                  <p className="text-xs text-gray-500">Real-time throughput and health monitoring</p>
                </div>
              </div>
            </div>
          </div>
        </SignedOut>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
