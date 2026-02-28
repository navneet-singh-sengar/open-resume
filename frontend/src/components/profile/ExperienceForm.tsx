import { useState, useEffect } from 'react';
import { Input } from '../ui/Input';
import { TextArea } from '../ui/TextArea';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { listExperience, createExperience, updateExperience, deleteExperience } from '../../services/api';
import type { WorkExperience } from '../../types';
import { Trash2, Plus, Pencil, X } from 'lucide-react';

const EMPTY: WorkExperience = {
  company: '', title: '', start_date: '', end_date: '',
  is_current: false, description: '', achievements: [],
};

export function ExperienceForm() {
  const [items, setItems] = useState<WorkExperience[]>([]);
  const [editing, setEditing] = useState<WorkExperience | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [achievementInput, setAchievementInput] = useState('');

  const load = () => listExperience().then(setItems);
  useEffect(() => { load(); }, []);

  const startNew = () => {
    setEditing({ ...EMPTY });
    setIsNew(true);
    setAchievementInput('');
  };

  const startEdit = (item: WorkExperience) => {
    setEditing({ ...item });
    setIsNew(false);
    setAchievementInput('');
  };

  const cancel = () => { setEditing(null); setIsNew(false); };

  const set = (field: keyof WorkExperience, value: unknown) =>
    setEditing(prev => prev ? { ...prev, [field]: value } : null);

  const addAchievement = () => {
    if (!achievementInput.trim() || !editing) return;
    set('achievements', [...editing.achievements, achievementInput.trim()]);
    setAchievementInput('');
  };

  const removeAchievement = (idx: number) => {
    if (!editing) return;
    set('achievements', editing.achievements.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (isNew) {
        await createExperience(editing);
      } else {
        await updateExperience(editing.id!, editing);
      }
      setEditing(null);
      setIsNew(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await deleteExperience(id);
    await load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Work Experience</CardTitle>
        {!editing && <Button size="sm" onClick={startNew}><Plus className="w-4 h-4" /> Add</Button>}
      </CardHeader>

      {editing && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label="Job Title" value={editing.title} onChange={e => set('title', e.target.value)} placeholder="Software Engineer" />
            <Input label="Company" value={editing.company} onChange={e => set('company', e.target.value)} placeholder="Google" />
            <Input label="Start Date" type="date" value={editing.start_date} onChange={e => set('start_date', e.target.value)} />
            <div>
              <Input label="End Date" type="date" value={editing.end_date || ''} onChange={e => set('end_date', e.target.value)} disabled={editing.is_current} />
              <label className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={editing.is_current} onChange={e => set('is_current', e.target.checked)} className="rounded" />
                Currently working here
              </label>
            </div>
          </div>
          <TextArea label="Description" value={editing.description || ''} onChange={e => set('description', e.target.value)} rows={2} placeholder="Brief role description..." />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Achievements</label>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                value={achievementInput}
                onChange={e => setAchievementInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAchievement())}
                placeholder="Add an achievement and press Enter"
              />
              <Button size="sm" variant="secondary" onClick={addAchievement}>Add</Button>
            </div>
            <ul className="mt-2 space-y-1">
              {editing.achievements.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700 bg-white rounded px-2 py-1 border border-slate-100">
                  <span className="flex-1">{a}</span>
                  <button onClick={() => removeAchievement(i)} className="text-slate-400 hover:text-red-500 mt-0.5"><X className="w-3.5 h-3.5" /></button>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={cancel}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{isNew ? 'Add Experience' : 'Update'}</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className="flex items-start justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50 transition-colors">
            <div>
              <div className="font-medium text-slate-800">{item.title}</div>
              <div className="text-sm text-slate-500">{item.company} &middot; {item.start_date} – {item.is_current ? 'Present' : item.end_date}</div>
              {item.achievements.length > 0 && (
                <ul className="mt-1 text-xs text-slate-600 list-disc list-inside">
                  {item.achievements.slice(0, 2).map((a, i) => <li key={i}>{a}</li>)}
                  {item.achievements.length > 2 && <li className="text-slate-400">+{item.achievements.length - 2} more</li>}
                </ul>
              )}
            </div>
            <div className="flex gap-1">
              <button onClick={() => startEdit(item)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(item.id!)} className="p-1.5 text-slate-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && !editing && (
          <p className="text-sm text-slate-400 text-center py-4">No work experience added yet</p>
        )}
      </div>
    </Card>
  );
}
