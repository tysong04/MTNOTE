# MTNOTE Data Model & Storage Guide

This document describes the IndexedDB schema, entity definitions, relationships, and schema migration strategies used in MTNOTE.

---

## 1. Storage Architecture

MTNOTE utilizes **IndexedDB** managed via **Dexie.js 4** for high-volume relational data (conversations, messages, and extracted links), and **`localStorage`** for lightweight session/profile preferences.

- **Database Name**: `mtnote_db` (with automatic non-blocking migration from legacy `octonote_db`)
- **Class**: [`MTNoteDatabase`](file:///c:/Users/yesuraju/OneDrive/PROJECTS/hackathons/projects/OCTONOTE/src/core/storage/db.ts)
- **Scope**: Strictly isolated to the browser's origin (`http://localhost:5173` or deployed host).

---

## 2. IndexedDB Schema Versions

```typescript
export class MTNoteDatabase extends Dexie {
  chats!: Table<PersistedChat, string>;
  messages!: Table<PersistedMessage, string>;
  resources!: Table<ExtractedResource, string>;

  constructor(dbName = 'mtnote_db') {
    super(dbName);

    // Version 1: Initial conversation storage
    this.version(1).stores({
      chats: 'id, chatName, contentHash, sourceFileName, importedAt, totalMessages',
      messages: 'id, chatId, timestamp, sender, sequenceIndex, isSystem, [chatId+sequenceIndex]',
    });

    // Version 2: Extracted knowledge resources
    this.version(2).stores({
      resources: 'id, chatId, messageId, type, domain, timestamp, rawUrl, [chatId+type]',
    });
  }
}
```

---

## 3. Entity Definitions

### 1. `PersistedChat` (`chats` Table)
Represents a parsed and saved WhatsApp conversation thread.

| Property | Type | Index | Description |
|---|---|---|---|
| `id` | `string` | **Primary Key** | Unique ID, e.g. `chat_1730000000000_abc12`. |
| `chatName` | `string` | Indexed | Conversation title (derived from export file or header). |
| `sourceFileName` | `string` | Indexed | Original export filename, e.g. `WhatsApp Chat - Team.txt`. |
| `sourceFileSize` | `number` | | Original file size in bytes. |
| `contentHash` | `string` | Indexed | SHA-256 hash of message sequence for duplicate detection. |
| `totalMessages` | `number` | Indexed | Total count of messages (user + system). |
| `userMessagesCount` | `number` | | Count of non-system messages. |
| `systemMessagesCount` | `number` | | Count of system messages (e.g. encryption notice). |
| `participants` | `string[]` | | Array of unique sender names detected. |
| `dateStart` | `string \| null` | | Earliest message timestamp (ISO 8601). |
| `dateEnd` | `string \| null` | | Latest message timestamp (ISO 8601). |
| `detectedDateFormat` | `string` | | Normalized format string (e.g. `M/D/YY, 12h`). |
| `warnings` | `ParseWarning[]`| | Non-fatal warnings encountered during parsing. |
| `importedAt` | `string` | Indexed | Timestamp of import into local workspace (ISO 8601). |
| `updatedAt` | `string` | | Timestamp of last modification (ISO 8601). |

### 2. `PersistedMessage` (`messages` Table)
Represents an individual message line or continuation inside a conversation.

| Property | Type | Index | Description |
|---|---|---|---|
| `id` | `string` | **Primary Key** | Unique message ID, e.g. `${chatId}_0`, `${chatId}_1`. |
| `chatId` | `string` | Indexed | Foreign key referencing `PersistedChat.id`. |
| `sequenceIndex` | `number` | Indexed | 0-indexed position within the conversation. |
| `rawTimestamp` | `string` | | Exact timestamp string parsed from export line. |
| `timestamp` | `string` | Indexed | Normalized ISO 8601 timestamp string. |
| `sender` | `string \| null` | Indexed | Author name, or `null` for system notices. |
| `isSystem` | `boolean` | Indexed | `true` if message is a system notification. |
| `content` | `string` | | Full text content (including multiline body). |
| `sourceLineStart` | `number` | | Starting line number in the original raw text file. |
| `sourceLineEnd` | `number` | | Ending line number in the original raw text file. |
| `[chatId+sequenceIndex]` | `Compound` | Indexed | Compound index for sequential querying. |

### 3. `ExtractedResource` (`resources` Table)
Represents a deterministic knowledge resource (URL link) parsed from a message.

| Property | Type | Index | Description |
|---|---|---|---|
| `id` | `string` | **Primary Key** | Unique ID: `res_${chatId}_${messageSeq}_${urlIndex}`. |
| `chatId` | `string` | Indexed | References `PersistedChat.id`. |
| `messageId` | `string` | Indexed | References `PersistedMessage.id`. |
| `type` | `'url'` | Indexed | Resource classification type. |
| `rawUrl` | `string` | Indexed | Normalized URL string (e.g. `https://github.com/...`). |
| `domain` | `string` | Indexed | Extracted domain hostname (e.g. `github.com`). |
| `displayLabel` | `string` | | Inferred structure label (e.g. "GitHub link"). |
| `context` | `string` | | Full text of the message containing the URL. |
| `sender` | `string \| null` | | Sender of the source message. |
| `timestamp` | `string` | Indexed | ISO 8601 timestamp of the source message. |
| `sourceLineStart` | `number` | | Line number where the link appears. |
| `sourceLineEnd` | `number` | | End line number where the link appears. |
| `createdAt` | `string` | | Timestamp when resource was extracted (ISO 8601). |
| `[chatId+type]` | `Compound` | Indexed | Compound index for filtered queries by chat. |

---

## 4. Entity Relationships & Cascading Deletions

```text
PersistedChat (1)
  ├── PersistedMessage (N) [Foreign Key: chatId]
  └── ExtractedResource (N) [Foreign Key: chatId, messageId]
```

### Cascading Delete Rule
When a user deletes a conversation (`deleteChat(chatId)`):
1. All `messages` matching `chatId` are deleted.
2. All `resources` matching `chatId` are deleted.
3. The parent `chats` record is deleted.
This cascade is executed atomically inside a Dexie transaction:

```typescript
// chat-repository.ts
export async function deleteChat(chatId: string): Promise<void> {
  await db.transaction('rw', [db.chats, db.messages, db.resources], async () => {
    await db.messages.where('chatId').equals(chatId).delete();
    await db.resources.where('chatId').equals(chatId).delete();
    await db.chats.delete(chatId);
  });
}
```

---

## 5. Local Profile Model (`localStorage`)

User profile details and session locks are stored in `localStorage` under `mtnote_user_profile` (with automatic backward-compatible fallback from `octonote_user_profile`) and `mtnote_active_session`.

```typescript
export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  bio?: string;
  role?: string;
  avatarInitial: string;
  createdAt: string;
  lastActiveAt: string;
  passcode?: string;
  preferences: {
    compactView: boolean;
    autoExtractLinks: boolean;
    defaultTab: 'overview' | 'chats' | 'resources' | 'search' | 'insights' | 'settings' | 'profile';
  };
}
```

---

## 6. How to Safely Upgrade the Schema (Version 3+)

To add tables or alter indexes without losing user data:

1. **Never alter existing version definitions** (`version(1)` or `version(2)`).
2. Increment version number:
   ```typescript
   this.version(3).stores({
     // Repeat existing table schemas + new/modified table schemas:
     chats: 'id, chatName, contentHash, sourceFileName, importedAt, totalMessages',
     messages: 'id, chatId, timestamp, sender, sequenceIndex, isSystem, [chatId+sequenceIndex]',
     resources: 'id, chatId, messageId, type, domain, timestamp, rawUrl, [chatId+type]',
     tags: 'id, name, chatId, [chatId+name]' // New table
   }).upgrade(tx => {
     // Optional data migration logic
   });
   ```
3. Use Dexie's `.upgrade()` hook if existing records need property transformations.
