import { useState, useEffect } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { listCertifications, createCertification, updateCertification, deleteCertification } from '../../services/api';
import type { Certification } from '../../types';
import { Trash2, Plus, Pencil } from 'lucide-react';

const EMPTY: Certification = { name: '', issuer: '', date: '', url: '' };

export function CertificationsForm() {
  const [items, setItems] = useState<Certification[]>([]);
  const [editing, setEditing] = useState<Certification | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => listCertifications().then(setItems);
  useEffect(() => { load(); }, []);

  const startNew = () => { setEditing({ ...EMPTY }); setIsNew(true); };
  const startEdit = (item: Certification) => { setEditing({ ...item }); setIsNew(false); };
  const cancel = () => { setEditing(null); setIsNew(false); };

  const set = (field: keyof Certification, value: string) =>
    setEditing(prev => prev ? { ...prev, [field]: value } : null);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (isNew) await createCertification(editing);
      else await updateCertification(editing.id!, editing);
      cancel();
      await load();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => { await deleteCertification(id); await load(); };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Certifications</CardTitle>
        {!editing && <Button size="sm" onClick={startNew}><Plus className="w-4 h-4" /> Add</Button>}
      </CardHeader>

      {editing && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label="Certification Name" value={editing.name} onChange={e => set('name', e.target.value)} placeholder="AWS Solutions Architect" />
            <Input label="Issuer" value={editing.issuer} onChange={e => set('issuer', e.target.value)} placeholder="Amazon Web Services" />
            <Input label="Date" type="date" value={editing.date || ''} onChange={e => set('date', e.target.value)} />
            <Input label="URL" value={editing.url || ''} onChange={e => set('url', e.target.value)} placeholder="https://..." />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={cancel}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{isNew ? 'Add Certification' : 'Update'}</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className="flex items-start justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50 transition-colors">
            <div>
              <div className="font-medium text-slate-800">{item.name}</div>
              <div className="text-sm text-slate-500">{item.issuer}{item.date ? ` · ${item.date}` : ''}</div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => startEdit(item)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(item.id!)} className="p-1.5 text-slate-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && !editing && <p className="text-sm text-slate-400 text-center py-4">No certifications added yet</p>}
      </div>
    </Card>
  );
}
