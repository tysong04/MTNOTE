# MTNOTE Developer & Contributor Guide

This guide outlines coding standards, testing practices, development workflows, and common troubleshooting patterns for developing in the **MTNOTE** codebase.

---

## 1. Development Principles & Conventions

1. **Strict TypeScript**:
   - `noImplicitAny: true` and `noUnusedLocals: true` are enforced by `tsconfig.json`.
   - Never use `any` unless strictly interfacing with legacy untyped third-party prototypes.
2. **Deterministic Business Logic**:
   - Complex algorithms (parsing, extraction, scoring, summarization, export) must reside in `src/core/` as pure, stateless functions or testable classes.
   - Do not embed business logic directly into React UI components.
3. **No Unapproved Network Calls**:
   - Never introduce `fetch()`, `axios`, or WebSocket calls that transmit conversation contents, message text, or metadata off the device.
4. **Tailwind CSS Utility Styling**:
   - Use Tailwind utility classes for consistent spacing, colors, and responsive layouts.
   - Maintain semantic color hierarchies (`indigo-600` for primary actions, `slate-600` for body text, `emerald-600` for verified status, `rose-600` for destructive actions).

---

## 2. Step-by-Step: Adding a New Feature

Follow this standard pipeline when introducing a new capability:

### Step 1: Define Types (`src/core/<domain>/types.ts`)
Create clear, self-documenting TypeScript interfaces:
```typescript
// src/core/tags/types.ts
export interface TagItem {
  id: string;
  name: string;
  color: string;
}
```

### Step 2: Implement Pure Domain Logic (`src/core/<domain>/...`)
Implement deterministic logic independent of React:
```typescript
// src/core/tags/tag-service.ts
export function extractAutomaticTags(messageContent: string): TagItem[] {
  // Pure logic
}
```

### Step 3: Write Unit Tests First (`src/core/<domain>/...test.ts`)
Add comprehensive test suites covering edge cases, empty input, and malformed data:
```typescript
// src/core/tags/tag-service.test.ts
import { describe, it, expect } from 'vitest';
import { extractAutomaticTags } from './tag-service';

describe('tag-service', () => {
  it('extracts hashtags from message text', () => {
    // Tests
  });
});
```

### Step 4: Build or Extend UI Views (`src/features/<domain>/...`)
Create the presentational component using Tailwind CSS and Lucide icons:
```typescript
// src/features/tags/TagsView.tsx
export const TagsView: React.FC<TagsViewProps> = ({ ... }) => {
  // Component implementation
};
```

### Step 5: Add End-to-End Integration Tests (`src/app/App.test.tsx`)
Verify the feature within the complete application shell, ensuring smooth navigation and state persistence.

---

## 3. Running Verification & Checks

Always run all three checks before finalizing work:

```bash
# 1. Run full test suite
npm test

# 2. Validate TypeScript types
npm run typecheck

# 3. Compile production build
npm run build
```

---

## 4. Common Issues & Debugging Tips

### 1. `useLiveQuery` Mutating State in `useEffect`
**Symptom**: State changes in an external in-memory index or service do not trigger a React re-render.  
**Solution**: Whenever an external object (such as `MiniSearch`) is mutated inside a `useEffect`, maintain an explicit version counter (`indexVersion`) to trigger a re-render:
```typescript
const [indexVersion, setIndexVersion] = useState(0);

useEffect(() => {
  if (chats && messages) {
    searchEngine.buildIndex(chats, messages, resources);
    setIndexVersion((v) => v + 1);
  }
}, [chats, messages, resources]);
```

### 2. Testing Library Multiple Elements Error
**Symptom**: `Found multiple elements with text: /Alice/i` or `name: /Lock Session/i`.  
**Solution**: When a sender name or label appears in both navigation pills and card bodies, use `screen.getAllByRole(...)` or `screen.getAllByText(...)`, or add distinct `aria-label` attributes.

### 3. Blob.text() in jsdom Test Environments
**Symptom**: `TypeError: blob.text is not a function` during Vitest execution.  
**Solution**: jsdom does not implement `Blob.prototype.text()` by default. Read blobs in tests using a `FileReader` helper:
```typescript
const text = await new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = reject;
  reader.readAsText(blob);
});
```

### 4. Git Permission Denied on `.git/index.lock` (Windows / OneDrive)
**Symptom**: `fatal: Unable to create '.git/index.lock': Permission denied`.  
**Solution**: OneDrive occasionally holds a background sync handle on `.git/` files. Ensure commands run with proper process privileges outside sandboxed isolation tokens.
