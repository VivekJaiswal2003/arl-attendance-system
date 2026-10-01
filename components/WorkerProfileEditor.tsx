"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";

type EducationItem = {
  id?: string;
  degree: string;
  fieldOfStudy?: string | null;
  institution: string;
  startYear?: number | null;
  endYear?: number | null;
  grade?: string | null;
  description?: string | null;
};

type ExperienceItem = {
  id?: string;
  companyName: string;
  jobTitle: string;
  employmentType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  currentlyWorking?: boolean;
  location?: string | null;
  description?: string | null;
};

type SkillItem = {
  id?: string;
  skillName: string;
  skillLevel?: string | null;
};

type ResumeItem = {
  id?: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  storedPath?: string;
};

type WorkerProfileData = {
  id: string;
  workerId: string;
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  dateOfBirth?: string | null;
  professionalSummary?: string | null;
  currentJobTitle?: string | null;
  totalExperience?: string | null;
  expectedSalary?: string | null;
  preferredLocation?: string | null;
  linkedIn?: string | null;
  github?: string | null;
  portfolio?: string | null;
  resumeUrl?: string | null;
  profileCompletionPercentage: number;
  educations: EducationItem[];
  experiences: ExperienceItem[];
  skills: SkillItem[];
  resumes: ResumeItem[];
};

