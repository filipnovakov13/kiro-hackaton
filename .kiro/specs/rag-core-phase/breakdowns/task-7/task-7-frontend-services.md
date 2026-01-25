# Task Breakdown: Task 7 - Frontend Services & Hooks

## Parent Task
Task 7: Frontend Services & Hooks

## Complexity
MEDIUM-HIGH

## Estimated Duration
6-7 hours total

## Overview
Build TypeScript services for API communication, SSE streaming, and React hooks for state management.

---

## Sub-Task 7.1: Chat API Client
**Duration**: 90 min  
**Files**: `frontend/src/services/chat-api.ts`  
**Dependencies**: None  

**Scope**:
- createSession method
- getSessions method
- getSession method
- deleteSession method
- getSessionStats method
- Error handling

**Acceptance**:
- [ ] All methods implemented
- [ ] Proper error handling
- [ ] TypeScript types correct
- [ ] Unit tests pass (>80% coverage)

**Implementation Notes**:
```typescript
// Example structure
export class ChatAPI {
  private baseURL: string;
  
  async createSession(documentId?: string): Promise<ChatSession> { }
  async getSessions(): Promise<ChatSession[]> { }
  async getSession(id: string): Promise<ChatSession> { }
  async deleteSession(id: string): Promise<void> { }
  async getSessionStats(id: string): Promise<SessionStats> { }
}
```

---

## Sub-Task 7.2: SSE Client
**Duration**: 90 min  
**Files**: `frontend/src/services/sse-client.ts`  
**Dependencies**: None  

**Scope**:
- SSE connection handling
- Parse token, source, done, error events
- Handle connection errors
- Handle reconnection logic

**Acceptance**:
- [ ] SSE connection established
- [ ] All event types parsed correctly
- [ ] Connection errors handled
- [ ] Reconnection works
- [ ] Unit tests pass (>80% coverage)

**Implementation Notes**:
```typescript
export class SSEClient {
  connect(sessionId: string, message: string): EventSource { }
  onToken(callback: (token: string) => void): void { }
  onSource(callback: (source: Source) => void): void { }
  onDone(callback: () => void): void { }
  onError(callback: (error: string) => void): void { }
  close(): void { }
}
```

---

## Sub-Task 7.3: useChatSession Hook
**Duration**: 60 min  
**Files**: `frontend/src/hooks/useChatSession.ts`  
**Dependencies**: 7.1 (ChatAPI)  

**Scope**:
- Manage session state
- Handle session creation
- Handle session deletion
- Fetch session stats

**Acceptance**:
- [ ] Hook manages session state
- [ ] CRUD operations work
- [ ] Stats fetching works
- [ ] Hook tests pass

**Implementation Notes**:
```typescript
export function useChatSession() {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const createSession = async (documentId?: string) => { };
  const deleteSession = async () => { };
  const fetchStats = async () => { };
  
  return { session, loading, error, createSession, deleteSession, fetchStats };
}
```

---

## Sub-Task 7.4: useStreamingMessage Hook
**Duration**: 90 min  
**Files**: `frontend/src/hooks/useStreamingMessage.ts`  
**Dependencies**: 7.2 (SSEClient)  

**Scope**:
- Manage SSE connection
- Accumulate streaming tokens
- Handle error events
- Handle done events

**Acceptance**:
- [ ] Hook manages SSE connection
- [ ] Tokens accumulate correctly
- [ ] Errors handled
- [ ] Done event handled
- [ ] Hook tests pass

**Implementation Notes**:
```typescript
export function useStreamingMessage(sessionId: string) {
  const [message, setMessage] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const sendMessage = async (text: string) => { };
  const stopStreaming = () => { };
  
  return { message, sources, isStreaming, error, sendMessage, stopStreaming };
}
```

---

## Sub-Task 7.5: useFocusCaret Hook
**Duration**: 60 min  
**Files**: `frontend/src/hooks/useFocusCaret.ts`  
**Dependencies**: None  

**Scope**:
- Manage focus caret position
- Handle keyboard navigation
- Extract surrounding context

**Acceptance**:
- [ ] Hook manages caret position
- [ ] Keyboard navigation works
- [ ] Context extraction works (±150 chars)
- [ ] Hook tests pass

**Implementation Notes**:
```typescript
export function useFocusCaret(documentText: string) {
  const [position, setPosition] = useState<number | null>(null);
  const [context, setContext] = useState<string>('');
  
  const placeCaret = (pos: number) => { };
  const moveCaretLeft = () => { };
  const moveCaretRight = () => { };
  const extractContext = () => { };
  
  return { position, context, placeCaret, moveCaretLeft, moveCaretRight };
}
```

---

## Sub-Task 7.6: TypeScript Types
**Duration**: 30 min  
**Files**: `frontend/src/types/chat.ts`  
**Dependencies**: None  

**Scope**:
- ChatSession interface
- ChatMessage interface
- FocusContext interface
- SSE event types
- API response types

**Acceptance**:
- [ ] All interfaces defined
- [ ] Types match backend schemas
- [ ] No TypeScript errors

**Implementation Notes**:
```typescript
export interface ChatSession {
  id: string;
  document_id: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  metadata?: MessageMetadata;
}

export interface FocusContext {
  start_char: number;
  end_char: number;
  context_text: string;
}

export interface Source {
  chunk_id: string;
  document_id: string;
  similarity: number;
  text: string;
}

export type SSEEvent = 
  | { type: 'token'; data: string }
  | { type: 'source'; data: Source }
  | { type: 'done' }
  | { type: 'error'; data: string };
```

---

## Implementation Order

1. **Phase 1: Types & API Client** (2 hours)
   - 7.6: TypeScript types
   - 7.1: Chat API client

2. **Phase 2: SSE Client** (1.5 hours)
   - 7.2: SSE client

3. **Phase 3: React Hooks** (2.5 hours)
   - 7.3: useChatSession
   - 7.4: useStreamingMessage
   - 7.5: useFocusCaret

---

## Testing Strategy

### Unit Tests
- Mock fetch for API client tests
- Mock EventSource for SSE client tests
- Use @testing-library/react-hooks for hook tests
- Test error scenarios
- Test edge cases (empty responses, network errors)

### Integration Tests
- Test API client → backend integration
- Test SSE client → backend streaming
- Test hooks with real API calls (optional - once API keys are available)

---

## Rollback Plan

If issues arise:
1. Revert to previous commit
2. Services are independent - can disable individually
3. Fallback to polling if SSE fails

---

## Notes

- Use axios or fetch for HTTP requests
- Use native EventSource for SSE
- Follow existing service patterns in `frontend/src/services/`
- Ensure proper TypeScript typing throughout
- Handle CORS properly
