import type { TailoredResumeResult } from "@workspace/api-client-react";

interface Props {
  data: TailoredResumeResult;
}

export default function MinimalTemplate({ data }: Props) {
  const { personalInfo, professionalSummary, skills, experience, education, projects, certifications, additionalSections } = data;

  return (
    <div className="resume-template minimal-template" id="resume-print-area">
      {/* Header */}
      <header className="minimal-header">
        <h1 className="minimal-name">{personalInfo.name || "Your Name"}</h1>
        <div className="minimal-contact">
          {[
            personalInfo.email,
            personalInfo.phone,
            personalInfo.location,
            personalInfo.linkedin,
            personalInfo.github,
          ]
            .filter(Boolean)
            .map((item, i, arr) => (
              <span key={i}>
                {item}{i < arr.length - 1 ? <span className="minimal-sep"> | </span> : ""}
              </span>
            ))}
        </div>
      </header>

      {/* Professional Summary */}
      {professionalSummary && (
        <section className="minimal-section">
          <h2 className="minimal-section-title">Summary</h2>
          <p className="minimal-body">{professionalSummary}</p>
        </section>
      )}

      {/* Skills */}
      {skills && skills.length > 0 && (
        <section className="minimal-section">
          <h2 className="minimal-section-title">Technical Skills</h2>
          <p className="minimal-body">{skills.join(", ")}</p>
        </section>
      )}

      {/* Experience */}
      {experience && experience.length > 0 && (
        <section className="minimal-section">
          <h2 className="minimal-section-title">Experience</h2>
          {experience.map((exp, i) => (
            <div key={i} className="minimal-exp-item">
              <div className="minimal-exp-header">
                <span>
                  <strong>{exp.role}</strong> — {exp.company}{exp.location ? `, ${exp.location}` : ""}
                </span>
                <span className="minimal-exp-duration">{exp.duration}</span>
              </div>
              <ul className="minimal-exp-bullets">
                {exp.bullets.map((bullet, j) => (
                  <li key={j}>{bullet}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {/* Education */}
      {education && education.length > 0 && (
        <section className="minimal-section">
          <h2 className="minimal-section-title">Education</h2>
          {education.map((edu, i) => (
            <div key={i} className="minimal-exp-item">
              <div className="minimal-exp-header">
                <span><strong>{edu.degree}</strong> — {edu.institution}</span>
                {edu.duration && <span className="minimal-exp-duration">{edu.duration}</span>}
              </div>
            </div>
          ))}
        </section>
      )}
      {/* Projects */}
      {projects && projects.length > 0 && (
        <section className="minimal-section">
          <h2 className="minimal-section-title">Projects</h2>
          {projects.map((proj, i) => (
            <div key={i} className="minimal-exp-item">
              <div className="minimal-exp-header">
                <span>
                  <strong>{proj.name}</strong>
                  {proj.technologies && ` — ${proj.technologies}`}
                </span>
                {proj.duration && <span className="minimal-exp-duration">{proj.duration}</span>}
              </div>
              <ul className="minimal-exp-bullets">
                {proj.bullets.map((bullet, j) => (
                  <li key={j}>{bullet}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {/* Certifications */}
      {certifications && certifications.length > 0 && (
        <section className="minimal-section">
          <h2 className="minimal-section-title">Certifications</h2>
          <ul className="minimal-exp-bullets" style={{ listStyleType: "none", paddingLeft: 0 }}>
            {certifications.map((cert, i) => (
              <li key={i} style={{ marginBottom: "4px" }}>
                <strong>{cert.name}</strong>
                {cert.issuer && ` — ${cert.issuer}`}
                {cert.date && ` (${cert.date})`}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Additional Sections */}
      {additionalSections && additionalSections.length > 0 && additionalSections.map((section, i) => (
        <section key={i} className="minimal-section">
          <h2 className="minimal-section-title">{section.sectionTitle}</h2>
          <ul className="minimal-exp-bullets">
            {section.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
