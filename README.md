# StudyAny Local

Local-first study web app for private course workspaces, uploaded files, pasted notes, course-level context libraries, adaptive quiz sessions, and local model providers such as Ollama or LM Studio.

## What It Does

- Runs as a local Next.js app with App Router and TypeScript
- Stores metadata, sessions, settings, analytics, and shared course context in local SQLite
- Stores uploaded files, images, and exports on the local filesystem
- Supports simplified local model selection for Ollama and LM Studio
- Ingests `PDF`, `DOCX`, `TXT`, `Markdown`, images, and pasted text
- Supports shared course-level context so reusable files and screenshots do not have to be re-uploaded per workspace
- Builds topic summaries, flashcards, and question banks from source material
- Starts quiz sessions with grading, mistake tracking, and review queue updates
- Exports a workspace as a portable zip package and imports prior packages

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- SQLite via `better-sqlite3`
- Local filesystem storage under `local-data/`
- Local provider abstraction over OpenAI-compatible endpoints
- `pdf-parse` and `mammoth` for document extraction
- Vitest for unit tests

## Local Model Support

Supported provider profiles:

- Ollama: default URL `http://127.0.0.1:11434/v1`
- LM Studio: default URL `http://127.0.0.1:1234/v1`

The app owns session history, question state, mistake tracking, and retrieval state. It does not depend on provider-side memory.

Recommended starting models for an RTX 3080:

- `qwen3:8b` for the safest fast text setup
- `qwen3:14b` if your card/setup handles it well and you want a stronger text model
- `qwen3-vl:8b` if you want image context support
- `gpt-oss:20b` only if you accept higher memory pressure and slower inference

## Folder Structure

```text
.
|-- examples/
|   `-- sample-workspace.manifest.json
|-- local-data/
|   |-- course-context/
|   |-- exports/
|   |-- seed/
|   |-- uploads/
|   `-- study-any.sqlite
|-- src/
|   |-- app/
|   |   |-- api/
|   |   |-- courses/
|   |   |-- paste/
|   |   |-- settings/
|   |   |-- upload/
|   |   `-- workspace/[workspaceId]/
|   |-- components/
|   `-- lib/
|       |-- server/
|       |   |-- ingest/
|       |   |-- llm/
|       |   |-- providers/
|       |   |-- bootstrap.ts
|       |   |-- db.ts
|       |   |-- repository.ts
|       |   |-- seed.ts
|       |   |-- session-builder.ts
|       |   |-- storage.ts
|       |   |-- study-pipeline.ts
|       |   `-- workspace-package.ts
|       |-- schemas.ts
|       `-- utils.ts
|-- .env.example
`-- vitest.config.ts
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Optional: copy `.env.example` to `.env.local` if you want to override the local data directory.

3. Optional but recommended: seed a sample workspace and default provider profiles.

```bash
npm run seed
```

4. Start the app:

```bash
npm run dev
```

5. Open `http://localhost:3000`

## Provider Setup

### Ollama

Start an OpenAI-compatible local server, for example:

```bash
ollama serve
```

Then in the app:

- Provider type: `ollama`
- Base URL: `http://127.0.0.1:11434/v1`
- Model name: your local chat or vision model

### LM Studio

Start LM Studio local server mode, then use:

- Provider type: `lmstudio`
- Base URL: `http://127.0.0.1:1234/v1`
- Model name: the served model id

Use the Settings page to test the connection and fetch available models.

## Core Workflow

1. Create a course and workspace from the dashboard or a course page
2. Attach reusable files or screenshots to the course if they should help multiple workspaces
3. Upload files or paste notes into a workspace
4. The app extracts text, creates image summaries where possible, chunks content, stores it locally, and builds topics/questions
5. Start a quiz session from the workspace page
6. Submit answers and receive local grading
7. Review mistakes later in Mistake Review
8. Export the workspace as a zip for another machine

## Completed MVP Features

- Dashboard with local workspace overview
- More intuitive course and workspace creation
- Course and workspace archive/delete actions
- Course detail page with shared course context library
- Provider settings with simplified model selection, grading strictness, health check, and model list fetch
- File and image upload flow
- Paste import flow
- Heuristic parsing plus local-model-backed topic/question generation
- Question bank generation with structured validation and fallback logic
- Quiz sessions with grading, confidence capture, and review queue updates
- Mistake review page
- Analytics page
- Workspace export to zip
- Workspace import from zip or JSON manifest
- Seed workspace example
- Unit tests for parsing, schema validation, and fallback grading

## Implementation Notes

- The app stores all important data locally under `local-data/`.
- SQLite stores metadata, sessions, responses, review queue, analytics, provider profiles, and course context assets.
- Documents are chunked locally and can optionally store embeddings when a provider embedding model is configured.
- Images are handled efficiently by storing the original file locally and indexing only a compact textual summary or note.
- If structured JSON generation fails, the app falls back to deterministic local heuristics instead of crashing.
- Retrieval currently uses lexical fallback first and optional embedding similarity when embeddings are available.

## Commands

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run seed
```

## Known Limitations

- Generated topics and questions are persisted locally, but in-app editing/regeneration controls are not implemented yet.
- Embedding-based retrieval depends on the configured local provider exposing an embeddings endpoint.
- Reranking is not implemented yet.
- Export currently packages manifest data and extracted document text; it does not reconstruct original binary uploads.
- Image understanding quality depends on whether the selected local model actually supports vision.
- The UI is built for a single local user and does not include auth or multi-profile separation.

## Next Steps

- Add full CRUD editing for topics, flashcards, and questions
- Add richer spaced repetition scheduling
- Add more question types and topic filters
- Improve semantic retrieval with stronger embedding defaults
- Add PWA/offline shell support
- Add OCR fallback for scanned PDFs
