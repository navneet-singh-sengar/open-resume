import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { ProfilePage } from './pages/ProfilePage';
import { GeneratePage } from './pages/GeneratePage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { getSetupStatus } from './services/api';
import { User, Sparkles, Clock, Settings } from 'lucide-react';

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-slate-800 text-white'
            : 'text-slate-600 hover:bg-slate-100'
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getSetupStatus()
      .then(status => {
        if (!status.has_api_key) setShowOnboarding(true);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  return (
    <BrowserRouter>
      {loaded && showOnboarding && (
        <OnboardingModal onComplete={() => setShowOnboarding(false)} />
      )}
      <div className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-slate-800 text-lg">OpenResume</span>
            </div>
            <nav className="flex items-center gap-1">
              <NavItem to="/"><User className="w-4 h-4" /> Profile</NavItem>
              <NavItem to="/generate"><Sparkles className="w-4 h-4" /> Generate</NavItem>
              <NavItem to="/history"><Clock className="w-4 h-4" /> History</NavItem>
              <NavItem to="/settings"><Settings className="w-4 h-4" /> Settings</NavItem>
            </nav>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<ProfilePage />} />
            <Route path="/generate" element={<GeneratePage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
