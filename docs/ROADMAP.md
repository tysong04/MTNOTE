# Octonote Roadmap & Evolution Plan

This document outlines the current state of **Octonote**, current architectural boundaries, and sensible future enhancements.

---

## 1. Completed Capabilities (Verified in Code)

- [x] **Application Shell**: Modern, responsive layout with collapsible navigation, tab routing, and local-first status indicators.
- [x] **Import & Stream Parser**: Streaming parser for Android and iOS WhatsApp exports (`.txt`), safe in-memory `.zip` extraction, Zip Slip traversal protection, and zip bomb expansion limits.
- [x] **Persistence Engine**: Client-side IndexedDB (`OctonoteDatabase` via Dexie.js v2) with SHA-256 duplicate detection and cascading deletion.
- [x] **Conversation Viewer**: Full message thread viewer with in-chat search, participants, and targeted message auto-scroll with focus ring.
- [x] **Deterministic Resource Extraction**: Explicit `http://` and `https://` extraction, trailing punctuation cleanup, parenthetical URL preservation, inferred display labels, and source line references.
- [x] **Full-Text Search**: In-memory `MiniSearch` index across messages and links with typo-tolerant fuzzy matching, scope pills, and centered excerpts.
- [x] **Extractive Summaries**: Offline, rule-based extraction of decisions, action items, task assignees, and topic frequency clusters with direct source message citations.
- [x] **Grounded Local Q&A**: Question keyword retrieval with temporal scoring bonuses, strict confidence thresholding, and honest fallback.
- [x] **Client-Side Exports**: Pure TypeScript binary PDF 1.4 generator, structured Markdown exporter, and printable HTML document exporter.
- [x] **Local Profile & Device Session**: On-device profile management, preferences editor, session locking, and safe profile reset.

---

## 2. Current Scope Boundaries & Known Gaps

The following capabilities are **intentionally not implemented in the current MVP**:

1. **Media Attachments**: Photos, voice notes, audio, and videos included in ZIP exports are currently skipped. Standard WhatsApp placeholder text (e.g. `<Media omitted>`) is preserved as message text.
2. **Encrypted Vault at Rest**: IndexedDB records are stored unencrypted in the browser profile directory. Operating system full-disk encryption (BitLocker / FileVault) is relied upon for physical security.
3. **Bare Domain Extraction**: URLs lacking `http://` or `https://` (e.g. `google.com`) are intentionally excluded to avoid false positives.
4. **Third-Party Messaging Apps**: Only WhatsApp export formats are currently supported (Telegram, Signal, and Slack formats are not supported).

---

## 3. Phased Future Enhancements

### Phase 1: Custom Tagging & Multi-Category Organization
- **User-Defined Tags**: Allow users to create custom color-coded tags (e.g. `#Work`, `#Legal`, `#Ideas`, `#ReadingList`).
- **Resource Categorization**: Assign one or more tags to extracted resources and conversation threads.
- **Tag Filtering**: Filter the Search and Resources views by combined tags.

### Phase 2: Origin Private File System (OPFS) Media Archival
- **In-Browser Media Storage**: Store exported photos and voice memos in the browser's high-performance Origin Private File System (OPFS).
- **Inline Audio & Photo Viewer**: Render images and playable voice note players directly in the chat reader next to their authentic timestamps.

### Phase 3: Zero-Cloud Semantic Search & Local Embeddings
- **WebAssembly Embeddings**: Integrate [Transformers.js](https://huggingface.co/docs/transformers.js) or ONNX Runtime Web to generate vector embeddings 100% on-device in a Web Worker.
- **Hybrid Search**: Combine MiniSearch BM25 keyword matching with cosine similarity vector search for deeper semantic conceptual retrieval without sending a single byte to external AI servers.

### Phase 4: Encrypted Local Vault (AES-GCM Web Crypto)
- **Zero-Knowledge At-Rest Encryption**: Encrypt all message payloads, chat titles, and resource URLs using `AES-GCM-256` derived from a user master passphrase via `PBKDF2`.
- **Hardware Enclave Integration**: Leverage WebAuthn / Passkeys for device-bound hardware biometric unlocking (Touch ID / Windows Hello).
