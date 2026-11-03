# Octonote Feature Implementation & Technical Guide

This document provides an in-depth breakdown of how every feature in **Octonote** is implemented, the algorithms used, and its specific operational boundaries.

---

## 1. WhatsApp Import & Stream Parsing

### How It Works
- **File Input**: Users select or drag-and-drop `.txt` or `.zip` WhatsApp export files via [`ImportModal.tsx`](file:///c:/Users/yesuraju/OneDrive/PROJECTS/hackathons/projects/OCTONOTE/src/components/modals/ImportModal.tsx).
- **In-Memory ZIP Handling** ([`zip-handler.ts`](file:///c:/Users/yesuraju/OneDrive/PROJECTS/hackathons/projects/OCTONOTE/src/core/parser/zip-handler.ts)):
  - Uses `fflate.unzipSync` to decompress files in-memory without disk temporary writes.
  - **Zip Slip Defense**: Validates every archive entry with `isPathTraversalAttempt()`. Rejects paths containing `../`, `..\`, absolute prefixes (`/`, `C:\`), or null bytes.
  - **Zip Bomb Defense**: Rejects files exceeding `MAX_UNCOMPRESSED_SIZE` (50MB) or an expansion compression ratio exceeding `100:1`.
- **Parsing Engine** ([`whatsapp-parser.ts`](file:///c:/Users/yesuraju/OneDrive/PROJECTS/hackathons/projects/OCTONOTE/src/core/parser/whatsapp-parser.ts)):
  - Iterates over text line-by-line while tracking starting and ending line indices.
  - **Android Format**: Matches `^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\s+-\s+(?:([^:]+):\s+)?(.*)$`.
  - **iOS Format**: Matches `^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\]\s+(?:([^:]+):\s+)?(.*)$`.
  - **Multiline Buffering**: Any line not starting with a timestamp regex is automatically buffered as a body continuation of the previous message.
  - **System Notice Handling**: Messages without an author colon (`Messages and calls are end-to-end encrypted`) are flagged as `isSystem: true` with `sender: null`.

### Known Limitations
- Media attachments (images, voice notes, videos) are not parsed or unpacked. Standard WhatsApp placeholder strings (e.g., `<Media omitted>`) are preserved as ordinary message text.
- Unusual or heavily customized third-party WhatsApp client date formats that deviate from standard Android/iOS patterns may produce line parsing warnings.

---

## 2. Resource Extraction

### How It Works ([`url-extractor.ts`](file:///c:/Users/yesuraju/OneDrive/PROJECTS/hackathons/projects/OCTONOTE/src/core/extractor/url-extractor.ts))
- **Scope**: Extracts explicit `http://` and `https://` URLs using regex: `https?:\/\/[^\s<>"'`]+`.
- **Punctuation Trimming**: Strips trailing sentence punctuation frequently appended in messages (`.`, `,`, `!`, `?`, `:`, quotes).
- **Balanced Parentheses**: Preserves balanced parentheses within URLs (essential for Wikipedia articles such as `https://en.wikipedia.org/wiki/Octopus_(disambiguation)`).
- **URL Syntax Validation**: Normalizes hosts and paths via the Web standard `new URL()` constructor.
- **Inferred Display Labels**: Applies deterministic domain/path rules without network probing:
  - `github.com` &rarr; "GitHub link"
  - `youtube.com` / `youtu.be` &rarr; "YouTube link"
  - `*.pdf` &rarr; "PDF document link"
  - Default &rarr; "Web link"

### Known Limitations
- Bare domains lacking a protocol prefix (e.g. `www.example.com` or `example.com`) are excluded by design to prevent false-positive extraction of filenames or domain-like phrases.
- URLs are not scraped or unfurled (no OpenGraph preview tags or live page inspection) to guarantee zero network leakage.

---

## 3. Full-Text Search

### How It Works ([`search-service.ts`](file:///c:/Users/yesuraju/OneDrive/PROJECTS/hackathons/projects/OCTONOTE/src/core/search/search-service.ts))
- **Index Architecture**: An in-memory [`MiniSearch`](https://lucaong.github.io/minisearch/) index is constructed over both message bodies and extracted URL resources.
- **Query Processing**:
  - `fuzzy: 0.2` (tolerates minor spelling mistakes).
  - `prefix: true` (auto-completes partial words).
  - Boost factors: message content (`2.0`), resource display label (`1.5`), raw URL (`1.2`).
- **Centered Excerpting**: Computes a dynamic 140-character window centered on the highest-scoring query term.
- **Scoped Filters**: Supports filtering by `all`, `messages`, or `resources`, plus conversation filtering.
- **Fallback**: Includes a graceful substring search fallback if malformed search query tokens are provided.

### Known Limitations
- The search index is held in-memory and re-indexed client-side when workspace data updates. For workspaces with hundreds of thousands of messages, initial index building takes a few hundred milliseconds.

---

## 4. Extractive Summaries & Grounded Insights

### How It Works ([`summary-service.ts`](file:///c:/Users/yesuraju/OneDrive/PROJECTS/hackathons/projects/OCTONOTE/src/core/intelligence/summary-service.ts))
- **Decisions & Agreements**: Evaluates message lines against decision regex patterns:
  - `/\b(?:we\s+)?(?:agreed|decided|settled)\s+(?:to|on|that)\b/i`
  - `/\bconfirmed\s+that\b/i`
  - `/\b(?:let's|lets)\s+go\s+with\b/i`
  - `/\b(?:approved|signed\s+off\s+on)\b/i`
- **Action Items & Tasks**: Evaluates message lines against task patterns:
  - `/\b(?:todo|action\s+item|task):\s*(.+)/i`
  - `/\b(?:please|pls)\s+([a-z].{4,})/i`
  - `/\b(?:i\s+will|i'll)\s+([a-z].{4,})/i` (infers task assignee as message author)
  - `/\bdeadline(?:\s+is)?\s+([a-z0-9].{3,})/i`
- **Key Discussion Topics**: Tokenizes conversation text, filters out 100+ standard stop words, and groups recurrent terms mentioned across multiple messages.
- **Traceability**: Every extracted point links directly to its source message ID and line number.

### Known Limitations
- The engine is deterministic and rule-based. It does not synthesize high-level narrative paragraphs or understand indirect idioms not matched by linguistic patterns.

---

## 5. Grounded Q&A

### How It Works ([`qa-service.ts`](file:///c:/Users/yesuraju/OneDrive/PROJECTS/hackathons/projects/OCTONOTE/src/core/intelligence/qa-service.ts))
- **Query Tokenization**: Strips question interrogatives (`who`, `what`, `when`, `where`, `why`, `how`, `is`, `are`) to isolate meaningful entity keywords.
- **Candidate Scoring**:
  - Exact phrase match bonus: `+15 pts`
  - Individual entity token matches: `+3 pts` (boundary word bonus: `+2 pts`)
  - Sender name match: `+4 pts`
  - Temporal indicator bonus when asking about deadlines/dates: `+2 pts`
- **Confidence Threshold**: A minimum score of `5 pts` is strictly enforced.
- **Honest Fallback**: If no messages cross the threshold, the engine explicitly returns:
  > *"The imported conversations do not appear to contain messages answering this question. No relevant evidence was found with sufficient confidence."*

### Known Limitations
- Q&A answers represent authentic excerpts retrieved directly from source messages. It does not generate creative synthesis.

---

## 6. Document & PDF Exports

### How It Works ([`export-service.ts`](file:///c:/Users/yesuraju/OneDrive/PROJECTS/hackathons/projects/OCTONOTE/src/core/export/export-service.ts))
- **Binary PDF Generator**: A pure TypeScript PDF 1.4 binary engine that constructs standard A4 documents with font catalogs, text positioning streams, and proper `xref` tables.
- **Markdown Exporter**: Formats summaries, task checklists (`- [ ]`), and resource catalogs with GitHub-flavored Markdown.
- **HTML Document Exporter**: Generates self-contained HTML documents with embedded CSS typography and `@media print` rules.
- **Browser Download**: Triggered locally via `URL.createObjectURL(blob)` and simulated anchor downloads.

### Known Limitations
- The binary PDF generator formats text across standard A4 bounds. For very large summaries (>50 decisions), the Markdown and HTML export options provide seamless multi-page vertical flow.

---

## 7. Local Profile & Session Security

### How It Works ([`profile-service.ts`](file:///c:/Users/yesuraju/OneDrive/PROJECTS/hackathons/projects/OCTONOTE/src/core/profile/profile-service.ts))
- **Storage**: User profile, preferences, and session state are persisted in browser `localStorage`.
- **Validation**: Enforces valid email syntax and display name length.
- **Session Locking**: "Lock Session" marks the local session inactive and transitions the interface to `AuthScreen.tsx`.
- **Safety Defaults**: Resetting the profile purges user identity while keeping imported conversations in IndexedDB unless explicitly confirmed.

### Known Limitations
- Passcodes configured on local profiles serve as a local UI convenience lock against casual viewing on a shared browser. They do not constitute military-grade disk encryption.
