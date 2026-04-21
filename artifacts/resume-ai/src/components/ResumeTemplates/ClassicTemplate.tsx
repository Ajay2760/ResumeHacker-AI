import type { TailoredResumeResult } from "@workspace/api-client-react";

interface Props {
  data: TailoredResumeResult;
}

export default function ClassicTemplate({ data }: Props) {
  const { personalInfo, professionalSummary, skills, experience, education } = data;

  return (
    <div className="resume-template classic-template" id="resume-print-area">
      {/* Header */}
      <header className="classic-header">
        <h1 className="classic-name">{personalInfo.name || "Your Name"}</h1>
        <div className="classic-contact">
          {[
            personalInfo.email,
            personalInfo.phone,
            personalInfo.location,
            personalInfo.linkedin,
            personalInfo.github,
          ]
            .filter(Boolean)
            .join("  |  ")}
        </div>
      </header>

      <hr className="classic-divider" />

      {/* Professional Summary */}
      {professionalSummary && (
        <section className="classic-section">
          <h2 className="classic-section-title">PROFESSIONAL SUMMARY</h2>
          <p className="classic-summary">{professionalSummary}</p>
        </section>
      )}

      {/* Experience */}
      {experience && experience.length > 0 && (
        <section className="classic-section">
          <h2 className="classic-section-title">PROFESSIONAL EXPERIENCE</h2>
          {experience.map((exp, i) => (
            <div key={i} className="classic-exp-item">
              <div className="classic-exp-header">
                <div>
                  <strong className="classic-exp-role">{exp.role}</strong>
                  <span className="classic-exp-company"> — {exp.company}{exp.location ? `, ${exp.location}` : ""}</span>
                </div>
                <span className="classic-exp-duration">{exp.duration}</span>
              </div>
              <ul className="classic-exp-bullets">
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
        <section className="classic-section">
          <h2 className="classic-section-title">EDUCATION</h2>
          {education.map((edu, i) => (
            <div key={i} className="classic-edu-item">
              <div className="classic-exp-header">
                <div>
                  <strong>{edu.degree}</strong>
                  <span className="classic-exp-company"> — {edu.institution}</span>
                </div>
                {edu.duration && <span className="classic-exp-duration">{edu.duration}</span>}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Skills */}
      {skills && skills.length > 0 && (
        <section className="classic-section">
          <h2 className="classic-section-title">SKILLS</h2>
          <p className="classic-skills">{skills.join("  ·  ")}</p>
        </section>
      )}
    </div>
  );
}
