import type { ResumeGenerateResponse } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { getResumeDownloadUrl } from '../../services/api';
import { Download, Clock, Cpu } from 'lucide-react';

interface ResumePreviewProps {
  data: ResumeGenerateResponse;
}

export function ResumePreview({ data }: ResumePreviewProps) {
  const { tailored_resume: r } = data;

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
        <a href={getResumeDownloadUrl(data.id)} download>
          <Button><Download className="w-4 h-4" /> Download PDF</Button>
        </a>
      </div>

      <Card className="max-w-3xl mx-auto !p-8 font-serif">
        {/* Summary */}
        {r.professional_summary && (
          <div className="mb-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200 pb-1 mb-2">Professional Summary</h3>
            <p className="text-sm text-slate-700 leading-relaxed">{r.professional_summary}</p>
          </div>
        )}

        {/* Experience */}
        {r.experiences.length > 0 && (
          <div className="mb-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200 pb-1 mb-2">Experience</h3>
            {r.experiences.map((exp, i) => (
              <div key={i} className="mb-3">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold text-sm text-slate-800">{exp.title}</span>
                  <span className="text-xs text-slate-500">{exp.start_date} – {exp.is_current ? 'Present' : exp.end_date}</span>
                </div>
                <div className="text-sm text-slate-600 italic">{exp.company}</div>
                <ul className="mt-1 ml-4 list-disc text-sm text-slate-700 space-y-0.5">
                  {exp.bullets.map((b, j) => <li key={j}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Education */}
        {r.education.length > 0 && (
          <div className="mb-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200 pb-1 mb-2">Education</h3>
            {r.education.map((edu, i) => (
              <div key={i} className="mb-2">
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
              </div>
            ))}
          </div>
        )}

        {/* Skills */}
        {r.skills.length > 0 && (
          <div className="mb-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200 pb-1 mb-2">Skills</h3>
            <p className="text-sm text-slate-700">{r.skills.join('  ·  ')}</p>
          </div>
        )}

        {/* Projects */}
        {r.projects.length > 0 && (
          <div className="mb-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200 pb-1 mb-2">Projects</h3>
            {r.projects.map((proj, i) => (
              <div key={i} className="mb-2">
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
              </div>
            ))}
          </div>
        )}

        {/* Certifications */}
        {r.certifications.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200 pb-1 mb-2">Certifications</h3>
            <ul className="text-sm text-slate-700 space-y-0.5">
              {r.certifications.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}
