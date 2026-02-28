import { useState, useEffect } from 'react';
import { Input } from '../ui/Input';
import { TextArea } from '../ui/TextArea';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { getPersonalInfo, upsertPersonalInfo } from '../../services/api';
import type { PersonalInfo } from '../../types';

const EMPTY: PersonalInfo = {
  name: '', email: '', phone: '', location: '',
  linkedin: '', github: '', portfolio: '', summary: '',
};

export function PersonalInfoForm() {
  const [form, setForm] = useState<PersonalInfo>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getPersonalInfo().then(data => {
      if (data) setForm(data);
    });
  }, []);

  const set = (field: keyof PersonalInfo, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const result = await upsertPersonalInfo(form);
      setForm(result);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
        {saved && <span className="text-sm text-emerald-600 font-medium">Saved</span>}
      </CardHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Full Name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="John Doe" required />
        <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@example.com" required />
        <Input label="Phone" value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="+1 (555) 123-4567" />
        <Input label="Location" value={form.location || ''} onChange={e => set('location', e.target.value)} placeholder="San Francisco, CA" />
        <Input label="LinkedIn" value={form.linkedin || ''} onChange={e => set('linkedin', e.target.value)} placeholder="https://linkedin.com/in/johndoe" />
        <Input label="GitHub" value={form.github || ''} onChange={e => set('github', e.target.value)} placeholder="https://github.com/johndoe" />
        <Input label="Portfolio" value={form.portfolio || ''} onChange={e => set('portfolio', e.target.value)} placeholder="https://johndoe.dev" />
      </div>
      <div className="mt-4">
        <TextArea label="Professional Summary" value={form.summary || ''} onChange={e => set('summary', e.target.value)} rows={3} placeholder="Brief professional summary..." />
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={handleSave} loading={saving}>Save Personal Info</Button>
      </div>
    </Card>
  );
}
