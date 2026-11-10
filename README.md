# MTNOTE

> **Local-First Personal Knowledge Base for WhatsApp Exports**  
> Convert exported WhatsApp conversations (`.txt` and `.zip`) into an organized, searchable, verifiable personal workspace—100% on-device with zero cloud transmission.

---

## 📖 Overview

WhatsApp conversations often contain critical information: shared links, team decisions, project deadlines, and action items. However, chat history is locked in unstructured threads or raw text exports.

**MTNOTE** transforms your WhatsApp export files into a structured, searchable, and actionable personal knowledge base. Everything runs entirely in your local browser using IndexedDB, Web Crypto, and client-side indexing. Your personal conversations are **never uploaded to external servers, cloud databases, or third-party AI APIs**.

---

## ✨ Features

- 📥 **Local WhatsApp Import & Stream Parsing**
  - Supports standard WhatsApp `.txt` exports and `.zip` archives.
  - Automatically handles Android (`M/D/YY, H:MM AM - Name: Msg`) and iOS (`[M/D/YY, H:MM:SS AM] Name: Msg`) formats.
  - Supports 12-hour and 24-hour timestamps, multiline messages, emojis, and system notifications.
  - Safe ZIP decompression in-memory with Zip Slip traversal protection and zip bomb expansion limits.

- 💾 **Reliable Local Persistence (IndexedDB & Dexie)**
  - Transactional storage of chats, messages, and resources in client-side IndexedDB (`MTNoteDatabase`).
  - SHA-256 conversation hashing using the Web Crypto API to detect duplicate imports with overwrite/skip options.
  - Data persists across browser refreshes and tab re-openings.

- 💬 **Conversation Viewer**
  - Clean, dedicated chat reading view with participant counts, date spans, and message breakdown.
  - In-conversation instant message filtering.
  - Deep-link target highlighting with smooth scrolling and focus ring (`ring-2 ring-indigo-500`).

- 🔗 **Deterministic Resource Extraction**
  - Pure, deterministic extraction of explicit `http://` and `https://` URLs from message text.
  - Trailing punctuation cleanup with balanced parenthetical URL preservation (e.g. Wikipedia).
  - Inferred display labels ("GitHub link", "YouTube link", "PDF link", "Web link") without probing remote servers.
  - Outbound links enforce `target="_blank"` and `rel="noopener noreferrer"`.
  - Verifiable source attribution: displays sender, chat name, timestamp, and source line number.

- 🔍 **Instant Full-Text Search (MiniSearch)**
  - Fast in-memory full-text search indexing both messages and resources.
  - Typo-tolerant fuzzy matching and prefix searching.
  - Scoped filtering (`All Entities`, `Messages Only`, `Resources Only`) and conversation filtering.
  - Centered query excerpts and one-click **"Open in Conversation"** deep-linking.
  - One-click export of search results to Markdown (`.md`).

- 📊 **Extractive Summaries & Grounded Insights**
  - Offline, rule-based extraction of **Decisions & Agreements** and **Action Items / Tasks**.
  - Participant contribution percentages and activity breakdown.
  - Recurrent discussion topic clustering with source quotes.
  - Optional custom date range filtering (`dateStart` / `dateEnd`).
  - Every extracted point links directly back to the verifiable message line.
  - Transparently labeled as deterministic and extractive (not generative AI).

- ❓ **Grounded Local Q&A**
  - Ask natural-language questions about your imported chats.
  - Local retrieval and term-density scoring over authentic conversation messages.
  - Answers are strictly grounded in source lines with explicit citations.
  - If conversations do not contain matching evidence, the system honestly states that no answer is supported.

- 📄 **Client-Side Document & PDF Exports**
  - Generate formatted reports locally in the browser without uploading data.
  - Download as **PDF (`.pdf`)** via a pure TypeScript binary PDF 1.4 generator.
  - Download as **Markdown (`.md`)** with checklists and formatted citations.
  - Download as standalone, printable **HTML (`.html`)** documents.

