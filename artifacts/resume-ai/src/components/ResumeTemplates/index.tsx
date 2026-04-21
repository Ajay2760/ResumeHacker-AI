import type { TailoredResumeResult } from "@workspace/api-client-react";
import ModernTemplate from "./ModernTemplate";
import ClassicTemplate from "./ClassicTemplate";
import MinimalTemplate from "./MinimalTemplate";

export type TemplateName = "modern" | "classic" | "minimal";

interface SelectorProps {
  selected: TemplateName;
  onChange: (t: TemplateName) => void;
}

const TEMPLATES: { id: TemplateName; label: string; description: string }[] = [
  { id: "modern",  label: "Modern",  description: "Clean sans-serif, accent colors" },
  { id: "classic", label: "Classic", description: "Traditional serif, formal layout" },
  { id: "minimal", label: "Minimal", description: "Compact, black & white, ATS-strict" },
];

export function TemplateSelector({ selected, onChange }: SelectorProps) {
  return (
    <div className="template-selector">
      {TEMPLATES.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`template-option ${selected === t.id ? "template-option--active" : ""}`}
        >
          <span className="template-option-label">{t.label}</span>
          <span className="template-option-desc">{t.description}</span>
        </button>
      ))}
    </div>
  );
}

interface RenderProps {
  template: TemplateName;
  data: TailoredResumeResult;
}

export function ResumeTemplateRenderer({ template, data }: RenderProps) {
  switch (template) {
    case "classic":
      return <ClassicTemplate data={data} />;
    case "minimal":
      return <MinimalTemplate data={data} />;
    case "modern":
    default:
      return <ModernTemplate data={data} />;
  }
}
