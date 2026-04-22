import { Router, type Request, type Response } from "express";
import { AnalyzeResumeBody, TailorResumeBody } from "@workspace/api-zod";
import {
  anthropicMessagesModel,
  groqMessagesModel,
  openaiMessagesModel,
  type ResumeLlmBackend,
} from "@workspace/integrations-anthropic-ai";
import { resumeCompleteJson, resumeCompleteText, resumeLlmBackend } from "../lib/resume-llm";

const router = Router();

const anthropicModel = anthropicMessagesModel();
const openaiModel = openaiMessagesModel();
const groqModel = groqMessagesModel();

function extractAiHttpDetails(err: unknown): { status?: number; message: string } {
  if (!err || typeof err !== "object") {
    return { message: String(err) };
  }
  const e = err as Record<string, unknown>;
  const status = typeof e.status === "number" ? e.status : undefined;
  let message = e.message != null ? String(e.message) : "Unknown error";
  const inner = e.error;
  if (inner && typeof inner === "object" && "message" in inner) {
    const m = (inner as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) {
      message = m.trim();
    }
  }
  return { status, message };
}

function configHint(backend: ResumeLlmBackend): string {
  if (backend === "openai") {
    return "Confirm OPENAI_API_KEY and OPENAI_MODEL on the server (Render → Environment).";
  }
  if (backend === "groq") {
    return "Confirm GROQ_API_KEY and GROQ_MODEL on the server (Render → Environment). Free key: console.groq.com";
  }
  return "Confirm ANTHROPIC_API_KEY and ANTHROPIC_MODEL on the server (Render → Environment).";
}

function sendAiRouteError(
  req: Request,
  res: Response,
  err: unknown,
  logMessage: string,
  genericUserMessage: string,
): void {
  req.log.error({ err }, logMessage);
  const { status, message } = extractAiHttpDetails(err);
  const lower = message.toLowerCase();
  const backend = resumeLlmBackend;

  if (status === 401) {
    const keyMsg =
      backend === "openai"
        ? "OpenAI rejected the API key. Set OPENAI_API_KEY (platform.openai.com)."
        : backend === "groq"
          ? "Groq rejected the API key. Set GROQ_API_KEY (free: console.groq.com)."
          : "Anthropic rejected the API key. Set ANTHROPIC_API_KEY (console.anthropic.com).";
    res.status(502).json({
      error: "ai_auth",
      message: `${keyMsg} In Render: Environment → add the variable → redeploy.`,
    });
    return;
  }

  // Groq/OpenAI often put "quota" in **rate limit** errors — handle limits before "billing".
  const looksLikeRateCap =
    status === 429 ||
    status === 529 ||
    lower.includes("rate limit") ||
    lower.includes("overloaded") ||
    lower.includes("too many requests") ||
    (lower.includes("quota") &&
      (lower.includes("rate") ||
        lower.includes("rpm") ||
        lower.includes("tpm") ||
        lower.includes("rpd") ||
        lower.includes("per minute") ||
        lower.includes("per day") ||
        lower.includes("exceeded")));

  if (looksLikeRateCap) {
    res.status(503).json({
      error: "ai_busy",
      message:
        backend === "groq"
          ? "Groq rate limit reached (free tier has RPM/RPD caps). Wait a minute or check Limits at console.groq.com — or try GROQ_MODEL=llama-3.3-70b-versatile for higher daily allowance."
          : "The AI service is busy or rate-limited. Wait a minute and try again.",
    });
    return;
  }

  if (
    status === 402 ||
    status === 403 ||
    lower.includes("credit") ||
    lower.includes("billing") ||
    lower.includes("insufficient_quota") ||
    (lower.includes("insufficient") && lower.includes("fund"))
  ) {
    const name = backend === "openai" ? "OpenAI" : backend === "groq" ? "Groq" : "Anthropic";
    const hint =
      backend === "groq"
        ? "Check the key at console.groq.com (API Keys), redeploy after changing env vars, and confirm the key is not restricted. HTTP 403 can also mean the model is not enabled for your account — try GROQ_MODEL=llama-3.3-70b-versatile."
        : "For a free option, set GROQ_API_KEY from console.groq.com and AI_PROVIDER=groq.";
    res.status(502).json({
      error: "ai_billing",
      message: `${name} refused the request (billing or permissions). ${hint}`,
    });
    return;
  }

  if (
    (status === 400 || status === 403) &&
    (lower.includes("model") ||
      lower.includes("not_found") ||
      lower.includes("invalid model") ||
      lower.includes("does not exist") ||
      lower.includes("unknown model"))
  ) {
    const modelLabel =
      backend === "openai" ? openaiModel : backend === "groq" ? groqModel : anthropicModel;
    res.status(502).json({
      error: "ai_model",
      message: `The configured model (${modelLabel}) was rejected. For Groq use a current ID from their docs (default: llama-3.3-70b-versatile). Set GROQ_MODEL or clear it to use the default.`,
    });
    return;
  }

  res.status(500).json({
    error: "server_error",
    message: `${genericUserMessage} ${configHint(backend)}`,
  });
}