export function WorkerProfileEditor({ initialWorker }: { initialWorker: WorkerProfileData }) {
  const [worker, setWorker] = useState(initialWorker);
  const [educationDraft, setEducationDraft] = useState<EducationItem>({ degree: "", institution: "", fieldOfStudy: "", grade: "", description: "" });
  const [experienceDraft, setExperienceDraft] = useState<ExperienceItem>({ companyName: "", jobTitle: "", employmentType: "", location: "", description: "", currentlyWorking: false });
  const [skillDraft, setSkillDraft] = useState({ skillName: "", skillLevel: "" });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("Ready");
  const [error, setError] = useState<string>("");

  const workerSummary = useMemo(() => {
    const values = [
      worker.firstName,
      worker.lastName,
      worker.email,
      worker.phone,
      worker.address,
      worker.professionalSummary,
      worker.currentJobTitle,
      worker.totalExperience,
      worker.expectedSalary,
      worker.preferredLocation,
      worker.linkedIn,
      worker.github,
      worker.portfolio,
      worker.resumeUrl,
    ];
    const filled = values.filter((value) => typeof value === "string" && value.trim().length > 0).length;
    return Math.min(100, Math.max(0, Math.round((filled / values.length) * 100)));
  }, [worker]);

  async function updateWorkerProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Updating profile...");
    setError("");

    try {
      const response = await fetch("/api/worker/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: worker.firstName ?? "",
          lastName: worker.lastName ?? "",
          email: worker.email ?? "",
          phone: worker.phone ?? "",
          address: worker.address ?? "",
          dateOfBirth: worker.dateOfBirth ?? "",
          professionalSummary: worker.professionalSummary ?? "",
          currentJobTitle: worker.currentJobTitle ?? "",
          totalExperience: worker.totalExperience ?? "",
          expectedSalary: worker.expectedSalary ?? "",
          preferredLocation: worker.preferredLocation ?? "",
          linkedIn: worker.linkedIn ?? "",
          github: worker.github ?? "",
          portfolio: worker.portfolio ?? "",
          resumeUrl: worker.resumeUrl ?? "",
        }),
      });

      const result = await response.json() as { error?: string; worker?: WorkerProfileData };
      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save your profile.");
      }

      if (result.worker) {
        setWorker((current) => ({ ...current, ...result.worker }));
      }
      setStatus("Profile updated successfully.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to save your profile.");
      setStatus("Update failed");
    }
  }

  async function createEducation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Saving education...");
    try {
      const response = await fetch("/api/worker/profile/education", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          degree: educationDraft.degree,
          fieldOfStudy: educationDraft.fieldOfStudy,
          institution: educationDraft.institution,
          startYear: educationDraft.startYear,
          endYear: educationDraft.endYear,
          grade: educationDraft.grade,
          description: educationDraft.description,
        }),
      });
      const result = await response.json() as { error?: string; record?: EducationItem };
      if (!response.ok) throw new Error(result.error ?? "Unable to save education.");
      const record = result.record;
      if (record) {
        setWorker((current) => ({ ...current, educations: [record, ...current.educations] }));
      }
      setEducationDraft({ degree: "", institution: "", fieldOfStudy: "", grade: "", description: "" });
      setStatus("Education saved.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to save education.");
      setStatus("Education failed");
    }
  }

  async function deleteEducation(id?: string) {
    if (!id) return;
    const response = await fetch(`/api/worker/profile/education?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (response.ok) {
      setWorker((current) => ({ ...current, educations: current.educations.filter((item) => item.id !== id) }));
      setStatus("Education removed.");
    }
  }

  async function editEducation(item: EducationItem) {
    if (!item.id) return;
    const degree = window.prompt("Degree or course", item.degree);
    const institution = degree === null ? null : window.prompt("Institution", item.institution);
    if (degree === null || institution === null) return;
    const response = await fetch("/api/worker/profile/education", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...item, id: item.id, degree, institution }) });
    const result = await response.json() as { error?: string; record?: EducationItem };
    if (!response.ok || !result.record) {
      setError(result.error ?? "Unable to update education.");
      return;
    }
    setWorker((current) => ({ ...current, educations: current.educations.map((education) => education.id === item.id ? result.record as EducationItem : education) }));
    setStatus("Education updated.");
  }

  async function createExperience(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Saving experience...");
    try {
      const response = await fetch("/api/worker/profile/experience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: experienceDraft.companyName,
          jobTitle: experienceDraft.jobTitle,
          employmentType: experienceDraft.employmentType,
          startDate: experienceDraft.startDate,
          endDate: experienceDraft.endDate,
          currentlyWorking: experienceDraft.currentlyWorking,
          location: experienceDraft.location,
          description: experienceDraft.description,
        }),
      });
      const result = await response.json() as { error?: string; record?: ExperienceItem };
      if (!response.ok) throw new Error(result.error ?? "Unable to save work experience.");
      const record = result.record;
      if (record) {
        setWorker((current) => ({ ...current, experiences: [record, ...current.experiences] }));
      }
      setExperienceDraft({ companyName: "", jobTitle: "", employmentType: "", location: "", description: "", currentlyWorking: false });
      setStatus("Experience saved.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to save work experience.");
      setStatus("Experience failed");
    }
  }

  async function deleteExperience(id?: string) {
    if (!id) return;
    const response = await fetch(`/api/worker/profile/experience?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (response.ok) {
      setWorker((current) => ({ ...current, experiences: current.experiences.filter((item) => item.id !== id) }));
      setStatus("Experience removed.");
    }
  }

  async function editExperience(item: ExperienceItem) {
    if (!item.id) return;
    const jobTitle = window.prompt("Job title", item.jobTitle);
    const companyName = jobTitle === null ? null : window.prompt("Company", item.companyName);
    if (jobTitle === null || companyName === null) return;
    const response = await fetch("/api/worker/profile/experience", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...item, id: item.id, jobTitle, companyName }) });
    const result = await response.json() as { error?: string; record?: ExperienceItem };
    if (!response.ok || !result.record) {
      setError(result.error ?? "Unable to update work experience.");
      return;
    }
    setWorker((current) => ({ ...current, experiences: current.experiences.map((experience) => experience.id === item.id ? result.record as ExperienceItem : experience) }));
    setStatus("Work experience updated.");
  }

  async function createSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Saving skill...");
    try {
      const response = await fetch("/api/worker/profile/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillName: skillDraft.skillName, skillLevel: skillDraft.skillLevel }),
      });
      const result = await response.json() as { error?: string; record?: SkillItem };
      if (!response.ok) throw new Error(result.error ?? "Unable to save skill.");
      const record = result.record;
      if (record) {
        setWorker((current) => ({ ...current, skills: [record, ...current.skills] }));
      }
      setSkillDraft({ skillName: "", skillLevel: "" });
      setStatus("Skill saved.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to save skill.");
      setStatus("Skill failed");
    }
  }

  async function deleteSkill(id?: string) {
    if (!id) return;
    const response = await fetch(`/api/worker/profile/skills?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (response.ok) {
      setWorker((current) => ({ ...current, skills: current.skills.filter((item) => item.id !== id) }));
      setStatus("Skill removed.");
    }
  }

  async function uploadResume(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resumeFile) return;
    setStatus("Uploading resume...");
    try {
      const formData = new FormData();
      formData.append("resume", resumeFile);
      const response = await fetch("/api/worker/profile/resume", { method: "POST", body: formData });
      const result = await response.json() as { error?: string; resume?: ResumeItem };
      if (!response.ok) throw new Error(result.error ?? "Unable to upload resume.");
      const resume = result.resume;
      if (resume) {
        setWorker((current) => ({ ...current, resumes: [resume] }));
      }
      setResumeFile(null);
      setStatus("Resume uploaded.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to upload resume.");
      setStatus("Resume upload failed");
    }
  }

  return (
    <div className="profile-stack">
      <div className="profile-header-row">
        <div>
          <div className="eyebrow">Professional profile</div>
          <h1>{worker.fullName || "Worker profile"}</h1>
        </div>
        <div className="status-badge">{workerSummary}% complete</div>
      </div>

      {error && <div className="form-error-block">{error}</div>}
      {status && <div className="success-banner">{status}</div>}

      <form className="profile-form" onSubmit={updateWorkerProfile}>
        <div className="profile-form-grid">
          <label className="form-label">First Name<input className="form-input" value={worker.firstName ?? ""} onChange={(event) => setWorker({ ...worker, firstName: event.target.value })} /></label>
          <label className="form-label">Last Name<input className="form-input" value={worker.lastName ?? ""} onChange={(event) => setWorker({ ...worker, lastName: event.target.value })} /></label>
          <label className="form-label">Email<input className="form-input" type="email" value={worker.email ?? ""} readOnly /></label>
          <label className="form-label">Phone<input className="form-input" type="tel" value={worker.phone ?? ""} onChange={(event) => setWorker({ ...worker, phone: event.target.value })} /></label>
          <label className="form-label">Date of birth<input className="form-input" type="date" value={worker.dateOfBirth ?? ""} onChange={(event) => setWorker({ ...worker, dateOfBirth: event.target.value })} /></label>
          <label className="form-label" style={{ gridColumn: "1 / -1" }}>Professional Summary<textarea className="form-input" rows={4} value={worker.professionalSummary ?? ""} onChange={(event) => setWorker({ ...worker, professionalSummary: event.target.value })} /></label>
          <label className="form-label">Current Job Title<input className="form-input" value={worker.currentJobTitle ?? ""} onChange={(event) => setWorker({ ...worker, currentJobTitle: event.target.value })} /></label>
          <label className="form-label">Total Experience<input className="form-input" value={worker.totalExperience ?? ""} onChange={(event) => setWorker({ ...worker, totalExperience: event.target.value })} /></label>
          <label className="form-label">Expected Salary<input className="form-input" value={worker.expectedSalary ?? ""} onChange={(event) => setWorker({ ...worker, expectedSalary: event.target.value })} /></label>
          <label className="form-label">Preferred Location<input className="form-input" value={worker.preferredLocation ?? ""} onChange={(event) => setWorker({ ...worker, preferredLocation: event.target.value })} /></label>
          <label className="form-label">LinkedIn<input className="form-input" value={worker.linkedIn ?? ""} onChange={(event) => setWorker({ ...worker, linkedIn: event.target.value })} /></label>
          <label className="form-label">GitHub<input className="form-input" value={worker.github ?? ""} onChange={(event) => setWorker({ ...worker, github: event.target.value })} /></label>
          <label className="form-label">Portfolio<input className="form-input" value={worker.portfolio ?? ""} onChange={(event) => setWorker({ ...worker, portfolio: event.target.value })} /></label>
          <label className="form-label">Resume URL<input className="form-input" value={worker.resumeUrl ?? ""} onChange={(event) => setWorker({ ...worker, resumeUrl: event.target.value })} /></label>
          <label className="form-label">Address<input className="form-input" value={worker.address ?? ""} onChange={(event) => setWorker({ ...worker, address: event.target.value })} /></label>
        </div>
        <button className="button-primary" type="submit">Save profile</button>
      </form>

      <div className="profile-panel-block">
        <h3>Skills</h3>
        <form className="inline-form" onSubmit={createSkill}>
          <input className="form-input" placeholder="Skill name" value={skillDraft.skillName} onChange={(event) => setSkillDraft({ ...skillDraft, skillName: event.target.value })} />
          <input className="form-input" placeholder="Skill level" value={skillDraft.skillLevel ?? ""} onChange={(event) => setSkillDraft({ ...skillDraft, skillLevel: event.target.value })} />
          <button className="button-primary" type="submit">Add skill</button>
        </form>
        <div className="chip-row">{worker.skills.length === 0 ? <span className="muted">No skills added yet.</span> : worker.skills.map((skill) => <span key={skill.id ?? `${skill.skillName}-${Math.random()}`} className="chip-item">{skill.skillName} <button type="button" onClick={() => deleteSkill(skill.id)}>Remove</button></span>)}</div>
      </div>

      <div className="profile-panel-block">
        <h3>Education</h3>
        <form className="inline-form" onSubmit={createEducation}>
          <input className="form-input" placeholder="Degree" value={educationDraft.degree} onChange={(event) => setEducationDraft({ ...educationDraft, degree: event.target.value })} />
          <input className="form-input" placeholder="Field of study" value={educationDraft.fieldOfStudy ?? ""} onChange={(event) => setEducationDraft({ ...educationDraft, fieldOfStudy: event.target.value })} />
          <input className="form-input" placeholder="Institution" value={educationDraft.institution} onChange={(event) => setEducationDraft({ ...educationDraft, institution: event.target.value })} />
          <input className="form-input" type="number" placeholder="Start year" value={educationDraft.startYear ?? ""} onChange={(event) => setEducationDraft({ ...educationDraft, startYear: event.target.value ? Number(event.target.value) : null })} />
          <input className="form-input" type="number" placeholder="End year" value={educationDraft.endYear ?? ""} onChange={(event) => setEducationDraft({ ...educationDraft, endYear: event.target.value ? Number(event.target.value) : null })} />
          <button className="button-primary" type="submit">Add education</button>
        </form>
        <ul className="list-stack">{worker.educations.length === 0 ? <li className="muted">No education records saved.</li> : worker.educations.map((education) => <li key={education.id ?? `${education.degree}-${education.institution}`}><strong>{education.degree}</strong> - {education.institution}<span><button type="button" onClick={() => editEducation(education)}>Edit</button><button type="button" onClick={() => deleteEducation(education.id)}>Delete</button></span></li>)}</ul>
      </div>

      <div className="profile-panel-block">
        <h3>Work Experience</h3>
        <form className="inline-form" onSubmit={createExperience}>
          <input className="form-input" placeholder="Company name" value={experienceDraft.companyName} onChange={(event) => setExperienceDraft({ ...experienceDraft, companyName: event.target.value })} />
          <input className="form-input" placeholder="Job title" value={experienceDraft.jobTitle} onChange={(event) => setExperienceDraft({ ...experienceDraft, jobTitle: event.target.value })} />
          <input className="form-input" placeholder="Employment type" value={experienceDraft.employmentType ?? ""} onChange={(event) => setExperienceDraft({ ...experienceDraft, employmentType: event.target.value })} />
          <input className="form-input" type="date" value={experienceDraft.startDate ?? ""} onChange={(event) => setExperienceDraft({ ...experienceDraft, startDate: event.target.value })} />
          <input className="form-input" type="date" value={experienceDraft.endDate ?? ""} onChange={(event) => setExperienceDraft({ ...experienceDraft, endDate: event.target.value })} />
          <label className="checkbox-row"><input type="checkbox" checked={experienceDraft.currentlyWorking ?? false} onChange={(event) => setExperienceDraft({ ...experienceDraft, currentlyWorking: event.target.checked })} /> Currently working</label>
          <button className="button-primary" type="submit">Add experience</button>
        </form>
        <ul className="list-stack">{worker.experiences.length === 0 ? <li className="muted">No work experience saved.</li> : worker.experiences.map((experience) => <li key={experience.id ?? `${experience.companyName}-${experience.jobTitle}`}><strong>{experience.jobTitle}</strong> @ {experience.companyName}<span><button type="button" onClick={() => editExperience(experience)}>Edit</button><button type="button" onClick={() => deleteExperience(experience.id)}>Delete</button></span></li>)}</ul>
      </div>

      <div className="profile-panel-block">
        <h3>Resume</h3>
        <form className="inline-form" onSubmit={uploadResume}>
          <input className="form-input" type="file" accept=".pdf,.doc,.docx" onChange={(event) => setResumeFile(event.target.files?.[0] ?? null)} />
          <button className="button-primary" type="submit" disabled={!resumeFile}>Upload resume</button>
        </form>
        <ul className="list-stack">{worker.resumes.length === 0 ? <li className="muted">No resume uploaded.</li> : worker.resumes.map((resume) => <li key={resume.id ?? resume.fileName}><span><a className="text-link" href={`/api/worker/profile/resume?id=${encodeURIComponent(resume.id ?? "")}`} target="_blank" rel="noreferrer">{resume.fileName}</a></span><button type="button" onClick={() => fetch(`/api/worker/profile/resume?id=${encodeURIComponent(resume.id ?? "")}`, { method: "DELETE" }).then(() => setWorker((current) => ({ ...current, resumes: current.resumes.filter((item) => item.id !== resume.id) })))}>Delete</button></li>)}</ul>
      </div>
    </div>
  );
}
