import { useState, useEffect } from 'react';
import { Input } from '../ui/Input';
import { TextArea } from '../ui/TextArea';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { listProjects, createProject, updateProject, deleteProject } from '../../services/api';
import type { Project } from '../../types';
import { Trash2, Plus, Pencil, X } from 'lucide-react';

const EMPTY: Project = { name: '', description: '', technologies: [], url: '', highlights: [] };

export function ProjectsForm() {
  const [items, setItems] = useState<Project[]>([]);
  const [editing, setEditing] = useState<Project | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [techInput, setTechInput] = useState('');
  const [highlightInput, setHighlightInput] = useState('');

  const load = () => listProjects().then(setItems);
  useEffect(() => { load(); }, []);

  const startNew = () => { setEditing({ ...EMPTY }); setIsNew(true); setTechInput(''); setHighlightInput(''); };
  const startEdit = (item: Project) => { setEditing({ ...item }); setIsNew(false); setTechInput(''); setHighlightInput(''); };
  const cancel = () => { setEditing(null); setIsNew(false); };

  const set = (field: keyof Project, value: unknown) =>
    setEditing(prev => prev ? { ...prev, [field]: value } : null);

  const addTech = () => {
    if (!techInput.trim() || !editing) return;
    set('technologies', [...editing.technologies, techInput.trim()]);
    setTechInput('');
  };

  const addHighlight = () => {
    if (!highlightInput.trim() || !editing) return;
    set('highlights', [...editing.highlights, highlightInput.trim()]);
    setHighlightInput('');
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (isNew) await createProject(editing);
      else await updateProject(editing.id!, editing);
      cancel();
      await load();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => { await deleteProject(id); await load(); };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projects</CardTitle>
        {!editing && <Button size="sm" onClick={startNew}><Plus className="w-4 h-4" /> Add</Button>}
      </CardHeader>

      {editing && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label="Project Name" value={editing.name} onChange={e => set('name', e.target.value)} placeholder="My Awesome Project" />
            <Input label="URL" value={editing.url || ''} onChange={e => set('url', e.target.value)} placeholder="https://github.com/..." />
          </div>
          <TextArea label="Description" value={editing.description || ''} onChange={e => set('description', e.target.value)} rows={2} placeholder="Brief project description..." />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Technologies</label>
            <div className="flex gap-2">
              <input className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" value={techInput} onChange={e => setTechInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTech())} placeholder="React, Node.js, etc." />
              <Button size="sm" variant="secondary" onClick={addTech}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {editing.technologies.map((t, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 px-2.5 py-0.5 text-xs font-medium">
                  {t}
                  <button onClick={() => set('technologies', editing.technologies.filter((_, idx) => idx !== i))} className="hover:text-red-500">&times;</button>
                </span>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Highlights</label>
            <div className="flex gap-2">
              <input className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" value={highlightInput} onChange={e => setHighlightInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addHighlight())} placeholder="Key achievement..." />
              <Button size="sm" variant="secondary" onClick={addHighlight}>Add</Button>
            </div>
            <ul className="mt-2 space-y-1">
              {editing.highlights.map((h, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-slate-700 bg-white rounded px-2 py-1 border border-slate-100">
                  <span className="flex-1">{h}</span>
                  <button onClick={() => set('highlights', editing.highlights.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={cancel}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{isNew ? 'Add Project' : 'Update'}</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className="flex items-start justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50 transition-colors">
            <div>
              <div className="font-medium text-slate-800">{item.name}</div>
              {item.description && <div className="text-sm text-slate-500 line-clamp-1">{item.description}</div>}
              {item.technologies.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {item.technologies.map((t, i) => (
                    <span key={i} className="text-xs bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">{t}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-1">
              <button onClick={() => startEdit(item)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(item.id!)} className="p-1.5 text-slate-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && !editing && <p className="text-sm text-slate-400 text-center py-4">No projects added yet</p>}
      </div>
    </Card>
  );
}