const SYSTEM_PROMPT = `You are an expert ATS (Applicant Tracking System) analyst and executive resume coach with 15+ years of experience in talent acquisition at Fortune 500 companies. Your job is to analyze a candidate's resume against a specific job description and return a structured JSON analysis. Be direct, specific, and actionable. Never be vague. Always return valid JSON — no markdown, no preamble, no code fences.`;

router.post("/resume/analyze", async (req, res) => {
  const parsed = AnalyzeResumeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: "resumeText and jobDescription are required" });
    return;
  }

  const { resumeText, jobDescription } = parsed.data;

  const userMessage = `Analyze the resume against the job description and return ONLY a JSON object with this exact structure:
{
  "matchScore": <number 0-100>,
  "matchedKeywords": [<string>],
  "missingKeywords": [<string>],
  "weakBullets": [{ "original": <string>, "improved": <string> }],
  "redFlags": [{ "issue": <string>, "fix": <string> }],
  "summary": {
    "overallImpression": <string>,
    "keyStrengths": <string>,
    "priorityImprovements": <string>,
    "finalRecommendation": <string>,
    "confidenceLevel": <"High"|"Medium"|"Low">
  }
}

Identify 3-5 of the weakest bullet points and rewrite them with strong action verbs and quantified achievements.
Identify 2-5 recruiter red flags.
Be specific and actionable in all feedback.

Resume:
${resumeText}

Job Description:
${jobDescription}`;

  try {
    let jsonText = await resumeCompleteJson(SYSTEM_PROMPT, userMessage, 4000);
    jsonText = jsonText.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();

    const result = JSON.parse(jsonText);
    res.json(result);
  } catch (err) {
    if (err instanceof SyntaxError) {
      req.log.error({ err }, "Resume analysis JSON parse failed");
      res.status(500).json({ error: "parse_error", message: "Failed to parse AI response as JSON" });
    } else {
      sendAiRouteError(req, res, err, "Resume analysis failed", "Analysis failed.");
    }
  }
});

router.post("/resume/cover-letter", async (req, res) => {
  const parsed = AnalyzeResumeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: "resumeText and jobDescription are required" });
    return;
  }

  const { resumeText, jobDescription } = parsed.data;

  const userMessage = `Write a professional, compelling cover letter for this candidate applying to the position described in the job description below. 

The cover letter should:
- Be addressed to "Hiring Manager" (since we don't know the name)
- Open with a strong hook that references the specific role
- Highlight 2-3 of the candidate's strongest qualifications that match the job
- Address any notable skill gaps naturally (reframe as eagerness to grow)
- Close with a confident call to action
- Be 3-4 paragraphs, approximately 250-350 words
- Sound human, professional, and enthusiastic — not generic or robotic

Return ONLY the cover letter text with no preamble, no explanations, no JSON. Just the letter starting with "Dear Hiring Manager,".

Resume:
${resumeText}

Job Description:
${jobDescription}`;

  const system =
    "You are an expert career coach and professional cover letter writer with 15+ years of experience. You write compelling, personalized cover letters that get candidates interviews. Always write in the candidate's voice, never sound generic.";

  try {
    const coverLetter = (await resumeCompleteText(system, userMessage, 2048)).trim();
    const wordCount = coverLetter.split(/\s+/).filter(Boolean).length;
    res.json({ coverLetter, wordCount });
  } catch (err) {
    sendAiRouteError(req, res, err, "Cover letter generation failed", "Generation failed.");
  }
});

