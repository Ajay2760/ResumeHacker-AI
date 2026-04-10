import { useState, useRef, useEffect } from "react";
import { useAnalyzeResume } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { extractTextFromPDF } from "@/lib/pdf";
import {
  Loader2, UploadCloud, X, AlertTriangle, FileText,
  ChevronRight, Check, Copy, Sun, Moon, Download,
  Target, Zap, Shield, TrendingUp, ArrowLeft, Sparkles,
  BookOpen, Award, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

// ─── Theme Toggle ────────────────────────────────────────────────────────────
function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("rr-theme") as "light" | "dark") ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    }
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("rr-theme", theme);
  }, [theme]);

  return { theme, toggle: () => setTheme(t => t === "dark" ? "light" : "dark") };
}

// ─── Score Gauge (Semi-circle arc) ──────────────────────────────────────────
function ScoreGauge({ score }: { score: number }) {
  const [displayed, setDisplayed] = useState(0);
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let start = 0;
    const step = () => {
      start += Math.ceil((score - start) / 6) || 1;
      if (start >= score) { setDisplayed(score); return; }
      setDisplayed(start);
      animRef.current = setTimeout(step, 16);
    };
    const delay = setTimeout(step, 600);
    return () => { clearTimeout(delay); if (animRef.current) clearTimeout(animRef.current); };
  }, [score]);

  // Gauge geometry — semi-circle, 240° arc
  const cx = 160, cy = 155, r = 120;
  const startAngle = 210, endAngle = 330; // degrees, full sweep = 300°
  const sweep = 300;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const arc = (angle: number) => ({
    x: cx + r * Math.cos(toRad(angle)),
    y: cy + r * Math.sin(toRad(angle)),
  });

  const describeArc = (start: number, end: number) => {
    const s = arc(start), e = arc(end);
    const large = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  const progressAngle = startAngle + (score / 100) * sweep;
  const circumference = (sweep / 360) * 2 * Math.PI * r;
  const trackLen = circumference;

  // Tick marks
  const ticks = [0, 25, 50, 75, 100];

  // Grade
  const grade = score >= 90 ? "A+" : score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";

  // Colors
  const { strokeColor, glowColor, label, badgeCls } =
    score >= 90 ? { strokeColor: "#16a34a", glowColor: "#16a34a40", label: "Excellent Match", badgeCls: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" } :
    score >= 71 ? { strokeColor: "#2563eb", glowColor: "#2563eb40", label: "Good Match", badgeCls: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" } :
    score >= 41 ? { strokeColor: "#d97706", glowColor: "#d9770640", label: "Needs Work", badgeCls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" } :
    { strokeColor: "#dc2626", glowColor: "#dc262640", label: "Poor Match", badgeCls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" };

  return (
    <div className="flex flex-col items-center" data-testid="score-gauge">
      <div className="relative" style={{ width: 320, height: 210 }}>
        <svg viewBox="0 0 320 200" width="320" height="200">
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="coloredBlur" />
              <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="trackGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#dc2626" />
              <stop offset="40%"  stopColor="#d97706" />
              <stop offset="70%"  stopColor="#2563eb" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>
          </defs>

          {/* Track background */}
          <path
            d={describeArc(startAngle, startAngle + sweep)}
            fill="none"
            stroke="currentColor"
            strokeWidth="18"
            strokeLinecap="round"
            className="text-muted/40"
          />

          {/* Colored progress arc */}
          {score > 0 && (
            <path
              d={describeArc(startAngle, progressAngle)}
              fill="none"
              stroke={strokeColor}
              strokeWidth="18"
              strokeLinecap="round"
              filter="url(#glow)"
              className="gauge-progress"
              style={{
                ["--gauge-total" as string]: `${trackLen}`,
                ["--gauge-target" as string]: `${trackLen - (score / 100) * trackLen}`,
                strokeDasharray: trackLen,
                strokeDashoffset: trackLen,
              }}
            />
          )}

          {/* Tick marks */}
          {ticks.map((t) => {
            const a = startAngle + (t / 100) * sweep;
            const inner = { x: cx + (r - 16) * Math.cos(toRad(a)), y: cy + (r - 16) * Math.sin(toRad(a)) };
            const outer = { x: cx + (r + 2) * Math.cos(toRad(a)),  y: cy + (r + 2) * Math.sin(toRad(a)) };
            return (
              <line key={t}
                x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
                stroke="currentColor" strokeWidth="2" className="text-border" />
            );
          })}

          {/* Tick labels */}
          {ticks.map((t) => {
            const a = startAngle + (t / 100) * sweep;
            const lp = { x: cx + (r + 22) * Math.cos(toRad(a)), y: cy + (r + 22) * Math.sin(toRad(a)) };
            return (
              <text key={t} x={lp.x} y={lp.y}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="11" fill="currentColor" className="text-muted-foreground" opacity="0.7">
                {t}
              </text>
            );
          })}

          {/* Center score */}
          <text x={cx} y={cy - 18} textAnchor="middle" fontSize="56" fontWeight="800"
            fill={strokeColor} fontFamily="Inter, sans-serif" className="score-appear">
            {displayed}
          </text>
          <text x={cx} y={cy + 20} textAnchor="middle" fontSize="15" fill="currentColor"
            className="text-muted-foreground" fontFamily="Inter, sans-serif" opacity="0.7">
            out of 100
          </text>
          <text x={cx} y={cy + 44} textAnchor="middle" fontSize="22" fontWeight="700"
            fill={strokeColor} fontFamily="Inter, sans-serif">
            {grade}
          </text>
        </svg>
      </div>

      {/* Label badge */}
      <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold ${badgeCls}`}>
        {score >= 90 && <Star className="w-3.5 h-3.5" />}
        {label}
      </span>
    </div>
  );
}

// ─── Score Sub-metrics ───────────────────────────────────────────────────────
function ScoreBreakdown({ score, matched, missing }: { score: number; matched: number; missing: number }) {
  const total = matched + missing || 1;
  const keywordPct = Math.round((matched / total) * 100);
  const impactPct = Math.min(100, Math.round(score * 0.9 + 10));
  const fitPct = Math.min(100, Math.round(score * 1.05));

  const metrics = [
    { label: "Keyword Coverage", value: keywordPct, icon: <Target className="w-4 h-4" />, color: "bg-blue-500" },
    { label: "Overall Fit",      value: fitPct,     icon: <Zap    className="w-4 h-4" />, color: "bg-violet-500" },
    { label: "Impact Score",     value: impactPct,  icon: <TrendingUp className="w-4 h-4" />, color: "bg-emerald-500" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 mt-6">
      {metrics.map((m) => (
        <div key={m.label} className="bg-muted/50 rounded-xl p-3 text-center space-y-2">
          <div className="flex justify-center text-muted-foreground">{m.icon}</div>
          <div className="text-lg font-bold">{m.value}%</div>
          <div className="text-xs text-muted-foreground leading-tight">{m.label}</div>
          <Progress value={m.value} className="h-1.5" />
        </div>
      ))}
    </div>
  );
}

// ─── Quick Tips ──────────────────────────────────────────────────────────────
function QuickTips({ missing, score }: { missing: string[]; score: number }) {
  const tips: string[] = [];
  if (score < 70) tips.push("Add a tailored Skills section matching the job requirements.");
  if (missing.length > 3) tips.push(`Include ${missing.slice(0, 3).join(", ")} as keywords in your resume.`);
  if (score < 50) tips.push("Rewrite your summary to mirror the job description language.");
  tips.push("Use numbers to quantify all achievements (%, $, time saved).");
  if (score < 80) tips.push("Add a Professional Summary at the top targeting this exact role.");

  return (
    <Card className="border-primary/20 bg-accent/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Quick Wins to Boost Your Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {tips.slice(0, 4).map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold mt-0.5">
                {i + 1}
              </span>
              {tip}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ─── Copy Button ─────────────────────────────────────────────────────────────
function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all
        ${copied
          ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300"
          : "bg-background border-border text-muted-foreground hover:border-primary hover:text-primary"}`}
    >
      {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> {label}</>}
    </button>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto py-8 animate-in fade-in">
      <div className="text-center space-y-3 mb-8">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
        <h2 className="text-2xl font-bold">Ranking your resume...</h2>
        <p className="text-muted-foreground">Our AI is cross-referencing skills, impact, and ATS compatibility.</p>
        <div className="flex justify-center gap-2 pt-1">
          {["Scanning keywords", "Analyzing bullets", "Checking format"].map((step, i) => (
            <span key={i} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}>
              {step}
            </span>
          ))}
        </div>
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
      <div className="grid md:grid-cols-2 gap-4">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Home() {
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPasting, setIsPasting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const analyzeMutation = useAnalyzeResume();
  const { toast } = useToast();
  const { theme, toggle: toggleTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (file.type === "application/pdf") {
      setFileName(file.name);
      try {
        const text = await extractTextFromPDF(file);
        setResumeText(text);
      } catch (err: any) {
        toast({ title: "PDF Error", description: err.message, variant: "destructive" });
        setFileName(null);
      }
    } else if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      setFileName(file.name);
      setResumeText(await file.text());
    } else {
      toast({ title: "Unsupported format", description: "Please upload a PDF or plain text file.", variant: "destructive" });
    }
  };

  const handleAnalyze = () => {
    if (!jobDescription.trim()) {
      toast({ title: "Job description required", description: "Please paste the job description.", variant: "destructive" });
      return;
    }
    if (!resumeText.trim()) {
      toast({ title: "Resume required", description: "Please upload or paste your resume.", variant: "destructive" });
      return;
    }
    analyzeMutation.mutate({ data: { jobDescription: jobDescription.trim(), resumeText: resumeText.trim() } }, {
      onSuccess: (result) => {
        setAnalysisResult(result);
        toast({ title: "Analysis complete", description: "Your resume has been ranked successfully." });
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      },
      onError: (err: any) => {
        toast({ title: "Analysis failed", description: err.message || "Something went wrong.", variant: "destructive" });
      }
    });
  };

  const handleCopyAll = () => {
    if (!analysisResult) return;
    const allBullets = analysisResult.weakBullets?.map((b: any) => `ORIGINAL: ${b.original}\nIMPROVED: ${b.improved}`).join("\n\n") || "";
    navigator.clipboard.writeText(allBullets);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleDownload = () => {
    if (!analysisResult) return;
    const lines = [
      `RESUMERANKER AI — ANALYSIS REPORT`,
      `=`.repeat(40),
      ``,
      `ATS MATCH SCORE: ${analysisResult.matchScore}/100`,
      ``,
      `MATCHED KEYWORDS (${analysisResult.matchedKeywords?.length || 0}):`,
      (analysisResult.matchedKeywords || []).join(", "),
      ``,
      `MISSING KEYWORDS (${analysisResult.missingKeywords?.length || 0}):`,
      (analysisResult.missingKeywords || []).join(", "),
      ``,
      `IMPROVED BULLET POINTS:`,
      ...(analysisResult.weakBullets || []).flatMap((b: any, i: number) => [
        `${i + 1}. ORIGINAL: ${b.original}`,
        `   IMPROVED: ${b.improved}`,
        ``
      ]),
      `RECRUITER RED FLAGS:`,
      ...(analysisResult.redFlags || []).map((f: any) => `- ${f.issue}: ${f.fix}`),
      ``,
      `AI FEEDBACK:`,
      `Overall: ${analysisResult.summary?.overallImpression}`,
      `Strengths: ${analysisResult.summary?.keyStrengths}`,
      `Improvements: ${analysisResult.summary?.priorityImprovements}`,
      `Recommendation: ${analysisResult.summary?.finalRecommendation}`,
      `Confidence: ${analysisResult.summary?.confidenceLevel}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "resumeranker-report.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  const wordCount = resumeText.trim().split(/\s+/).filter(Boolean).length;
  const estimatedPages = Math.round((wordCount / 450) * 10) / 10;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <Award className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight">ResumeRanker</span>
              <span className="font-light text-lg text-primary ml-1">AI</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:block">Beat the ATS. Land the interview.</span>
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl border border-border bg-background flex items-center justify-center hover:bg-muted transition-colors"
              data-testid="button-theme-toggle"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 pb-24">

        {/* ── Input View ── */}
        {!analysisResult && !analyzeMutation.isPending && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                AI-Powered Resume Analysis
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight mb-3">
                Rank your resume against<br />
                <span className="text-primary">any job in seconds.</span>
              </h1>
              <p className="text-muted-foreground text-lg">
                Paste a job description, upload your resume, and get your ATS score, missing keywords, bullet rewrites, and red flags — instantly.
              </p>
            </div>

            {/* 3 benefit pills */}
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { icon: <Target className="w-3.5 h-3.5" />, text: "ATS Score" },
                { icon: <Zap    className="w-3.5 h-3.5" />, text: "Keyword Gap Analysis" },
                { icon: <Shield className="w-3.5 h-3.5" />, text: "Recruiter Red Flags" },
                { icon: <BookOpen className="w-3.5 h-3.5" />, text: "Bullet Rewrites" },
              ].map(({ icon, text }) => (
                <span key={text} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                  {icon}{text}
                </span>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Left: Job Description */}
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
                  Paste the job description
                </label>
                <Textarea
                  id="job-description"
                  placeholder="Copy the full job posting here — the more detail, the better."
                  className="min-h-[280px] resize-y bg-card border-border focus-visible:ring-primary text-sm"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  data-testid="input-job-description"
                />
                {jobDescription.length > 0 && (
                  <p className="text-xs text-muted-foreground text-right">{jobDescription.length.toLocaleString()} characters</p>
                )}
              </div>

              {/* Right: Resume */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">2</span>
                    Your resume
                  </label>
                  <button
                    onClick={() => setIsPasting(!isPasting)}
                    className="text-xs text-primary hover:underline font-medium"
                    data-testid="button-toggle-paste"
                  >
                    {isPasting ? "Upload a file instead" : "Or paste your text"}
                  </button>
                </div>

                {!isPasting ? (
                  <div
                    className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 min-h-[280px] transition-all cursor-pointer
                      ${isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border bg-card hover:border-primary/50 hover:bg-accent/30"}`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
                    onClick={() => !fileName && fileInputRef.current?.click()}
                    data-testid="dropzone-resume"
                  >
                    {fileName ? (
                      <div className="flex flex-col items-center text-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                          <FileText size={28} />
                        </div>
                        <div>
                          <p className="font-semibold truncate max-w-[200px]">{fileName}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {resumeText.length.toLocaleString()} chars · ~{wordCount} words · ~{estimatedPages} page{estimatedPages !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setFileName(null); setResumeText(""); }} data-testid="button-remove-file">
                          <X className="w-3.5 h-3.5 mr-1.5" /> Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center gap-3 pointer-events-none">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${isDragging ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                          <UploadCloud size={28} />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">Drag & drop your resume</p>
                          <p className="text-xs text-muted-foreground mt-1">PDF or plain text · click to browse</p>
                        </div>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" accept=".pdf,.txt,text/plain,application/pdf" className="hidden"
                      onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
                  </div>
                ) : (
                  <Textarea
                    placeholder="Paste your full resume text here..."
                    className="min-h-[280px] resize-y bg-card border-border focus-visible:ring-primary text-sm"
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    data-testid="input-resume-text"
                  />
                )}
                {isPasting && resumeText.length > 0 && (
                  <p className="text-xs text-muted-foreground text-right">
                    {resumeText.length.toLocaleString()} chars · ~{wordCount} words · ~{estimatedPages}p
                  </p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-center">
              <Button
                size="lg"
                className="h-13 px-10 text-base font-semibold rounded-2xl shadow-lg shadow-primary/25 gap-2"
                onClick={handleAnalyze}
                disabled={!jobDescription.trim() || !resumeText.trim()}
                data-testid="button-analyze"
              >
                Rank My Resume
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Loading State ── */}
        {analyzeMutation.isPending && <LoadingSkeleton />}

        {/* ── Results View ── */}
        {analysisResult && !analyzeMutation.isPending && (
          <div ref={resultsRef} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top bar */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setAnalysisResult(null)} className="gap-2" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
                New analysis
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2" data-testid="button-download">
                <Download className="w-4 h-4" />
                Download report
              </Button>
            </div>

            {/* ── COMPONENT 1: Score Card ── */}
            <Card className="overflow-hidden border-border shadow-lg">
              <div className="relative bg-gradient-to-br from-card to-muted/30 p-8">
                <div className="absolute top-4 right-4">
                  <Badge variant="outline" className="text-xs">
                    {analysisResult.matchedKeywords?.length || 0} matched · {analysisResult.missingKeywords?.length || 0} missing
                  </Badge>
                </div>
                <div className="flex flex-col lg:flex-row items-center gap-8">
                  <div className="flex-shrink-0">
                    <ScoreGauge score={analysisResult.matchScore} />
                  </div>
                  <div className="flex-1 w-full">
                    <h2 className="text-xl font-bold mb-1">ATS Compatibility Score</h2>
                    <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                      {analysisResult.matchScore >= 90
                        ? "Excellent! Your resume is highly optimized for this role. You're in the top tier of applicants."
                        : analysisResult.matchScore >= 71
                        ? "Good match. A few targeted improvements will put you in the top tier."
                        : analysisResult.matchScore >= 41
                        ? "Needs work. You're missing key requirements — follow the recommendations below."
                        : "Poor match. Significant revisions are needed before applying to this role."}
                    </p>
                    <ScoreBreakdown
                      score={analysisResult.matchScore}
                      matched={analysisResult.matchedKeywords?.length || 0}
                      missing={analysisResult.missingKeywords?.length || 0}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* ── Quick Tips ── */}
            <QuickTips missing={analysisResult.missingKeywords || []} score={analysisResult.matchScore} />

            {/* ── COMPONENT 2: Keywords ── */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-green-200/60 dark:border-green-800/40 shadow-sm">
                <CardHeader className="pb-3 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      Keywords You Have
                    </span>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 hover:bg-green-100 text-xs font-semibold">
                      {analysisResult.matchedKeywords?.length || 0}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="flex flex-wrap gap-1.5">
                    {analysisResult.matchedKeywords?.length > 0
                      ? analysisResult.matchedKeywords.map((kw: string, i: number) => (
                          <span key={i} className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300">
                            <Check className="w-3 h-3" />{kw}
                          </span>
                        ))
                      : <p className="text-xs text-muted-foreground italic">No matching keywords found.</p>}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-200/60 dark:border-red-800/40 shadow-sm">
                <CardHeader className="pb-3 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <X className="w-4 h-4 text-red-500" />
                      Missing Keywords
                    </span>
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-100 text-xs font-semibold">
                      {analysisResult.missingKeywords?.length || 0}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="flex flex-wrap gap-1.5">
                    {analysisResult.missingKeywords?.length > 0
                      ? analysisResult.missingKeywords.map((kw: string, i: number) => (
                          <span key={i} className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300 cursor-pointer hover:bg-red-100 transition-colors"
                            onClick={() => navigator.clipboard.writeText(kw)}>
                            {kw}
                          </span>
                        ))
                      : <p className="text-xs text-muted-foreground italic">You hit all the main keywords.</p>}
                  </div>
                  {analysisResult.missingKeywords?.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">Click any keyword to copy it.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── COMPONENT 3: Bullet Rewrites ── */}
            {analysisResult.weakBullets?.length > 0 && (
              <Card className="border-border shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/40 border-b border-border px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Zap className="w-4 h-4 text-primary" />
                        Bullet Point Rewrites
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {analysisResult.weakBullets.length} bullets strengthened with action verbs and metrics
                      </CardDescription>
                    </div>
                    <button
                      onClick={handleCopyAll}
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all
                        ${copiedAll ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300" : "border-border hover:border-primary hover:text-primary"}`}
                      data-testid="button-copy-all"
                    >
                      {copiedAll ? <><Check className="w-3.5 h-3.5" /> Copied all</> : <><Copy className="w-3.5 h-3.5" /> Copy all</>}
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Accordion type="single" collapsible className="w-full">
                    {analysisResult.weakBullets.map((bullet: any, i: number) => (
                      <AccordionItem key={i} value={`bullet-${i}`} className="border-b last:border-0">
                        <AccordionTrigger className="hover:no-underline px-6 py-4 text-left">
                          <div className="flex items-center gap-3 pr-4">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center">
                              {i + 1}
                            </span>
                            <span className="text-sm text-muted-foreground line-clamp-1 flex-1">{bullet.original}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-5 pt-1">
                          <div className="space-y-3 pl-9">
                            <div className="bg-muted/50 border border-border rounded-xl p-4 relative">
                              <span className="absolute -top-2.5 left-3 bg-muted border border-border text-muted-foreground text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">Before</span>
                              <p className="text-sm text-muted-foreground leading-relaxed mt-1">{bullet.original}</p>
                            </div>
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 relative dark:bg-green-900/20 dark:border-green-700/50">
                              <span className="absolute -top-2.5 left-3 bg-green-100 border border-green-200 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider dark:bg-green-800 dark:text-green-200 dark:border-green-600">Improved</span>
                              <p className="text-sm text-green-900 dark:text-green-100 font-medium leading-relaxed mt-1">{bullet.improved}</p>
                              <div className="mt-3 flex justify-end">
                                <CopyButton text={bullet.improved} label="Copy improved" />
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            )}

            {/* ── COMPONENT 4: Red Flags ── */}
            {analysisResult.redFlags?.length > 0 && (
              <Card className="border-amber-200/70 dark:border-amber-700/40 shadow-sm">
                <CardHeader className="pb-3 px-6 pt-5">
                  <CardTitle className="text-base flex items-center gap-2 text-amber-900 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Recruiter Red Flags
                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-100 ml-auto text-xs">
                      {analysisResult.redFlags.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-5">
                  <div className="space-y-3">
                    {analysisResult.redFlags.map((flag: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-700/30 rounded-xl p-4">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-800/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-amber-900 dark:text-amber-200">{flag.issue}</p>
                          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">{flag.fix}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── COMPONENT 5: AI Summary ── */}
            {analysisResult.summary && (
              <Card className="border-border shadow-sm overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-primary via-violet-500 to-emerald-500" />
                <CardHeader className="px-6 pt-5 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      AI Feedback Summary
                    </CardTitle>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Confidence</p>
                      <Badge className={
                        analysisResult.summary.confidenceLevel === "High"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                          : analysisResult.summary.confidenceLevel === "Medium"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                          : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                      }>
                        {analysisResult.summary.confidenceLevel}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  <div className="space-y-5">
                    {[
                      { title: "Overall Impression", content: analysisResult.summary.overallImpression },
                      { title: "Key Strengths",      content: analysisResult.summary.keyStrengths },
                      { title: "Priority Improvements", content: analysisResult.summary.priorityImprovements },
                    ].map(({ title, content }) => (
                      <div key={title}>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{title}</h4>
                        <p className="text-sm leading-relaxed text-foreground/80">{content}</p>
                      </div>
                    ))}
                    <div className="pt-4 border-t border-border">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Final Recommendation</h4>
                      <p className="text-sm leading-relaxed font-medium text-foreground">{analysisResult.summary.finalRecommendation}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bottom actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button className="flex-1 gap-2" onClick={handleDownload} data-testid="button-download-bottom">
                <Download className="w-4 h-4" /> Download Full Report
              </Button>
              <Button variant="outline" className="flex-1 gap-2" onClick={() => setAnalysisResult(null)} data-testid="button-analyze-another">
                <ArrowLeft className="w-4 h-4" /> Analyze Another Resume
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
