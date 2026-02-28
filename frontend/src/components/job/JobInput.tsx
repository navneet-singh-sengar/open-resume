import { useState, useEffect } from 'react';
import { TextArea } from '../ui/TextArea';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { generateResume, getModels, getSettings } from '../../services/api';
import type { ResumeGenerateResponse } from '../../types';
import { Sparkles, Link, FileText } from 'lucide-react';

const FALLBACK_MODELS = [
  { value: 'gemini/gemini-3-flash-preview', label: 'Gemini 3 Flash Preview (Google) — Recommended' },
  { value: 'gemini/gemma-3-27b-it', label: 'Gemma 3 27B (Google — Open Model)' },
  { value: 'ollama/mistral', label: 'Mistral 7B (Local — Ollama)' },
];

interface JobInputProps {
  onGenerated: (result: ResumeGenerateResponse) => void;
}

export function JobInput({ onGenerated }: JobInputProps) {
  const [mode, setMode] = useState<'paste' | 'url'>('paste');
  const [jobText, setJobText] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [model, setModel] = useState(FALLBACK_MODELS[0].value);
  const [modelOptions, setModelOptions] = useState(FALLBACK_MODELS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getModels()
      .then(list => {
        const opts = list.map(m => ({ value: m.value, label: m.label }));
        if (opts.length > 0) setModelOptions(opts);
      })
      .catch(() => {});
    getSettings()
      .then(s => { if (s.default_model) setModel(s.default_model); })
      .catch(() => {});
  }, []);

  const handleGenerate = async () => {
    setError('');
    if (mode === 'paste' && !jobText.trim()) {
      setError('Please paste a job description');
      return;
    }
    if (mode === 'url' && !jobUrl.trim()) {
      setError('Please enter a job posting URL');
      return;
    }

    setLoading(true);
    try {
      const result = await generateResume({
        job_text: mode === 'paste' ? jobText : undefined,
        job_url: mode === 'url' ? jobUrl : undefined,
        model,
      });
      onGenerated(result);
    } catch (err: unknown) {
      let msg = 'Failed to generate resume';
      const isOllamaModel = model.startsWith('ollama/');
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string }, status?: number } };
        const detail = axiosErr.response?.data?.detail || '';
        if (detail.includes('Connection') || detail.includes('ConnectError') || detail.includes('ECONNREFUSED')) {
          msg = isOllamaModel
            ? 'Cannot connect to Ollama. Make sure it is running (ollama serve) and the model is pulled (ollama pull ' + model.replace('ollama/', '') + ').'
            : 'Connection error. Please check your internet connection and try again.';
        } else if (detail.includes('RateLimitError') || detail.includes('429') || detail.includes('quota')) {
          msg = 'Rate limit exceeded for this model. Try a different model (Gemini 2.5 Flash or Gemini 3 Flash work on the free tier).';
        } else if (detail.includes('NotFoundError') || detail.includes('404')) {
          msg = isOllamaModel
            ? 'Model not found locally. Pull it first: ollama pull ' + model.replace('ollama/', '')
            : 'Model not available. Please select a different model.';
        } else {
          msg = detail || msg;
        }
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Job Description</CardTitle>
      </CardHeader>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('paste')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'paste' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          <FileText className="w-4 h-4" /> Paste Text
        </button>
        <button
          onClick={() => setMode('url')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'url' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          <Link className="w-4 h-4" /> Job URL
        </button>
      </div>

      {mode === 'paste' ? (
        <TextArea
          value={jobText}
          onChange={e => setJobText(e.target.value)}
          rows={10}
          placeholder="Paste the full job description here..."
          className="font-mono text-xs"
        />
      ) : (
        <Input
          value={jobUrl}
          onChange={e => setJobUrl(e.target.value)}
          placeholder="https://www.linkedin.com/jobs/view/..."
        />
      )}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="w-64">
          <Select label="AI Model" value={model} onChange={e => setModel(e.target.value)} options={modelOptions} />
        </div>
        <Button size="lg" onClick={handleGenerate} loading={loading} className="flex-shrink-0">
          <Sparkles className="w-4 h-4" /> Generate Tailored Resume
        </Button>
      </div>

      {error && (
        <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="mt-4 flex items-center gap-3 text-sm text-slate-500">
          <svg className="animate-spin h-5 w-5 text-slate-400" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Analyzing job description and generating your tailored resume...
        </div>
      )}
    </Card>
  );
}