router.post("/resume/career-roadmap", async (req, res) => {
  const { resumeText, jobDescription, missingKeywords, matchScore } = req.body;

  if (!resumeText || !jobDescription) {
    res.status(400).json({ error: "validation_error", message: "resumeText and jobDescription are required" });
    return;
  }

  const userMessage = `Create a personalized career roadmap for a candidate who wants to land the role described below. Their current ATS match score is ${matchScore}/100 and they are missing these skills: ${(missingKeywords || []).join(", ") || "none identified"}.

Return ONLY a JSON object with this exact structure (no markdown, no preamble):
{
  "targetRole": "<extracted job title from description>",
  "summary": "<2-sentence overview of what they need to do to get this role>",
  "estimatedTimeToReady": "<realistic timeframe e.g. '3-6 months'>",
  "phases": [
    {
      "phase": "Phase 1: <name>",
      "duration": "<e.g. Weeks 1-4>",
      "goal": "<one sentence goal>",
      "tasks": ["<specific actionable task>", "<task>", "<task>"],
      "resources": ["<free resource or platform>", "<resource>"]
    }
  ]
}

Create 3-4 phases that are realistic, specific, and prioritized. Focus on the biggest gaps first. Each phase should have 3-4 tasks and 2-3 resources (real platforms: Coursera, LinkedIn Learning, GitHub, freeCodeCamp, etc.).

Resume:
${resumeText}

Job Description:
${jobDescription}`;

  const system =
    "You are an expert career coach and skills development strategist. You create actionable, realistic career roadmaps that help candidates bridge skill gaps and land their target roles. Always return valid JSON only.";

  try {
    let jsonText = await resumeCompleteJson(system, userMessage, 3000);
    jsonText = jsonText.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
    const result = JSON.parse(jsonText);
    res.json(result);
  } catch (err) {
    if (err instanceof SyntaxError) {
      req.log.error({ err }, "Career roadmap JSON parse failed");
      res.status(500).json({ error: "parse_error", message: "Failed to parse AI response" });
    } else {
      sendAiRouteError(req, res, err, "Career roadmap generation failed", "Generation failed.");
    }
  }
});

router.post("/resume/optimize", async (req, res) => {
  const { resumeText } = req.body;

  if (!resumeText || typeof resumeText !== "string") {
    res.status(400).json({ error: "validation_error", message: "resumeText is required" });
    return;
  }

  const system = `You are an expert ATS Resume Optimizer and Professional Resume Writer. 
Your task is to analyze the uploaded resume and automatically detect and fix issues related to:
1. Grammar, spelling, and punctuation errors
2. Weak or vague bullet points
3. Poor action verb usage
4. Lack of quantification (metrics, impact)
5. Inconsistent formatting or structure
6. ATS compatibility issues (keywords, readability, section clarity)
7. Redundant or irrelevant information

Instructions:
- Preserve the original meaning and intent of the resume
- Improve content using strong action verbs and measurable impact
- Ensure ATS-friendly formatting (clear headings, bullet points, consistent structure)
- Do NOT add false information or fabricate experience
- Keep the resume concise, professional, and industry-standard
- Ensure the improved resume can be directly converted into .docx and .pdf without breaking layout
- Maintain a clean, single-column structure
- Avoid tables, images, or complex formatting that may break ATS parsing
- Optimize for both ATS systems and human recruiters

Tone:
Professional, concise, and results-oriented`;

  const userMessage = `Analyze the uploaded resume and return a structured JSON format exactly matching this schema:
{
  "detected_issues": [
    {
      "section": "<section_name>",
      "issue": "<description of the problem>",
      "fix": "<what was improved>"
    }
  ],
  "improved_resume_text": "<fully corrected and optimized resume in clean text format>",
  "doc_formatting_guidelines": {
    "font": "Calibri or Arial",
    "font_size": "10-12",
    "section_headings": "Bold, consistent size",
    "spacing": "Proper line spacing and margins",
    "bullet_style": "Standard round bullets"
  }
}

Return ONLY valid JSON. Do not include markdown blocks or any preamble.

Uploaded Resume:
${resumeText}`;

  try {
    let jsonText = await resumeCompleteJson(system, userMessage, 4000);
    jsonText = jsonText.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();

    const result = JSON.parse(jsonText);
    res.json(result);
  } catch (err) {
    if (err instanceof SyntaxError) {
      req.log.error({ err }, "Resume optimization JSON parse failed");
      res.status(500).json({ error: "parse_error", message: "Failed to parse AI response as JSON" });
    } else {
      sendAiRouteError(req, res, err, "Resume optimization failed", "Optimization failed.");
    }
  }
});

