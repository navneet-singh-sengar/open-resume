import { useState, useEffect } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { listEducation, createEducation, updateEducation, deleteEducation } from '../../services/api';
import type { Education } from '../../types';
import { Trash2, Plus, Pencil, X } from 'lucide-react';

const EMPTY: Education = {
  institution: '', degree: '', field: '', start_date: '',
  end_date: '', gpa: undefined, achievements: [],
};

export function EducationForm() {
  const [items, setItems] = useState<Education[]>([]);
  const [editing, setEditing] = useState<Education | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [achievementInput, setAchievementInput] = useState('');

  const load = () => listEducation().then(setItems);
  useEffect(() => { load(); }, []);

  const startNew = () => { setEditing({ ...EMPTY }); setIsNew(true); setAchievementInput(''); };
  const startEdit = (item: Education) => { setEditing({ ...item }); setIsNew(false); setAchievementInput(''); };
  const cancel = () => { setEditing(null); setIsNew(false); };

  const set = (field: keyof Education, value: unknown) =>
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
      const payload = { ...editing, gpa: editing.gpa || undefined };
      if (isNew) await createEducation(payload);
      else await updateEducation(editing.id!, payload);
      cancel();
      await load();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => { await deleteEducation(id); await load(); };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Education</CardTitle>
        {!editing && <Button size="sm" onClick={startNew}><Plus className="w-4 h-4" /> Add</Button>}
      </CardHeader>

      {editing && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label="Institution" value={editing.institution} onChange={e => set('institution', e.target.value)} placeholder="MIT" />
            <Input label="Degree" value={editing.degree} onChange={e => set('degree', e.target.value)} placeholder="Bachelor of Science" />
            <Input label="Field of Study" value={editing.field} onChange={e => set('field', e.target.value)} placeholder="Computer Science" />
            <Input label="GPA" type="number" step="0.01" value={editing.gpa ?? ''} onChange={e => set('gpa', e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="3.8" />
            <Input label="Start Date" type="date" value={editing.start_date} onChange={e => set('start_date', e.target.value)} />
            <Input label="End Date" type="date" value={editing.end_date || ''} onChange={e => set('end_date', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Achievements / Honors</label>
            <div className="flex gap-2">
              <input className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" value={achievementInput} onChange={e => setAchievementInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAchievement())} placeholder="Dean's List, Honors, etc." />
              <Button size="sm" variant="secondary" onClick={addAchievement}>Add</Button>
            </div>
            <ul className="mt-2 space-y-1">
              {editing.achievements.map((a, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-slate-700 bg-white rounded px-2 py-1 border border-slate-100">
                  <span className="flex-1">{a}</span>
                  <button onClick={() => removeAchievement(i)} className="text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={cancel}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{isNew ? 'Add Education' : 'Update'}</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className="flex items-start justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50 transition-colors">
            <div>
              <div className="font-medium text-slate-800">{item.degree} in {item.field}</div>
              <div className="text-sm text-slate-500">{item.institution}{item.gpa ? ` · GPA: ${item.gpa}` : ''}</div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => startEdit(item)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(item.id!)} className="p-1.5 text-slate-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && !editing && <p className="text-sm text-slate-400 text-center py-4">No education added yet</p>}
      </div>
    </Card>
  );
}