- 👤 **Local Profile & Device Session**
  - On-device profile system (display name, email, role, bio, optional device passcode).
  - Session lock / sign-out returning to an authentication screen.
  - App preferences (compact message cards, auto-extract links, default landing tab).
  - Reset profile with safe default (preserves chat conversations unless explicitly selected).

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | [React 18](https://react.dev/) + [TypeScript 5](https://www.typescriptlang.org/) | Type-safe component architecture |
| **Build Tool** | [Vite 6](https://vitejs.dev/) | Lightning-fast HMR and production bundling |
| **Styling** | [Tailwind CSS 3](https://tailwindcss.com/) | Modern, responsive utility styling |
| **Icons** | [Lucide React](https://lucide.dev/) | Clean, consistent UI iconography |
| **Local Storage** | [Dexie.js 4](https://dexie.org/) (IndexedDB) | Transactional client-side relational storage |
| **Search Engine** | [MiniSearch 7](https://lucaong.github.io/minisearch/) | In-memory full-text search with fuzzy matching |
| **ZIP Extraction** | [fflate 0.8](https://github.com/101arrowz/fflate) | High-performance, secure in-memory ZIP decompression |
| **Testing** | [Vitest 3](https://vitest.dev/) + Testing Library | Unit, integration, and UI testing |

---

## 📋 Prerequisites

Before running MTNOTE, make sure you have:
- **Node.js**: `v18.0.0` or higher (`v20+` or `v24+` recommended).
- **npm**: `v9.0.0` or higher.
- **Modern Web Browser**: Google Chrome, Mozilla Firefox, Microsoft Edge, or Safari with IndexedDB and Web Crypto API support.

---

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/tysong04/octonote.git
cd octonote
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start development server
```bash
npm run dev
```

### 4. Open in browser
Open [http://localhost:5173](http://localhost:5173) in your web browser.

---

## 💻 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the local Vite development server with Hot Module Replacement (HMR). |
| `npm run build` | Runs TypeScript typecheck (`tsc -b`) and compiles production assets into `dist/`. |
| `npm run preview` | Locally serves the compiled production build from `dist/` on port 4173. |
| `npm test` | Runs the automated Vitest test suite once. |
| `npm run test:watch` | Runs Vitest in interactive watch mode for active development. |
| `npm run typecheck` | Validates TypeScript types across all source and test files (`tsc --noEmit`). |
| `npm run lint` | Runs TypeScript static analysis check (`tsc --noEmit`). |

---

## 📂 Project Structure

```text
mtnote/
├── docs/                     # Comprehensive architecture and developer docs
│   ├── ARCHITECTURE.md       # High-level architecture, modules, and data flow
│   ├── DATA_MODEL.md         # IndexedDB schema, entity definitions, and migrations
│   ├── FEATURES.md           # Deep dive into all features, algorithms, and limits
│   ├── DEVELOPMENT.md        # Guide for adding features, testing, and debugging
│   ├── SECURITY_AND_PRIVACY.md # Threat model, on-device boundaries, and safeguards
│   └── ROADMAP.md            # Planned future capabilities and known scope boundaries
├── public/                   # Static assets (favicons, SVG badges)
├── src/
│   ├── app/                  # Application root coordinator and integration tests
│   │   ├── App.tsx           # Main shell, authentication gate, and view router
│   │   └── App.test.tsx      # Comprehensive end-to-end integration tests
│   ├── components/           # Reusable presentational components
│   │   ├── layout/           # Header.tsx, Sidebar.tsx
│   │   └── modals/           # ImportModal.tsx
│   ├── core/                 # Pure domain business logic & services (100% test-covered)
│   │   ├── parser/           # WhatsApp regex stream parser & safe ZIP handler
│   │   ├── storage/          # Dexie IndexedDB database & repositories
│   │   ├── extractor/        # Deterministic URL and metadata extractor
│   │   ├── search/           # MiniSearch full-text search engine
│   │   ├── intelligence/     # Extractive summary & grounded Q&A engines
│   │   ├── export/           # PDF binary generator, Markdown & HTML exporters
│   │   └── profile/          # Local on-device profile & preferences service
│   ├── features/             # Feature view screens
│   │   ├── auth/             # AuthScreen.tsx (Sign In & Profile Creation)
│   │   ├── overview/         # OverviewView.tsx (Workspace metrics & quick actions)
│   │   ├── chats/            # ChatsPlaceholderView.tsx (Conversation reader & search)
│   │   ├── resources/        # ResourcesPlaceholderView.tsx (Link feed & filters)
│   │   ├── search/           # SearchView.tsx (Full-text query interface)
│   │   ├── intelligence/     # IntelligenceView.tsx (Summaries & Grounded Q&A)
│   │   ├── settings/         # SettingsView.tsx (Data purge & storage metrics)
│   │   └── profile/          # ProfileView.tsx (User profile & preferences editor)
│   ├── styles/               # Global CSS & Tailwind configuration
│   └── types/                # Shared global TypeScript definitions
├── index.html                # Single-page application entry HTML
├── package.json              # Project dependencies and script definitions
├── tailwind.config.js        # Tailwind design system configuration
├── tsconfig.json             # TypeScript compiler configuration
└── vite.config.ts            # Vite & Vitest configuration
```

---

## 🧪 Testing & Verification

MTNOTE includes automated unit, integration, and UI tests across all modules.

```bash
# Run all automated tests
npm test

# Run TypeScript type check
npm run typecheck

# Run production build compilation
npm run build
```

Currently, **all 81 tests pass**, TypeScript reports **0 errors**, and the production bundle compiles in under 16 seconds.

---

## 📚 Documentation

For in-depth technical documentation, refer to the `docs/` directory:
- [Architecture & Module Guide](docs/ARCHITECTURE.md)
- [Data Model & Schema Migrations](docs/DATA_MODEL.md)
- [Feature Details & Algorithms](docs/FEATURES.md)
- [Developer Guide & Conventions](docs/DEVELOPMENT.md)
- [Security & Privacy Audit](docs/SECURITY_AND_PRIVACY.md)
- [Roadmap & Known Boundaries](docs/ROADMAP.md)

---

## 📄 License

This project is private and maintained for personal knowledge management.
