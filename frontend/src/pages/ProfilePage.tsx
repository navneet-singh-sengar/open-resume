import { useState } from 'react';
import { ResumeImportWidget } from '../components/profile/ResumeImportWidget';
import { PersonalInfoForm } from '../components/profile/PersonalInfoForm';
import { ExperienceForm } from '../components/profile/ExperienceForm';
import { EducationForm } from '../components/profile/EducationForm';
import { SkillsForm } from '../components/profile/SkillsForm';
import { ProjectsForm } from '../components/profile/ProjectsForm';
import { CertificationsForm } from '../components/profile/CertificationsForm';

export function ProfilePage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleImported = () => {
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Your Profile</h1>
        <p className="text-sm text-slate-500 mt-1">
          Add all your professional details. This data will be used to generate tailored resumes.
        </p>
      </div>
      <ResumeImportWidget onImported={handleImported} />
      <div key={refreshKey} className="space-y-6">
        <PersonalInfoForm />
        <ExperienceForm />
        <EducationForm />
        <SkillsForm />
        <ProjectsForm />
        <CertificationsForm />
      </div>
    </div>
  );
}
