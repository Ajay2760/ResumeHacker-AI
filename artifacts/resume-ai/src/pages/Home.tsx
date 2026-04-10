import { useState, useCallback, useRef } from "react";
import { useAnalyzeResume } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { extractTextFromPDF } from "@/lib/pdf";
import { Loader2, UploadCloud, X, CheckCircle2, AlertTriangle, FileText, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPasting, setIsPasting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const analyzeMutation = useAnalyzeResume();
  const { toast } = useToast();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    
    if (file.type === "application/pdf") {
      setFileName(file.name);
      try {
        const text = await extractTextFromPDF(file);
        setResumeText(text);
      } catch (err: any) {
        toast({
          title: "Error parsing PDF",
          description: err.message,
          variant: "destructive",
        });
        setFileName(null);
      }
    } else if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      setFileName(file.name);
      const text = await file.text();
      setResumeText(text);
    } else {
      toast({
        title: "Unsupported file type",
        description: "Please upload a PDF or plain text file.",
        variant: "destructive",
      });
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleRemoveFile = () => {
    setFileName(null);
    setResumeText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
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

    analyzeMutation.mutate({
      data: {
        jobDescription: jobDescription.trim(),
        resumeText: resumeText.trim()
      }
    }, {
      onSuccess: (result) => {
        setAnalysisResult(result);
        toast({
          title: "Analysis complete",
          description: "Your resume has been successfully analyzed.",
          className: "bg-green-50 border-green-200 text-green-900",
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      onError: (err: any) => {
        toast({
          title: "Analysis failed",
          description: err.message || "An error occurred during analysis.",
          variant: "destructive",
        });
      }
    });
  };

  const resetAnalysis = () => {
    setAnalysisResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl leading-none">R</div>
            <span className="font-bold text-xl tracking-tight">ResumeAI</span>
          </div>
          <div className="text-sm text-slate-500 font-medium hidden sm:block">
            Get past the ATS. Impress the human.
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {!analysisResult && !analyzeMutation.isPending && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h1 className="text-4xl font-extrabold tracking-tight mb-3 text-slate-900">Optimize your resume for the exact role.</h1>
              <p className="text-lg text-slate-600">Our AI analyzes your resume against the job description to find missing keywords, weak bullets, and red flags before you apply.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Left Col: Job Description */}
              <div className="space-y-3">
                <Label htmlFor="job-description" className="text-base font-semibold">1. Paste the job description</Label>
                <Textarea 
                  id="job-description"
                  placeholder="Copy the full job posting here — the more detail, the better."
                  className="min-h-[300px] resize-y bg-white border-slate-200 focus-visible:ring-primary shadow-sm"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  data-testid="input-job-description"
                />
              </div>

              {/* Right Col: Resume */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">2. Provide your resume</Label>
                  <button 
                    onClick={() => setIsPasting(!isPasting)}
                    className="text-sm text-primary hover:underline font-medium"
                    data-testid="button-toggle-paste"
                  >
                    {isPasting ? "Upload a file instead" : "Or paste your resume text"}
                  </button>
                </div>

                {!isPasting ? (
                  <div 
                    className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 min-h-[300px] transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-slate-300 bg-white hover:bg-slate-50'}`}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    data-testid="dropzone-resume"
                  >
                    {fileName ? (
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <FileText size={32} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 truncate max-w-[200px]" title={fileName}>{fileName}</p>
                          <p className="text-sm text-slate-500 mt-1">Resume extracted: {resumeText.length.toLocaleString()} characters</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleRemoveFile} className="mt-2" data-testid="button-remove-file">
                          <X className="w-4 h-4 mr-2" /> Remove file
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <UploadCloud size={32} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-700">Drag & drop your resume</p>
                          <p className="text-sm text-slate-500 mt-1">Supports PDF or plain text</p>
                        </div>
                        <Button variant="secondary" onClick={() => fileInputRef.current?.click()} data-testid="button-browse-files">
                          Browse files
                        </Button>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept=".pdf,.txt,text/plain,application/pdf" 
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              handleFile(e.target.files[0]);
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <Textarea 
                    placeholder="Paste your full resume text here..."
                    className="min-h-[300px] resize-y bg-white border-slate-200 focus-visible:ring-primary shadow-sm"
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    data-testid="input-resume-text"
                  />
                )}
                {isPasting && resumeText.length > 0 && (
                   <p className="text-xs text-slate-500 text-right">Characters: {resumeText.length.toLocaleString()}</p>
                )}
              </div>
            </div>

            <div className="flex justify-center pt-6 border-t border-slate-200">
              <Button 
                size="lg" 
                className="w-full md:w-auto min-w-[240px] text-lg h-14 rounded-full shadow-md font-semibold"
                onClick={handleAnalyze}
                disabled={!jobDescription.trim() || !resumeText.trim()}
                data-testid="button-analyze"
              >
                Analyze My Resume <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {analyzeMutation.isPending && (
          <div className="space-y-6 max-w-3xl mx-auto py-10 animate-in fade-in">
            <div className="text-center space-y-4 mb-10">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
              <h2 className="text-2xl font-bold">Analyzing your resume...</h2>
              <p className="text-slate-500">Cross-referencing skills, formatting, and impact metrics.</p>
            </div>
            <Skeleton className="h-[200px] w-full rounded-2xl" />
            <div className="grid md:grid-cols-2 gap-6">
              <Skeleton className="h-[300px] w-full rounded-2xl" />
              <Skeleton className="h-[300px] w-full rounded-2xl" />
            </div>
          </div>
        )}

        {analysisResult && !analyzeMutation.isPending && (
          <div className="space-y-8 animate-in slide-in-from-bottom-8 fade-in duration-700">
            <Button variant="ghost" className="mb-4" onClick={resetAnalysis} data-testid="button-back">
              ← Analyze another resume
            </Button>

            {/* COMPONENT 1: Score */}
            <Card className="overflow-hidden border-0 shadow-lg bg-white">
              <div className="p-8 md:p-12 flex flex-col items-center justify-center text-center relative">
                {/* Background decoration */}
                <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-white z-0 pointer-events-none"></div>
                
                <div className="relative z-10 mb-6">
                  <ScoreRing score={analysisResult.matchScore} />
                </div>
                
                <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-2 relative z-10">ATS Compatibility Score</h2>
                <p className="text-slate-600 text-lg relative z-10 max-w-xl">
                  {analysisResult.matchScore >= 90 ? "Excellent! Your resume is highly optimized for this role." :
                   analysisResult.matchScore >= 71 ? "Good match. With a few tweaks, you'll be in the top tier." :
                   analysisResult.matchScore >= 41 ? "Needs work. You're missing key requirements for this position." :
                   "Poor match. Consider significantly revising your resume or looking for a better fit."}
                </p>
              </div>
            </Card>

            {/* COMPONENT 2: Keywords */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex justify-between items-center">
                    Keywords You Have
                    <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">{analysisResult.matchedKeywords?.length || 0} matched</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.matchedKeywords?.length > 0 ? (
                      analysisResult.matchedKeywords.map((kw: string, i: number) => (
                        <Badge key={i} variant="outline" className="bg-green-50 border-green-200 text-green-800 py-1 px-3">
                          {kw}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-slate-500 text-sm italic">No matching keywords found.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex justify-between items-center">
                    Missing Keywords
                    <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-100">{analysisResult.missingKeywords?.length || 0} missing</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.missingKeywords?.length > 0 ? (
                      analysisResult.missingKeywords.map((kw: string, i: number) => (
                        <Badge key={i} variant="outline" className="bg-red-50 border-red-200 text-red-800 py-1 px-3">
                          {kw}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-slate-500 text-sm italic">Great! You hit all the main keywords.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* COMPONENT 3: Bullet Point Rewriter */}
            {analysisResult.weakBullets?.length > 0 && (
              <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50 border-b border-slate-100">
                  <CardTitle className="text-xl">Bullet Point Rewriter</CardTitle>
                  <CardDescription>We identified {analysisResult.weakBullets.length} bullet points that could be stronger.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Accordion type="single" collapsible className="w-full">
                    {analysisResult.weakBullets.map((bullet: any, i: number) => (
                      <AccordionItem key={i} value={`item-${i}`} className="border-b last:border-0 px-6">
                        <AccordionTrigger className="hover:no-underline py-4 text-left">
                          <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold mt-0.5">{i+1}</span>
                            <span className="text-slate-700 line-clamp-1 flex-1 font-normal text-sm md:text-base pr-4">{bullet.original}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-6 pt-2">
                          <div className="space-y-4 pl-9">
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 relative">
                              <span className="absolute -top-2.5 left-4 bg-slate-200 text-slate-700 text-xs font-bold px-2 py-0.5 rounded">Before</span>
                              <p className="text-slate-600 text-sm mt-1">{bullet.original}</p>
                            </div>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 relative">
                              <span className="absolute -top-2.5 left-4 bg-green-200 text-green-800 text-xs font-bold px-2 py-0.5 rounded">Improved</span>
                              <p className="text-green-900 text-sm mt-1 font-medium">{bullet.improved}</p>
                              <div className="mt-4 flex justify-end">
                                <CopyButton text={bullet.improved} />
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

            {/* COMPONENT 4: Red Flags */}
            {analysisResult.redFlags?.length > 0 && (
              <Card className="border-amber-200 bg-amber-50/30 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center text-amber-900">
                    <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" />
                    Recruiter Red Flags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analysisResult.redFlags.map((flag: any, i: number) => (
                      <div key={i} className="bg-white border border-amber-200 rounded-lg p-4 shadow-sm flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-slate-900">{flag.issue}</h4>
                          <p className="text-sm text-slate-600 mt-1">{flag.fix}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* COMPONENT 5: AI Feedback Summary */}
            {analysisResult.summary && (
              <Card className="border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                <CardHeader>
                  <CardTitle className="text-xl flex justify-between items-start">
                    AI Feedback Summary
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-normal text-slate-500 uppercase tracking-wider">Confidence Level</span>
                      <Badge className={
                        analysisResult.summary.confidenceLevel === 'High' ? 'bg-green-100 text-green-800 hover:bg-green-100' :
                        analysisResult.summary.confidenceLevel === 'Medium' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' :
                        'bg-red-100 text-red-800 hover:bg-red-100'
                      }>
                        {analysisResult.summary.confidenceLevel}
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Overall Impression</h4>
                    <p className="text-slate-600 leading-relaxed">{analysisResult.summary.overallImpression}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Key Strengths</h4>
                    <p className="text-slate-600 leading-relaxed">{analysisResult.summary.keyStrengths}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Priority Improvements</h4>
                    <p className="text-slate-600 leading-relaxed">{analysisResult.summary.priorityImprovements}</p>
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="font-semibold text-slate-900 mb-2">Final Recommendation</h4>
                    <p className="text-slate-600 leading-relaxed italic">{analysisResult.summary.finalRecommendation}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  // Color determination
  let colorClass = "text-red-500";
  if (score >= 90) colorClass = "text-green-500";
  else if (score >= 71) colorClass = "text-blue-500";
  else if (score >= 41) colorClass = "text-amber-500";

  const radius = 60;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-48 h-48 drop-shadow-xl" data-testid="score-ring">
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="text-slate-100"
        />
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className={`transition-all duration-1000 ease-out animate-progress-ring ${colorClass}`}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className={`text-5xl font-black tracking-tighter ${colorClass}`}>{score}</span>
        <span className="text-sm font-bold text-slate-400">/ 100</span>
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button 
      size="sm" 
      variant="outline" 
      onClick={handleCopy} 
      className={`transition-colors ${copied ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100 hover:text-green-800' : 'bg-white hover:bg-slate-50'}`}
      data-testid="button-copy-bullet"
    >
      {copied ? <><Check className="w-4 h-4 mr-2" /> Copied</> : "Copy improved bullet"}
    </Button>
  );
}
