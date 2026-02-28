import { useState } from 'react';
import { updateSettings } from '../../services/api';
import { Sparkles, Key, ArrowRight, CheckCircle, ExternalLink } from 'lucide-react';

interface OnboardingModalProps {
  onComplete: () => void;
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [geminiKey, setGeminiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSaveKey = async () => {
    if (!geminiKey.trim()) {
      onComplete();
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateSettings({ gemini_api_key: geminiKey.trim() });
      setStep(2);
    } catch {
      setError('Failed to save API key. You can configure it later in Settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">

        {step === 0 && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">
              Welcome to OpenResume
            </h2>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Generate ATS-optimized resumes tailored to any job description.
              Let's get you set up in 30 seconds.
            </p>
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Key className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Add an API Key</h3>
                <p className="text-sm text-slate-500">Required to generate resumes with AI</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Google Gemini API Key
                <span className="text-green-600 font-normal ml-1">(free)</span>
              </label>
              <input
                type="password"
                value={geminiKey}
                onChange={e => setGeminiKey(e.target.value)}
                placeholder="AIza..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent"
              />
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-2"
              >
                Get a free API key from Google AI Studio <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {error && (
              <p className="text-sm text-red-600 mb-4">{error}</p>
            )}

            <div className="flex items-center justify-between mt-6">
              <button
                onClick={handleSkip}
                className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
              >
                Skip for now
              </button>
              <button
                onClick={handleSaveKey}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : geminiKey.trim() ? 'Save & Continue' : 'Continue without key'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 leading-relaxed">
                You can also use OpenAI, Anthropic, or local Ollama models.
                Configure additional providers anytime in Settings.
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">
              You're all set!
            </h2>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Start by importing your existing resume or filling in your profile.
              Then generate tailored resumes for any job.
            </p>
            <button
              onClick={onComplete}
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors"
            >
              Go to Profile <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="px-8 pb-4 flex justify-center gap-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === step ? 'bg-slate-800' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
