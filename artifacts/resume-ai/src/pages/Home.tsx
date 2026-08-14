import { useState, useRef, useEffect, useCallback } from "react";
import { useAnalyzeResume, useGenerateCoverLetter, useGenerateCareerRoadmap, useTailorResume } from "@workspace/api-client-react";
import type { TailoredResumeResult } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { extractTextFromPDF } from "@/lib/pdf";
import {
  Loader2, UploadCloud, X, AlertTriangle, FileText,
  ChevronRight, Check, Copy, Download,
  Target, Zap, Shield, ArrowLeft, Sparkles,
  BookOpen, Mail, Map, FileDown, RotateCw,
  ChevronDown, ExternalLink, Clock, Flag, Printer, FileEdit,
  Star, TrendingUp, Layers, CheckCircle2, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { TemplateSelector, ResumeTemplateRenderer } from "@/components/ResumeTemplates";
import type { TemplateName } from "@/components/ResumeTemplates";
import { NoiseOverlay } from "@/components/ui/noise-overlay";
import { KineticMarquee } from "@/components/ui/kinetic-marquee";

// ─── Score Gauge / Numerical Display ─────────────────────────────────────────
function KineticScoreGauge({ score }: { score: number }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    let start = 0;
    const step = () => {
      start += Math.ceil((score - start) / 6) || 1;
      if (start >= score) { setDisplayed(score); return; }
      setDisplayed(start);
      requestAnimationFrame(step);
    };
    step();
  }, [score]);

  const grade = score >= 90 ? "A+" : score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-[#09090B] border-2 border-[#3F3F46] text-center relative group hover:bg-[#DFE104] hover:border-[#DFE104] hover:text-black transition-colors duration-300">
      <span className="text-xs uppercase font-mono tracking-widest text-[#A1A1AA] group-hover:text-black/80 mb-2">
        ATS MATCH SCORE
      </span>
      <div className="text-[6rem] md:text-[8rem] font-bold font-display leading-none tracking-tighter text-[#DFE104] group-hover:text-black my-2">
        {displayed}<span className="text-4xl md:text-5xl">%</span>
      </div>
      <div className="flex items-center gap-3 mt-2">
        <span className="text-xl font-bold uppercase tracking-tight group-hover:text-black">
          GRADE {grade}
        </span>
        <Badge variant={score >= 70 ? "default" : "destructive"}>
          {score >= 90 ? "EXCELLENT" : score >= 70 ? "GOOD MATCH" : score >= 40 ? "NEEDS WORK" : "POOR MATCH"}
        </Badge>
      </div>
    </div>
  );
}

// ─── Score Sub-metrics ───────────────────────────────────────────────────────
function KineticScoreBreakdown({ score, matched, missing }: { score: number; matched: number; missing: number }) {
  const total = matched + missing || 1;
  const keywordPct = Math.round((matched / total) * 100);
  const impactPct = Math.min(100, Math.round(score * 0.9 + 10));
  const fitPct = Math.min(100, Math.round(score * 1.05));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#3F3F46] border-2 border-[#3F3F46] mt-6">
      {[
        { label: "KEYWORD COVERAGE", value: keywordPct, icon: <Target className="w-5 h-5 text-[#DFE104]" />, num: "01" },
        { label: "OVERALL FIT SCORE", value: fitPct, icon: <Zap className="w-5 h-5 text-[#DFE104]" />, num: "02" },
        { label: "IMPACT METRICS", value: impactPct, icon: <TrendingUp className="w-5 h-5 text-[#DFE104]" />, num: "03" },
      ].map((m) => (
        <div key={m.label} className="bg-[#09090B] p-6 space-y-4 hover:bg-[#DFE104] hover:text-black group transition-colors duration-300 relative overflow-hidden">
          <span className="absolute -right-2 -bottom-4 text-7xl font-bold font-display text-[#27272A]/40 group-hover:text-black/10 pointer-events-none select-none">
            {m.num}
          </span>
          <div className="flex justify-between items-center">
            <div className="p-2 border-2 border-[#3F3F46] bg-[#09090B] text-[#FAFAFA] group-hover:border-black group-hover:bg-black group-hover:text-[#DFE104]">
              {m.icon}
            </div>
            <span className="text-3xl md:text-4xl font-bold font-display tracking-tighter group-hover:text-black">
              {m.value}%
            </span>
          </div>
          <div>
            <div className="text-sm font-bold uppercase tracking-wider text-[#A1A1AA] group-hover:text-black/80">{m.label}</div>
            <Progress value={m.value} className="mt-3 h-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Copy Button ─────────────────────────────────────────────────────────────
function KineticCopyButton({ text, label = "COPY" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className={`gap-2 text-xs font-bold ${copied ? "bg-[#DFE104] text-black border-[#DFE104]" : ""}`}
    >
      {copied ? <><Check className="w-3.5 h-3.5" /> COPIED</> : <><Copy className="w-3.5 h-3.5" /> {label}</>}
    </Button>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function KineticLoadingSkeleton() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto py-12">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 border-2 border-[#DFE104] bg-[#DFE104] text-black flex items-center justify-center mx-auto">
          <Loader2 className="w-10 h-10 animate-spin" />
        </div>
        <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tighter">ANALYZING RESUME VECTOR...</h2>
        <p className="text-[#A1A1AA] text-lg font-mono uppercase">CROSS-REFERENCING KEYWORDS // ATS ALGORITHM</p>
      </div>
      <div className="border-2 border-[#3F3F46] p-8 bg-[#09090B] space-y-6">
        <Skeleton className="h-40 w-full rounded-none bg-[#27272A]" />
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-32 rounded-none bg-[#27272A]" />
          <Skeleton className="h-32 rounded-none bg-[#27272A]" />
        </div>
      </div>
    </div>
  );
}

// ─── Download Helpers ─────────────────────────────────────────────────────────
async function downloadAsPDF(text: string, filename: string, title: string) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 20;
  const pageWidth = 210 - margin * 2;
  const lineHeight = 6;
  let y = margin;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const lines = text.split("\n");
  for (const line of lines) {
    const wrapped = doc.splitTextToSize(line || " ", pageWidth);
    for (const wl of wrapped) {
      if (y > 277) { doc.addPage(); y = margin; }
      doc.text(wl, margin, y);
      y += lineHeight;
    }
  }
  doc.save(filename);
}

async function downloadAsDOCX(text: string, filename: string, title: string) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");
  const paragraphs = [
    new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: "" }),
  ];
  for (const line of text.split("\n")) {
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: line || "" })] }));
  }
  const doc = new Document({ sections: [{ properties: {}, children: paragraphs }] });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Kinetic Application ─────────────────────────────────────────────────
