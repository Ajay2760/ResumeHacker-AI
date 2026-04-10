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

export default router;
