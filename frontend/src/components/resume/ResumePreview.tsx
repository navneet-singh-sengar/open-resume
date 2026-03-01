import { useState } from 'react';
import type { ResumeGenerateResponse, TailoredResume, TailoredExperience, TailoredEducation, TailoredProject } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { getResumeDownloadUrl, updateResume } from '../../services/api';
import { Download, Clock, Cpu, Pencil, Save, X, Plus, Trash2 } from 'lucide-react';

interface ResumePreviewProps {
  data: ResumeGenerateResponse;
  onUpdated?: (updated: ResumeGenerateResponse) => void;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function ResumePreview({ data, onUpdated }: ResumePreviewProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<TailoredResume>(() => deepClone(data.tailored_resume));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const r = editing ? draft : data.tailored_resume;

  const startEdit = () => {
    setDraft(deepClone(data.tailored_resume));
    setEditing(true);
    setError('');
  };

  const cancelEdit = () => {
    setEditing(false);
    setError('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await updateResume(data.id, draft);
      onUpdated?.(updated);
      setEditing(false);
    } catch {
      setError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateExp = (idx: number, patch: Partial<TailoredExperience>) => {
    setDraft(d => ({
      ...d,
      experiences: d.experiences.map((e, i) => i === idx ? { ...e, ...patch } : e),
    }));
  };

  const updateEdu = (idx: number, patch: Partial<TailoredEducation>) => {
    setDraft(d => ({
      ...d,
      education: d.education.map((e, i) => i === idx ? { ...e, ...patch } : e),
    }));
  };

  const updateProj = (idx: number, patch: Partial<TailoredProject>) => {
    setDraft(d => ({
      ...d,
      projects: d.projects.map((p, i) => i === idx ? { ...p, ...patch } : p),
    }));
  };

  const inputCls = 'w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-slate-400';
  const textareaCls = `${inputCls} resize-y`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            {data.job_title}{data.company ? ` at ${data.company}` : ''}
          </h2>
          <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
            <span className="flex items-center gap-1"><Cpu className="w-3.5 h-3.5" /> {data.ai_model_used}</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(data.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="ghost" onClick={cancelEdit} disabled={saving}>
                <X className="w-4 h-4" /> Cancel
              </Button>
              <Button onClick={handleSave} loading={saving}>
                <Save className="w-4 h-4" /> Save & Regenerate PDF
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={startEdit}>
                <Pencil className="w-4 h-4" /> Edit
              </Button>
              <a href={getResumeDownloadUrl(data.id)} download>
                <Button><Download className="w-4 h-4" /> Download PDF</Button>
              </a>
            </>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card className={`max-w-3xl mx-auto !p-8 font-serif transition-colors ${editing ? 'ring-2 ring-amber-300' : ''}`}>

        {/* Summary */}
        {(r.professional_summary || editing) && (
          <div className="mb-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200 pb-1 mb-2">Professional Summary</h3>
            {editing ? (
              <textarea
                className={textareaCls}
                rows={4}
                value={draft.professional_summary}
                onChange={e => setDraft(d => ({ ...d, professional_summary: e.target.value }))}
              />
            ) : (
              <p className="text-sm text-slate-700 leading-relaxed">{r.professional_summary}</p>
            )}
          </div>
        )}

        {/* Experience */}
        {(r.experiences.length > 0 || editing) && (
          <div className="mb-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200 pb-1 mb-2">Experience</h3>
            {r.experiences.map((exp, i) => (
              <div key={i} className="mb-3">
                {editing ? (
                  <>
                    <div className="flex gap-2 mb-1">
                      <input className={`${inputCls} font-semibold`} value={exp.title} onChange={e => updateExp(i, { title: e.target.value })} placeholder="Title" />
                      <input className={`${inputCls} w-48`} value={exp.start_date} onChange={e => updateExp(i, { start_date: e.target.value })} placeholder="Start" />
                      <span className="self-center text-slate-400">-</span>
                      <input className={`${inputCls} w-48`} value={exp.is_current ? 'Present' : (exp.end_date || '')} onChange={e => {
                        const v = e.target.value;
                        if (v.toLowerCase() === 'present') updateExp(i, { is_current: true, end_date: undefined });
                        else updateExp(i, { is_current: false, end_date: v });
                      }} placeholder="End / Present" />
                    </div>
                    <input className={`${inputCls} italic mb-1`} value={exp.company} onChange={e => updateExp(i, { company: e.target.value })} placeholder="Company" />
                    <div className="ml-4 space-y-1 mt-1">
                      {exp.bullets.map((b, j) => (
                        <div key={j} className="flex items-start gap-1">
                          <span className="text-slate-400 mt-1.5 text-xs">-</span>
                          <input className={`${inputCls} flex-1`} value={b} onChange={e => {
                            const bullets = [...exp.bullets];
                            bullets[j] = e.target.value;
                            updateExp(i, { bullets });
                          }} />
                          <button onClick={() => updateExp(i, { bullets: exp.bullets.filter((_, k) => k !== j) })} className="text-red-400 hover:text-red-600 p-0.5 mt-0.5" title="Remove bullet">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => updateExp(i, { bullets: [...exp.bullets, ''] })} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-1">
                        <Plus className="w-3 h-3" /> Add bullet
                      </button>
                    </div>
                    <button onClick={() => setDraft(d => ({ ...d, experiences: d.experiences.filter((_, k) => k !== i) }))} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 mt-1">
                      <Trash2 className="w-3 h-3" /> Remove experience
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-baseline">
                      <span className="font-semibold text-sm text-slate-800">{exp.title}</span>
                      <span className="text-xs text-slate-500">{exp.start_date} – {exp.is_current ? 'Present' : exp.end_date}</span>
                    </div>
                    <div className="text-sm text-slate-600 italic">{exp.company}</div>
                    <ul className="mt-1 ml-4 list-disc text-sm text-slate-700 space-y-0.5">
                      {exp.bullets.map((b, j) => <li key={j}>{b}</li>)}
                    </ul>
                  </>
                )}
              </div>
            ))}
            {editing && (
              <button onClick={() => setDraft(d => ({ ...d, experiences: [...d.experiences, { title: '', company: '', start_date: '', end_date: '', is_current: false, bullets: [''] }] }))} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                <Plus className="w-3 h-3" /> Add experience
              </button>
            )}
          </div>
        )}

        {/* Education */}
        {(r.education.length > 0 || editing) && (
          <div className="mb-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200 pb-1 mb-2">Education</h3>
            {r.education.map((edu, i) => (
              <div key={i} className="mb-2">
                {editing ? (
                  <>
                    <div className="flex gap-2 mb-1">
                      <input className={`${inputCls} font-semibold`} value={edu.degree} onChange={e => updateEdu(i, { degree: e.target.value })} placeholder="Degree" />
                      <span className="self-center text-slate-400 text-sm">in</span>
                      <input className={inputCls} value={edu.field} onChange={e => updateEdu(i, { field: e.target.value })} placeholder="Field" />
                      <input className={`${inputCls} w-32`} value={edu.end_date || ''} onChange={e => updateEdu(i, { end_date: e.target.value || undefined })} placeholder="End date" />
                    </div>
                    <div className="flex gap-2 mb-1">
                      <input className={`${inputCls} italic`} value={edu.institution} onChange={e => updateEdu(i, { institution: e.target.value })} placeholder="Institution" />
                      <input className={`${inputCls} w-24`} type="number" step="0.01" value={edu.gpa ?? ''} onChange={e => updateEdu(i, { gpa: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="GPA" />
                    </div>
                    <div className="ml-4 space-y-1 mt-1">
                      {edu.highlights.map((h, j) => (
                        <div key={j} className="flex items-start gap-1">
                          <span className="text-slate-400 mt-1.5 text-xs">-</span>
                          <input className={`${inputCls} flex-1`} value={h} onChange={e => {
                            const highlights = [...edu.highlights];
                            highlights[j] = e.target.value;
                            updateEdu(i, { highlights });
                          }} />
                          <button onClick={() => updateEdu(i, { highlights: edu.highlights.filter((_, k) => k !== j) })} className="text-red-400 hover:text-red-600 p-0.5 mt-0.5">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => updateEdu(i, { highlights: [...edu.highlights, ''] })} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-1">
                        <Plus className="w-3 h-3" /> Add highlight
                      </button>
                    </div>
                    <button onClick={() => setDraft(d => ({ ...d, education: d.education.filter((_, k) => k !== i) }))} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 mt-1">
                      <Trash2 className="w-3 h-3" /> Remove education
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-baseline">
                      <span className="font-semibold text-sm text-slate-800">{edu.degree} in {edu.field}</span>
                      <span className="text-xs text-slate-500">{edu.end_date}</span>
                    </div>
                    <div className="text-sm text-slate-600 italic">{edu.institution}{edu.gpa ? ` · GPA: ${edu.gpa}` : ''}</div>
                    {edu.highlights.length > 0 && (
                      <ul className="mt-1 ml-4 list-disc text-sm text-slate-700 space-y-0.5">
                        {edu.highlights.map((h, j) => <li key={j}>{h}</li>)}
                      </ul>
                    )}
                  </>
                )}
              </div>
            ))}
            {editing && (
              <button onClick={() => setDraft(d => ({ ...d, education: [...d.education, { institution: '', degree: '', field: '', end_date: '', highlights: [] }] }))} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                <Plus className="w-3 h-3" /> Add education
              </button>
            )}
          </div>
        )}

        {/* Skills */}
        {(r.skills.length > 0 || editing) && (
          <div className="mb-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200 pb-1 mb-2">Skills</h3>
            {editing ? (
              <div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {draft.skills.map((skill, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-md">
                      {skill}
                      <button onClick={() => setDraft(d => ({ ...d, skills: d.skills.filter((_, k) => k !== i) }))} className="text-slate-400 hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className={`${inputCls} flex-1`}
                    placeholder="Type a skill and press Enter"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val && !draft.skills.includes(val)) {
                          setDraft(d => ({ ...d, skills: [...d.skills, val] }));
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-700">{r.skills.join('  ·  ')}</p>
            )}
          </div>
        )}

        {/* Projects */}
        {(r.projects.length > 0 || editing) && (
          <div className="mb-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200 pb-1 mb-2">Projects</h3>
            {r.projects.map((proj, i) => (
              <div key={i} className="mb-2">
                {editing ? (
                  <>
                    <input className={`${inputCls} font-semibold mb-1`} value={proj.name} onChange={e => updateProj(i, { name: e.target.value })} placeholder="Project name" />
                    <input className={`${inputCls} italic text-xs mb-1`} value={proj.technologies.join(', ')} onChange={e => updateProj(i, { technologies: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} placeholder="Technologies (comma-separated)" />
                    <textarea className={`${textareaCls} mb-1`} rows={2} value={proj.description} onChange={e => updateProj(i, { description: e.target.value })} placeholder="Description" />
                    <div className="ml-4 space-y-1">
                      {proj.highlights.map((h, j) => (
                        <div key={j} className="flex items-start gap-1">
                          <span className="text-slate-400 mt-1.5 text-xs">-</span>
                          <input className={`${inputCls} flex-1`} value={h} onChange={e => {
                            const highlights = [...proj.highlights];
                            highlights[j] = e.target.value;
                            updateProj(i, { highlights });
                          }} />
                          <button onClick={() => updateProj(i, { highlights: proj.highlights.filter((_, k) => k !== j) })} className="text-red-400 hover:text-red-600 p-0.5 mt-0.5">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => updateProj(i, { highlights: [...proj.highlights, ''] })} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-1">
                        <Plus className="w-3 h-3" /> Add highlight
                      </button>
                    </div>
                    <button onClick={() => setDraft(d => ({ ...d, projects: d.projects.filter((_, k) => k !== i) }))} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 mt-1">
                      <Trash2 className="w-3 h-3" /> Remove project
                    </button>
                  </>
                ) : (
                  <>
                    <div className="font-semibold text-sm text-slate-800">{proj.name}</div>
                    {proj.technologies.length > 0 && (
                      <div className="text-xs text-slate-500 italic">{proj.technologies.join(', ')}</div>
                    )}
                    <p className="text-sm text-slate-700 mt-0.5">{proj.description}</p>
                    {proj.highlights.length > 0 && (
                      <ul className="mt-1 ml-4 list-disc text-sm text-slate-700 space-y-0.5">
                        {proj.highlights.map((h, j) => <li key={j}>{h}</li>)}
                      </ul>
                    )}
                  </>
                )}
              </div>
            ))}
            {editing && (
              <button onClick={() => setDraft(d => ({ ...d, projects: [...d.projects, { name: '', description: '', technologies: [], highlights: [''] }] }))} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                <Plus className="w-3 h-3" /> Add project
              </button>
            )}
          </div>
        )}

        {/* Certifications */}
        {(r.certifications.length > 0 || editing) && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200 pb-1 mb-2">Certifications</h3>
            {editing ? (
              <div className="space-y-1">
                {draft.certifications.map((c, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <input className={`${inputCls} flex-1`} value={c} onChange={e => {
                      const certs = [...draft.certifications];
                      certs[i] = e.target.value;
                      setDraft(d => ({ ...d, certifications: certs }));
                    }} />
                    <button onClick={() => setDraft(d => ({ ...d, certifications: d.certifications.filter((_, k) => k !== i) }))} className="text-red-400 hover:text-red-600 p-0.5">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button onClick={() => setDraft(d => ({ ...d, certifications: [...d.certifications, ''] }))} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-1">
                  <Plus className="w-3 h-3" /> Add certification
                </button>
              </div>
            ) : (
              <ul className="text-sm text-slate-700 space-y-0.5">
                {r.certifications.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