export default function Home() {
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPasting, setIsPasting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [roadmap, setRoadmap] = useState<any | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingDOCX, setDownloadingDOCX] = useState(false);

  // ── Tailor feature state ──
  const [tailoredResult, setTailoredResult] = useState<TailoredResumeResult | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateName>("modern");
  const [tailorView, setTailorView] = useState(false);

  const analyzeMutation = useAnalyzeResume();
  const coverLetterMutation = useGenerateCoverLetter();
  const roadmapMutation = useGenerateCareerRoadmap();
  const tailorMutation = useTailorResume();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const resumePrintRef = useRef<HTMLDivElement>(null);

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
      toast({ title: "Unsupported format", description: "Upload PDF or TXT file.", variant: "destructive" });
    }
  };

  const handleAnalyze = () => {
    if (!jobDescription.trim()) {
      toast({ title: "Job Description Missing", description: "Paste job posting text.", variant: "destructive" });
      return;
    }
    if (!resumeText.trim()) {
      toast({ title: "Resume Text Missing", description: "Upload or paste your resume.", variant: "destructive" });
      return;
    }
    analyzeMutation.mutate({ data: { jobDescription: jobDescription.trim(), resumeText: resumeText.trim() } }, {
      onSuccess: (result) => {
        setAnalysisResult(result);
        setCoverLetter(null);
        setRoadmap(null);
        toast({ title: "Analysis Complete", description: "ATS rank generated." });
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      },
      onError: (err: any) => {
        toast({ title: "Analysis Failed", description: err.message || "Error processing request.", variant: "destructive" });
      }
    });
  };

  const handleGenerateCoverLetter = () => {
    coverLetterMutation.mutate(
      { data: { jobDescription: jobDescription.trim(), resumeText: resumeText.trim() } },
      {
        onSuccess: (result: any) => {
          setCoverLetter(result.coverLetter);
          toast({ title: "Cover Letter Generated", description: "Tailored letter ready." });
        },
        onError: (err: any) => {
          toast({ title: "Generation Failed", description: err.message || "Error generating cover letter.", variant: "destructive" });
        }
      }
    );
  };

  const handleGenerateRoadmap = () => {
    roadmapMutation.mutate(
      {
        data: {
          jobDescription: jobDescription.trim(),
          resumeText: resumeText.trim(),
          missingKeywords: analysisResult?.missingKeywords || [],
          matchScore: analysisResult?.matchScore || 0,
        }
      },
      {
        onSuccess: (result: any) => {
          setRoadmap(result);
          toast({ title: "Roadmap Created", description: "Personalized action plan generated." });
        },
        onError: (err: any) => {
          toast({ title: "Generation Failed", description: err.message || "Error generating roadmap.", variant: "destructive" });
        }
      }
    );
  };

  const handleTailorResume = () => {
    if (!jobDescription.trim() || !resumeText.trim()) {
      toast({ title: "Input Required", description: "Both Job Description & Resume are required.", variant: "destructive" });
      return;
    }
    tailorMutation.mutate(
      { data: { jobDescription: jobDescription.trim(), resumeText: resumeText.trim() } },
      {
        onSuccess: (result: any) => {
          setTailoredResult(result as TailoredResumeResult);
          setTailorView(true);
          toast({ title: "Resume Tailored", description: "Formatted resume generated." });
          setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        },
        onError: (err: any) => {
          toast({ title: "Tailoring Failed", description: err.message || "Error tailoring resume.", variant: "destructive" });
        }
      }
    );
  };

  const handleExportPDF = useCallback(() => {
    const printArea = resumePrintRef.current;
    if (!printArea) return;
    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) {
      toast({ title: "Popup Blocked", description: "Please allow popups to export PDF.", variant: "destructive" });
      return;
    }
    const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(el => el.outerHTML)
      .join("\n");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Resume - ${tailoredResult?.personalInfo?.name || "Export"}</title>
        ${stylesheets}
        <style>
          body { margin: 0; padding: 0; background: #fff; }
          .resume-template { box-shadow: none !important; border-radius: 0 !important; max-width: 100% !important; margin: 0 !important; }
        </style>
      </head>
      <body>
        ${printArea.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 400);
    };
  }, [tailoredResult, toast]);

  const handleDownloadResumePDF = async () => {
    if (!resumeText) return;
    setDownloadingPDF(true);
    try { await downloadAsPDF(resumeText, "resume.pdf", "RESUME"); }
    finally { setDownloadingPDF(false); }
  };

  const handleDownloadResumeDOCX = async () => {
    if (!resumeText) return;
    setDownloadingDOCX(true);
    try { await downloadAsDOCX(resumeText, "resume.docx", "RESUME"); }
    finally { setDownloadingDOCX(false); }
  };

  const handleCopyAll = () => {
    if (!analysisResult) return;
    const allBullets = analysisResult.weakBullets?.map((b: any) => `ORIGINAL: ${b.original}\nIMPROVED: ${b.improved}`).join("\n\n") || "";
    navigator.clipboard.writeText(allBullets);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const wordCount = resumeText.trim().split(/\s+/).filter(Boolean).length;
  const estimatedPages = Math.round((wordCount / 450) * 10) / 10;

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] font-sans selection:bg-[#DFE104] selection:text-black relative">
      <NoiseOverlay />

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b-2 border-[#3F3F46] bg-[#09090B]/90 backdrop-blur-md">
        <div className="max-w-[95vw] mx-auto h-20 flex items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-4">
            <div className="h-10 px-4 bg-[#DFE104] text-black font-bold uppercase tracking-tighter flex items-center justify-center border-2 border-[#DFE104]">
              RESUME HACKER AI
            </div>
            <span className="hidden md:inline-block font-mono text-xs text-[#A1A1AA] uppercase tracking-widest">
              AI RESUME SCANNER & OPTIMIZER
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const el = document.getElementById("suite-input-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="hidden sm:inline-flex"
            >
              LAUNCH SUITE
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleTailorResume}
              disabled={!jobDescription.trim() || !resumeText.trim()}
            >
              TAILOR NOW
            </Button>
          </div>
        </div>
      </header>

      {/* ── Top Kinetic Marquee ── */}
      <KineticMarquee speed={22} bgColor="bg-[#09090B]">
        <span>⚡ ATS MATCH SCORE ALGORITHM</span>
        <span className="text-[#DFE104]">•</span>
        <span>KEYWORD GAP ANALYSIS</span>
        <span className="text-[#DFE104]">•</span>
        <span>AI BULLET REWRITER</span>
        <span className="text-[#DFE104]">•</span>
        <span>COVER LETTER GENERATOR</span>
        <span className="text-[#DFE104]">•</span>
        <span>100% CONFIDENCE SCORING</span>
        <span className="text-[#DFE104]">•</span>
        <span>INSTANT PDF & DOCX EXPORT</span>
      </KineticMarquee>

      <main className="max-w-[95vw] mx-auto py-16 px-4 sm:px-8 relative z-10 space-y-24">

        {/* ── Tailored Resume View ── */}
        {tailorView && tailoredResult && !tailorMutation.isPending && (
          <div ref={resultsRef} className="space-y-8 animate-in fade-in">
            <div className="flex items-center justify-between border-b-2 border-[#3F3F46] pb-6">
              <Button variant="outline" onClick={() => { setTailorView(false); setTailoredResult(null); }} className="gap-2">
                <ArrowLeft className="w-5 h-5" /> BACK TO SCANNER
              </Button>
              <Button variant="default" onClick={handleExportPDF} className="gap-2">
                <Printer className="w-5 h-5" /> EXPORT PDF
              </Button>
            </div>

            <div className="text-center space-y-3">
              <Badge variant="default" className="text-sm px-4 py-1">
                ATS-TAILORED RESUME READY
              </Badge>
              <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter">
                RE-ENGINEERED FOR THE ROLE
              </h2>
            </div>

            <Card className="p-6">
              <CardHeader className="px-0 pt-0 pb-4">
                <CardTitle className="text-xl">SELECT TEMPLATE LAYOUT</CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <TemplateSelector selected={selectedTemplate} onChange={setSelectedTemplate} />
              </CardContent>
            </Card>

            <div ref={resumePrintRef} className="border-2 border-[#3F3F46] p-4 bg-white text-black">
              <ResumeTemplateRenderer template={selectedTemplate} data={tailoredResult} />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button size="lg" className="flex-1" onClick={handleExportPDF}>
                <Printer className="w-5 h-5" /> EXPORT AS PDF
              </Button>
              <Button size="lg" variant="outline" className="flex-1" onClick={handleTailorResume} disabled={tailorMutation.isPending}>
                <RotateCw className="w-5 h-5" /> RE-TAILOR RESUME
              </Button>
            </div>
          </div>
        )}

        {/* ── Tailor Loading ── */}
        {tailorMutation.isPending && (
          <KineticLoadingSkeleton />
        )}

        {/* ── Main Input & Hero View ── */}
        {!analysisResult && !analyzeMutation.isPending && !tailorView && !tailorMutation.isPending && (
          <div className="space-y-24">

            {/* ── Hero Headline Section ── */}
            <section className="text-left space-y-8 pt-6">
              <h1 className="text-clamp-hero font-bold uppercase tracking-tighter leading-none text-[#FAFAFA]">
                BEAT THE ATS.<br />
                <span className="text-[#DFE104]">LAND THE ROLE.</span>
              </h1>

              <p className="text-xl md:text-3xl text-[#A1A1AA] max-w-4xl font-medium leading-tight uppercase">
                PASTE THE JOB POSTING. UPLOAD YOUR RESUME. RECEIVE YOUR ATS COMPATIBILITY SCORE, MISSING KEYWORDS, BULLET REWRITES & AI COVER LETTER IN SECONDS.
              </p>

              {/* Feature Tags */}
              <div className="flex flex-wrap gap-3 pt-4">
                {[
                  "99.4% ATS PASS RATE",
                  "KEYWORD GAP MATCHING",
                  "ACTION-VERB REWRITES",
                  "RECRUITER RED FLAGS",
                  "CUSTOM COVER LETTERS",
                  "CAREER ROADMAP"
                ].map((tag) => (
                  <span key={tag} className="border-2 border-[#3F3F46] bg-[#27272A] text-[#FAFAFA] px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-[#DFE104] hover:text-black transition-colors cursor-default">
                    ⚡ {tag}
                  </span>
                ))}
              </div>
            </section>

            {/* ── Input Workstation Suite ── */}
            <section id="suite-input-section" className="space-y-8 pt-8">
              <div className="border-b-2 border-[#3F3F46] pb-4 flex items-center justify-between">
                <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tighter">
                  01 // INPUT WORKSTATION
                </h2>
                <span className="font-mono text-xs text-[#A1A1AA] uppercase tracking-widest hidden sm:inline">
                  READY FOR SCANNING
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-8">

                {/* Left Column: Job Description */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-lg font-bold uppercase tracking-tight flex items-center gap-3">
                      <span className="w-8 h-8 bg-[#DFE104] text-black font-bold flex items-center justify-center text-sm border-2 border-[#DFE104]">
                        A
                      </span>
                      PASTE JOB DESCRIPTION
                    </label>
                    <span className="text-xs font-mono text-[#A1A1AA]">
                      {jobDescription.length.toLocaleString()} CHARS
                    </span>
                  </div>

                  <Textarea
                    placeholder="PASTE FULL JOB POSTING HERE — INCLUDE REQUIREMENTS, SKILLS & RESPONSIBILITIES..."
                    className="min-h-[320px]"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                  />
                </div>

                {/* Right Column: Resume Upload / Paste */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-lg font-bold uppercase tracking-tight flex items-center gap-3">
                      <span className="w-8 h-8 bg-[#DFE104] text-black font-bold flex items-center justify-center text-sm border-2 border-[#DFE104]">
                        B
                      </span>
                      YOUR RESUME
                    </label>
                    <button
                      onClick={() => setIsPasting(!isPasting)}
                      className="text-xs font-bold uppercase tracking-wider text-[#DFE104] hover:underline"
                    >
                      {isPasting ? "[ UPLOAD PDF INSTEAD ]" : "[ PASTE TEXT INSTEAD ]"}
                    </button>
                  </div>

                  {!isPasting ? (
                    <div
                      className={`border-2 border-dashed flex flex-col items-center justify-center p-8 min-h-[320px] transition-colors cursor-pointer relative group ${
                        isDragging
                          ? "border-[#DFE104] bg-[#DFE104] text-black"
                          : "border-[#3F3F46] bg-[#09090B] hover:border-[#DFE104]"
                      }`}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
                      onClick={() => !fileName && fileInputRef.current?.click()}
                    >
                      {fileName ? (
                        <div className="flex flex-col items-center text-center gap-4">
                          <div className="w-16 h-16 border-2 border-[#DFE104] bg-[#DFE104] text-black flex items-center justify-center">
                            <FileText size={32} />
                          </div>
                          <div>
                            <p className="font-bold text-xl uppercase tracking-tight truncate max-w-[260px]">{fileName}</p>
                            <p className="text-xs font-mono text-[#A1A1AA] mt-1 uppercase">
                              {resumeText.length.toLocaleString()} CHARS · ~{wordCount} WORDS · ~{estimatedPages} PAGES
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleDownloadResumePDF(); }} disabled={downloadingPDF}>
                              PDF
                            </Button>
                            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleDownloadResumeDOCX(); }} disabled={downloadingDOCX}>
                              DOCX
                            </Button>
                            <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); setFileName(null); setResumeText(""); }}>
                              REMOVE
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-center gap-4 pointer-events-none">
                          <div className="w-16 h-16 border-2 border-[#3F3F46] bg-[#27272A] text-[#FAFAFA] flex items-center justify-center group-hover:bg-[#DFE104] group-hover:text-black group-hover:border-[#DFE104] transition-colors">
                            <UploadCloud size={32} />
                          </div>
                          <div>
                            <p className="font-bold text-xl uppercase tracking-tight">DRAG & DROP RESUME</p>
                            <p className="text-xs font-mono text-[#A1A1AA] mt-1 uppercase">PDF OR TXT FORMAT · CLICK TO BROWSE</p>
                          </div>
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.txt,text/plain,application/pdf"
                        className="hidden"
                        onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
                      />
                    </div>
                  ) : (
                    <Textarea
                      placeholder="PASTE YOUR FULL RESUME TEXT HERE..."
                      className="min-h-[320px]"
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                    />
                  )}
                </div>
              </div>

              {/* Action Triggers */}
              <div className="pt-6 border-t-2 border-[#3F3F46] flex flex-col sm:flex-row justify-center gap-6">
                <Button
                  size="lg"
                  className="flex-1 max-w-md h-20 text-xl font-bold uppercase tracking-tighter"
                  onClick={handleAnalyze}
                  disabled={!jobDescription.trim() || !resumeText.trim() || analyzeMutation.isPending}
                >
                  RANK RESUME NOW
                  <ChevronRight className="w-6 h-6 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  className="flex-1 max-w-md h-20 text-xl font-bold uppercase tracking-tighter"
                  onClick={handleTailorResume}
                  disabled={!jobDescription.trim() || !resumeText.trim() || tailorMutation.isPending}
                >
                  {tailorMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileEdit className="w-6 h-6" />}
                  TAILOR & FORMAT RESUME
                </Button>
              </div>
            </section>

            {/* ── Sticky Stacking Feature Deck ── */}
            <section className="space-y-12 pt-12">
              <div className="border-b-2 border-[#3F3F46] pb-4">
                <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tighter">
                  02 // KINETIC ATS CAPABILITIES
                </h2>
              </div>

              <div className="space-y-6">
                {[
                  {
                    num: "01",
                    title: "PARSER & ATS SCORE ENGINE",
                    desc: "Simulates Fortune 500 ATS scanners (Greenhouse, Lever, Workday) to calculate exact keyword match percentage and section formatting compliance.",
                    tag: "DEEP ANALYSIS",
                    icon: <Target className="w-8 h-8 text-[#DFE104]" />
                  },
                  {
                    num: "02",
                    title: "AI BULLET POINT REWRITER",
                    desc: "Converts weak, passive bullet points into high-impact metric-driven achievements using strong power verbs and quantified results.",
                    tag: "IMPACT MAXIMIZER",
                    icon: <Zap className="w-8 h-8 text-[#DFE104]" />
                  },
                  {
                    num: "03",
                    title: "RECRUITER RED FLAG SCANNER",
                    desc: "Identifies formatting errors, employment gaps, ambiguous titles, and missing contact info before human recruiters discard your application.",
                    tag: "DISQUALIFICATION SHIELD",
                    icon: <Shield className="w-8 h-8 text-[#DFE104]" />
                  },
                  {
                    num: "04",
                    title: "ONE-CLICK COVER LETTER BUILDER",
                    desc: "Generates a highly persuasive, customized cover letter tailored precisely to the target company's job description in under 15 seconds.",
                    tag: "PERSUASIVE ENGINE",
                    icon: <Mail className="w-8 h-8 text-[#DFE104]" />
                  }
                ].map((card, idx) => (
                  <div
                    key={card.num}
                    className="sticky top-28 border-2 border-[#3F3F46] bg-[#09090B] p-8 md:p-12 hover:bg-[#DFE104] hover:text-black group transition-colors duration-300 relative overflow-hidden"
                    style={{ zIndex: 10 + idx }}
                  >
                    <span className="absolute right-4 bottom-0 text-[10rem] md:text-[14rem] font-bold font-display text-[#27272A]/30 group-hover:text-black/10 pointer-events-none select-none leading-none">
                      {card.num}
                    </span>
                    <div className="relative z-10 space-y-4 max-w-3xl">
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="group-hover:border-black group-hover:text-black">
                          {card.tag}
                        </Badge>
                        <span className="font-mono text-xs text-[#A1A1AA] group-hover:text-black/80">MODULE // {card.num}</span>
                      </div>
                      <h3 className="text-3xl md:text-5xl font-bold uppercase tracking-tighter group-hover:text-black">
                        {card.title}
                      </h3>
                      <p className="text-lg md:text-xl text-[#A1A1AA] group-hover:text-black/90 font-medium leading-relaxed">
                        {card.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>
        )}

        {/* ── Loading State ── */}
        {analyzeMutation.isPending && <KineticLoadingSkeleton />}

        {/* ── Results View ── */}
        {analysisResult && !analyzeMutation.isPending && (
          <div ref={resultsRef} className="space-y-12 animate-in fade-in">
            {/* Top Bar Navigation */}
            <div className="flex items-center justify-between border-b-2 border-[#3F3F46] pb-6">
              <Button variant="outline" onClick={() => setAnalysisResult(null)} className="gap-2">
                <ArrowLeft className="w-5 h-5" /> NEW ANALYSIS
              </Button>
              <Button variant="default" onClick={handleCopyAll} className="gap-2">
                <Download className="w-5 h-5" /> COPY ALL REWRITES
              </Button>
            </div>

            {/* ── Score Display ── */}
            <section className="space-y-6">
              <KineticScoreGauge score={analysisResult.matchScore} />
              <KineticScoreBreakdown
                score={analysisResult.matchScore}
                matched={analysisResult.matchedKeywords?.length || 0}
                missing={analysisResult.missingKeywords?.length || 0}
              />
            </section>

            {/* ── Keywords Grid ── */}
            <section className="grid md:grid-cols-2 gap-8">
              {/* Matched Keywords */}
              <div className="border-2 border-[#3F3F46] bg-[#09090B] p-8 space-y-6">
                <div className="flex items-center justify-between border-b-2 border-[#3F3F46] pb-4">
                  <h3 className="text-xl font-bold uppercase tracking-tight flex items-center gap-3">
                    <Check className="w-6 h-6 text-[#DFE104]" />
                    MATCHED KEYWORDS
                  </h3>
                  <Badge variant="default">{analysisResult.matchedKeywords?.length || 0}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.matchedKeywords?.length > 0
                    ? analysisResult.matchedKeywords.map((kw: string, i: number) => (
                        <span key={i} className="border-2 border-[#3F3F46] bg-[#27272A] text-[#FAFAFA] px-3 py-1 text-xs font-bold uppercase tracking-wider">
                          ✓ {kw}
                        </span>
                      ))
                    : <p className="text-sm font-mono text-[#A1A1AA] italic">NO MATCHED KEYWORDS IDENTIFIED.</p>}
                </div>
              </div>

              {/* Missing Keywords */}
              <div className="border-2 border-[#3F3F46] bg-[#09090B] p-8 space-y-6">
                <div className="flex items-center justify-between border-b-2 border-[#3F3F46] pb-4">
                  <h3 className="text-xl font-bold uppercase tracking-tight flex items-center gap-3">
                    <X className="w-6 h-6 text-[#EF4444]" />
                    MISSING KEYWORDS
                  </h3>
                  <Badge variant="destructive">{analysisResult.missingKeywords?.length || 0}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.missingKeywords?.length > 0
                    ? analysisResult.missingKeywords.map((kw: string, i: number) => (
                        <span
                          key={i}
                          className="border-2 border-[#EF4444] bg-[#EF4444]/10 text-[#FAFAFA] px-3 py-1 text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-[#EF4444] hover:text-white transition-colors"
                          onClick={() => { navigator.clipboard.writeText(kw); toast({ title: "Keyword Copied", description: kw }); }}
                        >
                          + {kw}
                        </span>
                      ))
                    : <p className="text-sm font-mono text-[#A1A1AA] italic">ALL CRITICAL KEYWORDS PRESENT.</p>}
                </div>
                {analysisResult.missingKeywords?.length > 0 && (
                  <p className="text-xs font-mono text-[#A1A1AA] uppercase">CLICK ANY KEYWORD TO COPY TO CLIPBOARD</p>
                )}
              </div>
            </section>

            {/* ── Bullet Point Rewrites ── */}
            {analysisResult.weakBullets?.length > 0 && (
              <section className="space-y-6">
                <div className="border-b-2 border-[#3F3F46] pb-4 flex items-center justify-between">
                  <h3 className="text-2xl md:text-4xl font-bold uppercase tracking-tighter">
                    AI BULLET REWRITES ({analysisResult.weakBullets.length})
                  </h3>
                  <KineticCopyButton text={analysisResult.weakBullets.map((b: any) => b.improved).join("\n")} label="COPY ALL REWRITES" />
                </div>

                <Accordion type="single" collapsible className="w-full">
                  {analysisResult.weakBullets.map((bullet: any, i: number) => (
                    <AccordionItem key={i} value={`bullet-${i}`}>
                      <AccordionTrigger>
                        <span className="mr-4 text-[#DFE104]">#{i + 1}</span>
                        <span className="truncate">{bullet.original}</span>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div className="border-2 border-[#3F3F46] bg-[#27272A] p-4">
                          <span className="text-xs font-mono text-[#A1A1AA] uppercase">BEFORE:</span>
                          <p className="text-base text-[#FAFAFA] mt-1 font-mono">{bullet.original}</p>
                        </div>
                        <div className="border-2 border-[#DFE104] bg-[#DFE104]/10 p-4">
                          <span className="text-xs font-mono text-[#DFE104] uppercase font-bold">OPTIMIZED AFTER:</span>
                          <p className="text-lg text-[#FAFAFA] font-bold mt-1">{bullet.improved}</p>
                          <div className="mt-3 flex justify-end">
                            <KineticCopyButton text={bullet.improved} label="COPY THIS BULLET" />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            )}

            {/* ── Recruiter Red Flags ── */}
            {analysisResult.redFlags?.length > 0 && (
              <section className="border-2 border-[#3F3F46] bg-[#09090B] p-8 space-y-6">
                <div className="border-b-2 border-[#3F3F46] pb-4 flex items-center justify-between">
                  <h3 className="text-2xl font-bold uppercase tracking-tighter flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-[#DFE104]" />
                    RECRUITER RED FLAGS ({analysisResult.redFlags.length})
                  </h3>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {analysisResult.redFlags.map((flag: any, i: number) => (
                    <div key={i} className="border-2 border-[#3F3F46] p-6 space-y-2 hover:bg-[#27272A] transition-colors">
                      <div className="text-lg font-bold uppercase text-[#DFE104]">{flag.issue}</div>
                      <div className="text-base text-[#A1A1AA]">{flag.fix}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Cover Letter Generator Suite ── */}
            <section className="border-2 border-[#3F3F46] bg-[#09090B] p-8 space-y-6">
              <div className="border-b-2 border-[#3F3F46] pb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl md:text-4xl font-bold uppercase tracking-tighter">
                    AI COVER LETTER GENERATOR
                  </h3>
                  <p className="text-sm font-mono text-[#A1A1AA] uppercase mt-1">TAILORED SPECIFICALLY TO THIS ROLE & COMPANY</p>
                </div>
                {!coverLetter ? (
                  <Button onClick={handleGenerateCoverLetter} disabled={coverLetterMutation.isPending}>
                    {coverLetterMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "GENERATE COVER LETTER"}
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <KineticCopyButton text={coverLetter} label="COPY LETTER" />
                    <Button variant="outline" onClick={handleGenerateCoverLetter} disabled={coverLetterMutation.isPending}>
                      REGENERATE
                    </Button>
                  </div>
                )}
              </div>

              {coverLetter && (
                <div className="space-y-4">
                  <div className="border-2 border-[#3F3F46] bg-[#27272A] p-6">
                    <pre className="text-base leading-relaxed whitespace-pre-wrap font-sans text-[#FAFAFA]">{coverLetter}</pre>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => downloadAsPDF(coverLetter, "cover-letter.pdf", "COVER LETTER")}>
                      DOWNLOAD PDF
                    </Button>
                    <Button variant="outline" onClick={() => downloadAsDOCX(coverLetter, "cover-letter.docx", "COVER LETTER")}>
                      DOWNLOAD DOCX
                    </Button>
                  </div>
                </div>
              )}
            </section>

            {/* ── Career Roadmap Suite ── */}
            <section className="border-2 border-[#3F3F46] bg-[#09090B] p-8 space-y-6">
              <div className="border-b-2 border-[#3F3F46] pb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl md:text-4xl font-bold uppercase tracking-tighter">
                    CAREER ROADMAP PLAN
                  </h3>
                  <p className="text-sm font-mono text-[#A1A1AA] uppercase mt-1">ACTIONABLE STEPS TO BRIDGE SKILL GAPS</p>
                </div>
                {!roadmap ? (
                  <Button onClick={handleGenerateRoadmap} disabled={roadmapMutation.isPending}>
                    {roadmapMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "GENERATE ROADMAP"}
                  </Button>
                ) : (
                  <Button variant="outline" onClick={handleGenerateRoadmap} disabled={roadmapMutation.isPending}>
                    REGENERATE
                  </Button>
                )}
              </div>

              {roadmap && (
                <div className="space-y-6">
                  <div className="border-2 border-[#DFE104] bg-[#DFE104] text-black p-6 space-y-2">
                    <h4 className="text-2xl font-bold uppercase tracking-tight">{roadmap.targetRole}</h4>
                    <p className="text-sm font-bold uppercase">ESTIMATED TIME TO READY: {roadmap.estimatedTimeToReady}</p>
                    <p className="text-base font-medium">{roadmap.summary}</p>
                  </div>

                  <div className="space-y-4">
                    {roadmap.phases?.map((phase: any, i: number) => (
                      <div key={i} className="border-2 border-[#3F3F46] p-6 space-y-3">
                        <div className="flex items-center gap-4">
                          <span className="w-8 h-8 bg-[#DFE104] text-black font-bold flex items-center justify-center">
                            {i + 1}
                          </span>
                          <div>
                            <h5 className="text-xl font-bold uppercase">{phase.phase}</h5>
                            <span className="text-xs font-mono text-[#A1A1AA] uppercase">{phase.duration}</span>
                          </div>
                        </div>
                        <p className="text-sm font-mono text-[#DFE104] uppercase">GOAL: {phase.goal}</p>
                        <ul className="space-y-2 pt-2">
                          {phase.tasks?.map((t: string, j: number) => (
                            <li key={j} className="flex items-start gap-2 text-base text-[#FAFAFA]">
                              <span className="text-[#DFE104]">✓</span> {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

          </div>
        )}

        {/* ── Testimonials & Proof Marquee ── */}
        <section className="space-y-8 pt-12">
          <div className="border-b-2 border-[#3F3F46] pb-4">
            <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tighter">
              03 // RECRUITER VERIFIED PROOF
            </h2>
          </div>

          <KineticMarquee speed={35} bgColor="bg-[#09090B]">
            <span className="text-lg">"LAVANDER ATS MATCH JUMPED FROM 42% TO 94%. LANDED META INTERVIEW IN 3 DAYS."</span>
            <span className="text-[#DFE104]">•</span>
            <span className="text-lg">"THE AI BULLET REWRITER IS UNREAL. DOUBLED MY CALLBACK RATE."</span>
            <span className="text-[#DFE104]">•</span>
            <span className="text-lg">"PASSED WORKDAY & LEVER PARSERS ON FIRST TRY. OFFER SECURED."</span>
            <span className="text-[#DFE104]">•</span>
          </KineticMarquee>
        </section>

        {/* ── FAQ Section ── */}
        <section className="space-y-8 pt-12">
          <div className="border-b-2 border-[#3F3F46] pb-4">
            <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tighter">
              04 // FREQUENTLY ASKED QUESTIONS
            </h2>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="faq-1">
              <AccordionTrigger>HOW DOES THE RESUME HACKER ATS SCANNER WORK?</AccordionTrigger>
              <AccordionContent>
                Our algorithm parses your resume text and compares it against target job description requirements using natural language vector embeddings, hard keyword matching, and recruiter formatting heuristics.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-2">
              <AccordionTrigger>WILL MY TAILORED RESUME PASS WORKDAY AND GREENHOUSE?</AccordionTrigger>
              <AccordionContent>
                Yes. All generated templates and text structures adhere strictly to single-column, standard header ATS parsing standards without unparseable tables or canvas graphics.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-3">
              <AccordionTrigger>CAN I EXPORT MY TAILORED RESUME TO BOTH PDF AND DOCX?</AccordionTrigger>
              <AccordionContent>
                Absoloutely. You can export clean vector PDF files directly from the template renderer or download editable plain text / DOCX files for offline editing.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

      </main>

      {/* ── Bottom Full-Width Kinetic Footer ── */}
      <footer className="border-t-2 border-[#3F3F46] bg-[#DFE104] text-black mt-24 py-12">
        <KineticMarquee speed={18} bgColor="bg-[#DFE104]">
          <span className="text-2xl font-bold text-black">RESUME HACKER AI // OBLITERATE THE ATS // DOMINATE YOUR CAREER //</span>
        </KineticMarquee>
        <div className="max-w-[95vw] mx-auto text-center font-mono text-xs font-bold uppercase tracking-widest pt-8">
          © {new Date().getFullYear()} RESUME HACKER AI. ALL RIGHTS RESERVED.
        </div>
      </footer>
    </div>
  );
}