router.post("/resume/tailor", async (req, res) => {
  const parsed = TailorResumeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: "resumeText and jobDescription are required" });
    return;
  }

  const { resumeText, jobDescription } = parsed.data;

  const system = `You are an expert ATS Resume Optimizer and Professional Executive Resume Writer. 
Your task is to completely rewrite and restructure the provided resume so that it perfectly matches the given Job Description.
You will extract ALL details from the resume and return them in a specific JSON structure.

CRITICAL RULES:
- NEVER drop, skip, or remove any section or item from the original resume. If the resume has Projects, Certifications, Awards, Volunteer Work, Publications, Languages, Interests, or ANY other sections — you MUST include them ALL in the output.
- DO NOT DELETE projects, certifications, or additional sections just because they seem irrelevant to the JD. Instead, keep them, and try to alter/tailor the descriptions to highlight any possible transferable skills for the JD requirement.
- Keep the candidate's core truth, but rewrite descriptions, summary, and bullets to highlight overlaps with the job description.
- Use strong action verbs and ensure high impact metrics are preserved or enhanced.
- Re-order skills so the most relevant ones to the JD appear first.
- Re-write the professional summary to specifically position the candidate for this exact job description.
- Tailor project descriptions to emphasize technologies and outcomes relevant to the JD.
- For certifications: keep all certifications but order the most JD-relevant ones first.
- For any other sections (Awards, Volunteer, Publications, Languages, Hobbies, etc.): include them in "additionalSections" and tailor the language where possible.
- Return ONLY valid JSON matching the exact schema below. Do not use markdown blocks (\`\`\`json) or any preamble.

Schema:
{
  "personalInfo": {
    "name": "<Candidate Name>",
    "email": "<Email>",
    "phone": "<Phone>",
    "location": "<City, State>",
    "linkedin": "<LinkedIn URL if present>",
    "github": "<GitHub/Portfolio URL if present>"
  },
  "professionalSummary": "<Tailored 3-4 sentence professional summary>",
  "skills": ["<Skill 1>", "<Skill 2>", ...],
  "experience": [
    {
      "company": "<Company Name>",
      "role": "<Job Title>",
      "duration": "<Dates>",
      "location": "<Location>",
      "bullets": [
        "<Strong, JD-tailored action-verb bullet point>",
        "<Bullet 2>"
      ]
    }
  ],
  "education": [
    {
      "institution": "<School>",
      "degree": "<Degree>",
      "duration": "<Dates>"
    }
  ],
  "projects": [
    {
      "name": "<Project Name>",
      "technologies": "<Tech stack used>",
      "duration": "<Dates if available>",
      "bullets": [
        "<JD-tailored description of what was built and impact>"
      ]
    }
  ],
  "certifications": [
    {
      "name": "<Certification Name>",
      "issuer": "<Issuing Organization>",
      "date": "<Date obtained>"
    }
  ],
  "additionalSections": [
    {
      "sectionTitle": "<Section Name, e.g. Awards, Volunteer Experience, Publications, Languages>",
      "items": [
        "<Item description tailored to JD where possible>"
      ]
    }
  ]
}

IMPORTANT: 
- If the resume has NO projects, return "projects": []. Same for certifications and additionalSections.
- But if they DO exist in the resume, you MUST include them. Never skip sections.
- Scan the entire resume carefully for ALL sections before generating output.`;

  const userMessage = `Rewrite and structure my ENTIRE resume based on this job description. Preserve ALL sections from my resume — do NOT drop any sections like Projects, Certifications, Awards, etc.
  
Job Description:
${jobDescription}

My Current Resume:
${resumeText}`;

  try {
    let jsonText = await resumeCompleteJson(system, userMessage, 6000);
    jsonText = jsonText.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();

    const result = JSON.parse(jsonText);
    res.json(result);
  } catch (err) {
    if (err instanceof SyntaxError) {
      req.log.error({ err }, "Resume tailoring JSON parse failed");
      res.status(500).json({ error: "parse_error", message: "Failed to parse AI response as JSON" });
    } else {
      sendAiRouteError(req, res, err, "Resume tailoring failed", "Tailoring failed.");
    }
  }
});

export default router;
