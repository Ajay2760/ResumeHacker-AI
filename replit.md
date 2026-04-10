# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: Anthropic Claude (via Replit AI Integrations, no user API key needed)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Applications

### ResumeAI (`artifacts/resume-ai`)
- **Purpose**: AI-powered resume analyzer that helps job seekers beat ATS systems
- **Preview path**: `/` (root)
- **Stack**: React + Vite + TailwindCSS + shadcn/ui
- **Features**:
  - PDF resume upload and text extraction (pdfjs-dist, client-side)
  - Drag-and-drop upload zone
  - ATS match score with animated circular progress ring
  - Keyword analysis (matched vs. missing)
  - Bullet point rewriter (before/after with copy buttons)
  - Recruiter red flags with fix suggestions
  - AI feedback summary with confidence level
  - Dark mode support, mobile responsive

### API Server (`artifacts/api-server`)
- **Routes**: `/api/healthz`, `/api/resume/analyze`
- **AI integration**: Anthropic Claude claude-sonnet-4-6 via Replit AI Integrations
- **Key file**: `artifacts/api-server/src/routes/resume.ts`

## AI Integration

Uses Replit AI Integrations for Anthropic (no user API key required).
- Env vars: `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`, `AI_INTEGRATIONS_ANTHROPIC_API_KEY`
- Library: `@workspace/integrations-anthropic-ai`
