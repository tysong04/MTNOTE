# Octonote Security & Privacy Audit

Octonote is designed from the ground up as a **local-first, privacy-preserving application**. This document outlines our data privacy boundaries, threat model, and security safeguards.

---

## 1. What Stays on Your Device

| Data Category | Storage Location | Leaves Device? | Encryption |
|---|---|---|---|
| **WhatsApp `.txt` & `.zip` Files** | Processed in-memory | **Never** | N/A (memory only) |
| **Parsed Message Content** | Browser IndexedDB (`OctonoteDatabase`) | **Never** | Browser origin sandbox |
| **Extracted URLs & Links** | Browser IndexedDB (`resources`) | **Never** | Browser origin sandbox |
| **Search Indexes** | In-memory RAM (`MiniSearch`) | **Never** | RAM only |
| **Summaries & Q&A Queries** | Computed on-device | **Never** | RAM only |
| **User Profile & Preferences** | Browser `localStorage` | **Never** | Plaintext on local device |

---

## 2. Security Safeguards in Code

### 1. Zero External Egress
A static code analysis of all source files confirms **0 occurrences** of:
- `fetch()`
- `XMLHttpRequest`
- `navigator.sendBeacon`
- `axios`
- External analytics or telemetry SDKs (no Google Analytics, Mixpanel, Sentry, etc.)

### 2. Zip Archive Decompression Protection ([`zip-handler.ts`](file:///c:/Users/yesuraju/OneDrive/PROJECTS/hackathons/projects/OCTONOTE/src/core/parser/zip-handler.ts))
- **Zip Slip Defense**: Path traversal attacks (where malicious archive entries contain `../../` or absolute file paths like `/etc/passwd` or `C:\boot.ini`) are actively detected and rejected by `isPathTraversalAttempt()`.
- **Zip Bomb Defense**: Rejects ZIP files that expand to more than `50 MB` uncompressed, or exhibit a decompression expansion ratio exceeding `100:1`.

### 3. Safe Outbound Link Rendering
- Extracted URLs rendered in [`ResourcesPlaceholderView.tsx`](file:///c:/Users/yesuraju/OneDrive/PROJECTS/hackathons/projects/OCTONOTE/src/features/resources/ResourcesPlaceholderView.tsx) and [`SearchView.tsx`](file:///c:/Users/yesuraju/OneDrive/PROJECTS/hackathons/projects/OCTONOTE/src/features/search/SearchView.tsx) strictly enforce:
  ```html
  <a href="..." target="_blank" rel="noopener noreferrer">
  ```
- This prevents reverse tab-napping and prevents the opened page from accessing `window.opener`.

### 4. Deterministic URL Extraction (No Scraping)
- Octonote does not make HTTP requests to "unfurl" link previews, fetch titles, or inspect remote website contents. Display labels are inferred purely from domain and path suffixes.

---

## 3. What Local Login & Passcode Does and Does Not Protect

### What It Does Protect
- **UI Convenience Lock**: Protects your personal knowledge base from casual viewing when leaving your workstation unattended with the browser open.
- **Accidental Disclosures**: Prevents someone stepping up to your desk from reading conversations without clicking unlock.

### What It Does NOT Protect
- **Full Disk Encryption**: `localStorage` and `IndexedDB` records are stored in your browser profile directory on disk (e.g. `%LOCALAPPDATA%\Google\Chrome\User Data`). Anyone with administrative OS access or disk forensics tools can read browser SQLite databases directly.
- **Root/Malware Access**: Malware running on your host operating system with browser-process access can inspect local browser storage.
- **Recommendation**: For sensitive WhatsApp archives, ensure your operating system's full-disk encryption (BitLocker on Windows, FileVault on macOS, or LUKS on Linux) is enabled.

---

## 4. Privacy Considerations When Exposing via Tunnels (e.g. ngrok)

If you expose Octonote through reverse-proxy tunnels like ngrok for remote testing:

1. **IndexedDB Is Scoped to Origin**:
   - Conversations stored while using `http://localhost:5173` live in your PC's browser.
   - Anyone connecting to the remote ngrok URL (`https://<id>.ngrok-free.app`) receives an empty application bundle with a separate, isolated browser IndexedDB on *their* device. Your personal chats are **never transmitted across the tunnel**.
2. **Access Control**:
   - To prevent unauthorized persons or automated crawlers from viewing the web interface, always run tunnels with authentication:
     ```bash
     ngrok http 5173 --oauth=google --oauth-allow-email=your-email@example.com
     ```

---

## 5. Data Deletion & Purge Guarantees

Octonote provides full data control in the UI:
- **Individual Conversation Deletion**: Permanently deletes the conversation metadata, all message rows, and all extracted resources in a single atomic IndexedDB transaction.
- **Full Database Purge** (`SettingsView.tsx` / `ProfileView.tsx`): Completely clears all `chats`, `messages`, and `resources` tables.
