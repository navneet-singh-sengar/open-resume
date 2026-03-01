import { useState, useEffect } from 'react';
import { getResumeHistory, getResume, getResumeDownloadUrl, deleteResume } from '../services/api';
import { ResumePreview } from '../components/resume/ResumePreview';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import type { ResumeHistoryItem, ResumeGenerateResponse } from '../types';
import { Download, Eye, Clock, Cpu, FileText, Trash2 } from 'lucide-react';

export function HistoryPage() {
  const [history, setHistory] = useState<ResumeHistoryItem[]>([]);
  const [selected, setSelected] = useState<ResumeGenerateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewLoading, setViewLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    getResumeHistory().then(data => {
      setHistory(data);
      setLoading(false);
    });
  }, []);

  const handleView = async (id: number) => {
    setViewLoading(true);
    try {
      const data = await getResume(id);
      setSelected(data);
    } finally {
      setViewLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this resume? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await deleteResume(id);
      setHistory(prev => prev.filter(item => item.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="animate-spin h-8 w-8 text-slate-400" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (selected) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setSelected(null)}>&larr; Back to History</Button>
        <ResumePreview data={selected} onUpdated={setSelected} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Resume History</h1>
        <p className="text-sm text-slate-500 mt-1">
          View and download previously generated resumes.
        </p>
      </div>

      {history.length === 0 ? (
        <Card className="text-center py-12">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No resumes generated yet</p>
          <p className="text-sm text-slate-400 mt-1">Go to the Generate page to create your first tailored resume</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {history.map(item => (
            <Card key={item.id} className="!p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">
                    {item.job_title}{item.company ? ` at ${item.company}` : ''}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                    <span className="flex items-center gap-1"><Cpu className="w-3.5 h-3.5" /> {item.ai_model_used}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => handleView(item.id)} loading={viewLoading}>
                    <Eye className="w-4 h-4" /> View
                  </Button>
                  <a href={getResumeDownloadUrl(item.id)} download>
                    <Button size="sm" variant="secondary">
                      <Download className="w-4 h-4" /> PDF
                    </Button>
                  </a>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDelete(item.id)}
                    loading={deletingId === item.id}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
