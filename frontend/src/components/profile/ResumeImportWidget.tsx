import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '../ui/Card';
import { TextArea } from '../ui/TextArea';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { importResume, importResumeFile, getModels, getSettings } from '../../services/api';
import {
  Upload,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  FileText,
  FileUp,
} from 'lucide-react';

const FALLBACK_MODELS = [
  { value: 'gemini/gemini-3-flash-preview', label: 'Gemini 3 Flash Preview (Google) — Recommended' },
  { value: 'gemini/gemma-3-27b-it', label: 'Gemma 3 27B (Google — Open Model)' },
  { value: 'ollama/mistral', label: 'Mistral 7B (Local — Ollama)' },
];

interface ResumeImportWidgetProps {
  onImported: () => void;
}

type InputMode = 'paste' | 'file';

function buildResultMessage(
  counts: Record<string, number>,
  skipped: Record<string, number>,
): string {
  const imported: string[] = [];
  if (counts.personal_info) imported.push('personal info');
  if (counts.work_experience) imported.push(`${counts.work_experience} experience(s)`);
  if (counts.education) imported.push(`${counts.education} education`);
  if (counts.skills) imported.push(`${counts.skills} skill(s)`);
  if (counts.projects) imported.push(`${counts.projects} project(s)`);
  if (counts.certifications) imported.push(`${counts.certifications} certification(s)`);

  const totalSkipped = Object.values(skipped || {}).reduce((a, b) => a + b, 0);

  const parts: string[] = [];
  if (imported.length > 0) {
    parts.push(`Imported: ${imported.join(', ')}`);
  }
  if (totalSkipped > 0) {
    parts.push(`${totalSkipped} duplicate(s) skipped`);
  }
  if (parts.length === 0) {
    return 'Resume parsed but no new data was extracted. It may already be imported.';
  }
  return parts.join('. ') + '.';
}

export function ResumeImportWidget({ onImported }: ResumeImportWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<InputMode>('paste');
  const [resumeText, setResumeText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [model, setModel] = useState(FALLBACK_MODELS[0].value);
  const [modelOptions, setModelOptions] = useState(FALLBACK_MODELS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf' || ext === 'docx') {
        setSelectedFile(file);
        setError('');
      } else {
        setError('Please upload a PDF or DOCX file.');
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError('');
    }
  };

  const handleImport = async () => {
    if (mode === 'paste' && !resumeText.trim()) {
      setError('Please paste your resume text');
      return;
    }
    if (mode === 'file' && !selectedFile) {
      setError('Please select a PDF or DOCX file');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      let result: { counts: Record<string, number>; skipped: Record<string, number> };

      if (mode === 'paste') {
        result = await importResume({ resume_text: resumeText, model });
      } else {
        result = await importResumeFile(selectedFile!, model);
      }

      setSuccess(buildResultMessage(result.counts, result.skipped));
      setResumeText('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onImported();
    } catch (err: unknown) {
      let msg = 'Failed to import resume';
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        msg = axiosErr.response?.data?.detail || msg;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-dashed border-2 border-slate-300 bg-slate-50/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-800 text-white">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              Quick Start: Import from Resume
            </h3>
            <p className="text-sm text-slate-500">
              Paste text or upload a PDF/DOCX to auto-fill all profile sections
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode('paste')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'paste'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" /> Paste Text
            </button>
            <button
              onClick={() => setMode('file')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'file'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileUp className="w-4 h-4" /> Upload File
            </button>
          </div>

          {/* Paste mode */}
          {mode === 'paste' && (
            <TextArea
              value={resumeText}
              onChange={e => setResumeText(e.target.value)}
              rows={12}
              placeholder="Paste your full resume text here... (Copy from your resume PDF, Word doc, or LinkedIn profile)"
              className="font-mono text-xs"
            />
          )}

          {/* File mode */}
          {mode === 'file' && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                dragging
                  ? 'border-slate-800 bg-slate-100'
                  : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
              <FileUp className="w-10 h-10 text-slate-400" />
              {selectedFile ? (
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-800">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {(selectedFile.size / 1024).toFixed(1)} KB — Click or drop to replace
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-600">
                    Drop your resume here, or click to browse
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports PDF and DOCX files
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Model selector + Import button */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-64">
              <Select
                label="AI Model"
                value={model}
                onChange={e => setModel(e.target.value)}
                options={modelOptions}
              />
            </div>
            <Button
              size="lg"
              onClick={handleImport}
              loading={loading}
              className="flex-shrink-0"
            >
              <Upload className="w-4 h-4" /> Import & Fill Profile
            </Button>
          </div>

          {loading && (
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <svg
                className="animate-spin h-5 w-5 text-slate-400"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Parsing your resume with AI... This may take 10-30 seconds.
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700 flex items-start gap-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
