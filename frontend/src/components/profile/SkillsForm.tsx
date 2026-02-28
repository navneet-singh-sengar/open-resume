import { useState, useEffect } from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { listSkills, createSkill, deleteSkill } from '../../services/api';
import type { Skill } from '../../types';
import { Plus } from 'lucide-react';

const CATEGORIES = [
  { value: 'technical', label: 'Technical' },
  { value: 'tool', label: 'Tool / Framework' },
  { value: 'language', label: 'Programming Language' },
  { value: 'soft', label: 'Soft Skill' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
  technical: 'info',
  tool: 'success',
  language: 'warning',
  soft: 'default',
  other: 'default',
};

export function SkillsForm() {
  const [items, setItems] = useState<Skill[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('technical');
  const [proficiency, setProficiency] = useState(3);
  const [adding, setAdding] = useState(false);

  const load = () => listSkills().then(setItems);
  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setAdding(true);
    try {
      await createSkill({ name: name.trim(), category, proficiency_level: proficiency });
      setName('');
      await load();
    } finally { setAdding(false); }
  };

  const handleDelete = async (id: number) => { await deleteSkill(id); await load(); };

  const grouped = items.reduce<Record<string, Skill[]>>((acc, s) => {
    (acc[s.category] = acc[s.category] || []).push(s);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Skills</CardTitle>
      </CardHeader>

      <div className="flex flex-wrap gap-2 items-end mb-4">
        <div className="flex-1 min-w-[150px]">
          <Input label="Skill Name" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="React, Python, etc." />
        </div>
        <div className="w-44">
          <Select label="Category" value={category} onChange={e => setCategory(e.target.value)} options={CATEGORIES} />
        </div>
        <div className="w-24">
          <Input label="Level (1-5)" type="number" min={1} max={5} value={proficiency} onChange={e => setProficiency(parseInt(e.target.value) || 3)} />
        </div>
        <Button size="md" onClick={handleAdd} loading={adding}><Plus className="w-4 h-4" /> Add</Button>
      </div>

      {Object.entries(grouped).map(([cat, skills]) => (
        <div key={cat} className="mb-3">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            {CATEGORIES.find(c => c.value === cat)?.label || cat}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {skills.map(s => (
              <Badge key={s.id} variant={CATEGORY_VARIANT[s.category] || 'default'} onRemove={() => handleDelete(s.id!)}>
                {s.name}
              </Badge>
            ))}
          </div>
        </div>
      ))}

      {items.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No skills added yet</p>}
    </Card>
  );
}
