import { useState } from 'react';
import { JobInput } from '../components/job/JobInput';
import { ResumePreview } from '../components/resume/ResumePreview';
import type { ResumeGenerateResponse } from '../types';

export function GeneratePage() {
  const [result, setResult] = useState<ResumeGenerateResponse | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Generate Resume</h1>
        <p className="text-sm text-slate-500 mt-1">
          Paste a job description or provide a URL to generate an ATS-optimized resume tailored to the role.
        </p>
      </div>

      <JobInput onGenerated={setResult} />

      {result && <ResumePreview data={result} />}
    </div>
  );
}
