import { Router } from "express";
import { AnalyzeResumeBody } from "@workspace/api-zod";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();

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
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      res.status(500).json({ error: "ai_error", message: "Unexpected response from AI" });
      return;
    }

    let jsonText = content.text.trim();
    // Strip markdown code fences if present
    jsonText = jsonText.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();

    const result = JSON.parse(jsonText);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Resume analysis failed");
    if (err instanceof SyntaxError) {
      res.status(500).json({ error: "parse_error", message: "Failed to parse AI response as JSON" });
    } else {
      res.status(500).json({ error: "server_error", message: "Analysis failed. Please try again." });
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

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: "You are an expert career coach and professional cover letter writer with 15+ years of experience. You write compelling, personalized cover letters that get candidates interviews. Always write in the candidate's voice, never sound generic.",
      messages: [{ role: "user", content: userMessage }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      res.status(500).json({ error: "ai_error", message: "Unexpected response from AI" });
      return;
    }

    const coverLetter = content.text.trim();
    const wordCount = coverLetter.split(/\s+/).filter(Boolean).length;
    res.json({ coverLetter, wordCount });
  } catch (err) {
    req.log.error({ err }, "Cover letter generation failed");
    res.status(500).json({ error: "server_error", message: "Generation failed. Please try again." });
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

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      system: "You are an expert career coach and skills development strategist. You create actionable, realistic career roadmaps that help candidates bridge skill gaps and land their target roles. Always return valid JSON only.",
      messages: [{ role: "user", content: userMessage }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      res.status(500).json({ error: "ai_error", message: "Unexpected response from AI" });
      return;
    }

    let jsonText = content.text.trim();
    jsonText = jsonText.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
    const result = JSON.parse(jsonText);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Career roadmap generation failed");
    if (err instanceof SyntaxError) {
      res.status(500).json({ error: "parse_error", message: "Failed to parse AI response" });
    } else {
      res.status(500).json({ error: "server_error", message: "Generation failed. Please try again." });
    }
  }
});

export default router;
