import type { TailoredResumeResult } from "@workspace/api-client-react";
import { Mail, Phone, MapPin, Linkedin, Github } from "lucide-react";

interface Props {
  data: TailoredResumeResult;
}

export default function ModernTemplate({ data }: Props) {
  const { personalInfo, professionalSummary, skills, experience, education, projects, certifications, additionalSections } = data;

  return (
    <div className="resume-template modern-template" id="resume-print-area">
      {/* Header */}
      <header className="modern-header">
        <h1 className="modern-name">{personalInfo.name || "Your Name"}</h1>
        <div className="modern-contact">
          {personalInfo.email && (
            <span className="modern-contact-item">
              <Mail className="modern-icon" /> {personalInfo.email}
            </span>
          )}
          {personalInfo.phone && (
            <span className="modern-contact-item">
              <Phone className="modern-icon" /> {personalInfo.phone}
            </span>
          )}
          {personalInfo.location && (
            <span className="modern-contact-item">
              <MapPin className="modern-icon" /> {personalInfo.location}
            </span>
          )}
          {personalInfo.linkedin && (
            <span className="modern-contact-item">
              <Linkedin className="modern-icon" /> {personalInfo.linkedin}
            </span>
          )}
          {personalInfo.github && (
            <span className="modern-contact-item">
              <Github className="modern-icon" /> {personalInfo.github}
            </span>
          )}
        </div>
      </header>

      {/* Professional Summary */}
      {professionalSummary && (
        <section className="modern-section">
          <h2 className="modern-section-title">Professional Summary</h2>
          <p className="modern-summary">{professionalSummary}</p>
        </section>
      )}

      {/* Skills */}
      {skills && skills.length > 0 && (
        <section className="modern-section">
          <h2 className="modern-section-title">Skills</h2>
          <div className="modern-skills">
            {skills.map((skill, i) => (
              <span key={i} className="modern-skill-tag">{skill}</span>
            ))}
          </div>
        </section>
      )}

      {/* Experience */}
      {experience && experience.length > 0 && (
        <section className="modern-section">
          <h2 className="modern-section-title">Experience</h2>
          {experience.map((exp, i) => (
            <div key={i} className="modern-exp-item">
              <div className="modern-exp-header">
                <div>
                  <h3 className="modern-exp-role">{exp.role}</h3>
                  <p className="modern-exp-company">{exp.company}{exp.location ? ` · ${exp.location}` : ""}</p>
                </div>
                <span className="modern-exp-duration">{exp.duration}</span>
              </div>
              <ul className="modern-exp-bullets">
                {exp.bullets.map((bullet, j) => (
                  <li key={j}>{bullet}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {/* Projects */}
      {projects && projects.length > 0 && (
        <section className="modern-section">
          <h2 className="modern-section-title">Projects</h2>
          {projects.map((proj, i) => (
            <div key={i} className="modern-exp-item">
              <div className="modern-exp-header">
                <div>
                  <h3 className="modern-exp-role">{proj.name}</h3>
                  {proj.technologies && <p className="modern-exp-company">{proj.technologies}</p>}
                </div>
                {proj.duration && <span className="modern-exp-duration">{proj.duration}</span>}
              </div>
              <ul className="modern-exp-bullets">
                {proj.bullets.map((bullet, j) => (
                  <li key={j}>{bullet}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {/* Education */}
      {education && education.length > 0 && (
        <section className="modern-section">
          <h2 className="modern-section-title">Education</h2>
          {education.map((edu, i) => (
            <div key={i} className="modern-edu-item">
              <div className="modern-edu-header">
                <div>
                  <h3 className="modern-edu-degree">{edu.degree}</h3>
                  <p className="modern-edu-institution">{edu.institution}</p>
                </div>
                {edu.duration && <span className="modern-exp-duration">{edu.duration}</span>}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Certifications */}
      {certifications && certifications.length > 0 && (
        <section className="modern-section">
          <h2 className="modern-section-title">Certifications</h2>
          <div className="modern-certs">
            {certifications.map((cert, i) => (
              <div key={i} className="modern-cert-item">
                <span className="modern-cert-name">{cert.name}</span>
                {cert.issuer && <span className="modern-cert-issuer"> — {cert.issuer}</span>}
                {cert.date && <span className="modern-cert-date">{cert.date}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Additional Sections (Awards, Volunteer, Languages, etc.) */}
      {additionalSections && additionalSections.length > 0 && additionalSections.map((section, i) => (
        <section key={i} className="modern-section">
          <h2 className="modern-section-title">{section.sectionTitle}</h2>
          <ul className="modern-exp-bullets">
            {section.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
