# Design Document: Phase 1 - Core Integration

## Introduction

This document defines the technical design for Phase 1 of Frontend Integration. It translates the 7 requirements into concrete architecture, component interfaces, data flows, and implementation patterns.

Phase 1 establishes the core integration between the React frontend and FastAPI backend, transforming the demo UI into a functional application with real data flows.

## Feature Metadata

**Type**: Enhancement (Rewrite existing demo UI to use real backend)
**Complexity Score**: 5 (Very Complex)
**Duration Estimate**: 2-3 days
**Risk Level**: High
**Primary Systems**: Frontend (React), Backend API integration
**Dependencies**: react-markdown, happy-dom, fast-check

### Complexity Breakdown

1. **Scope**: 15+ files across multiple modules → **5**
   - 4 custom hooks (useChatSession, useStreamingMessage, useFocusCaret, useDocumentUpload)
   - 2 service classes (ChatAPI, SSEClient)
   - 10+ UI components
   - App.tsx orchestrator rewrite
   - Multiple test files

2. **Dependencies**: 5+ external libraries + backend API → **5**
   - react-markdown (markdown rendering)
   - remark-gfm (GitHub Flavored Markdown)
   - rehype-highlight (syntax highlighting)
   - uuid (ID generation)
   - date-fns (date formatting)
   - Backend REST API (sessions, documents, messages)
   - Backend SSE streaming endpoint

3. **Data Persistence**: localStorage + backend state → **2**
   - localStorage for session ID and caret positions (no schema changes)
   - Backend handles all database operations (existing)

4. **Testing**: Multiple test suites + property-based tests → **5**
   - Unit tests for 4 hooks
   - Unit tests for 10+ components
   - Integration tests for upload flow, streaming chat, focus caret
   - 6 property-based tests for correctness
   - E2E tests for complete user flows
   - Estimated 100+ test cases

5. **Uncertainty**: Clear requirements, existing backend → **2**
   - SSE reconnection logic needs careful implementation
   - Focus caret click-to-place calculation may need refinement

**Final Complexity**: MAX(5, 5, 2, 5, 2) = **5 (Very Complex)**

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + TypeScript)                        │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                           App.tsx (Orchestrator)                      │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────┐   │   │
│  │  │useChatSess │ │useStreaming│ │useFocusCaret│ │useDocUpload   │   │   │
│  │  │ion         │ │Message     │ │            │ │               │   │   │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│         │                 │                 │                    │          │
│  ┌──────▼─────────────────▼─────────────────▼────────────────────▼──────┐   │
│  │                      Component Layer                                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │   │
│  │  │ChatInterface │  │DocumentViewer│  │UploadZone    │  │MessageList│ │   │
│  │  │(split-pane)  │  │(markdown)    │  │(drag-drop)   │  │(history)  │ │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────┘ │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │   │
│  │  │MessageInput  │  │FocusCaret    │  │StreamingMsg  │  │SourceAttr│ │   │
│  │  │(send)        │  │(✨ glow)     │  │(accumulate)  │  │(links)   │ │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────┘ │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│         │                                                                    │
│  ┌──────▼─────────────────────────────────────────────────────────────┐     │
│  │                      Service Layer                                  │     │
│  │  ┌──────────────┐  ┌──────────────┐                                │     │
│  │  │ChatAPI       │  │SSEClient     │                                │     │
│  │  │(REST calls)  │  │(streaming)   │                                │     │
│  │  └──────────────┘  └──────────────┘                                │     │
│  └───────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │ HTTP/REST + SSE
┌────────────────────────────────────┼────────────────────────────────────────┐
│                              BACKEND (FastAPI)                               │
│                          ┌─────────▼─────────┐                               │
│                          │   API Endpoints   │                               │
│                          │   (EXISTING)      │                               │
│                          └───────────────────┘                               │
│  • POST /api/chat/sessions                                                   │
│  • GET /api/chat/sessions                                                    │
│  • GET /api/chat/sessions/{id}                                               │
│  • DELETE /api/chat/sessions/{id}                                            │
│  • POST /api/chat/sessions/{id}/messages (SSE)                               │
│  • POST /api/documents/upload                                                │
│  • GET /api/documents/status/{task_id}                                       │
│  • GET /api/documents/{id}                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## File Structure


```
frontend/src/
├── App.tsx                          # REWRITE: Remove demo data, use real hooks
├── hooks/
│   ├── useChatSession.ts            # VERIFY: Session CRUD operations
│   ├── useStreamingMessage.ts       # VERIFY: SSE streaming management
│   ├── useFocusCaret.ts             # VERIFY: Focus caret state
│   └── useDocumentUpload.ts         # VERIFY: Upload flow management
├── services/
│   ├── chat-api.ts                  # VERIFY: Chat API client
│   ├── sse-client.ts                # VERIFY: SSE connection handler
│   └── api.ts                       # EXISTING: Base API client
├── components/
│   ├── chat/
│   │   ├── ChatInterface.tsx        # VERIFY: Split-pane layout
│   │   ├── MessageList.tsx          # VERIFY: Message history
│   │   ├── MessageInput.tsx         # VERIFY: Input with validation
│   │   ├── StreamingMessage.tsx     # VERIFY: Streaming display
│   │   ├── ThinkingIndicator.tsx    # VERIFY: Loading indicator
│   │   └── SourceAttribution.tsx    # VERIFY: Source links
│   ├── document/
│   │   ├── DocumentViewer.tsx       # VERIFY: Markdown renderer
│   │   ├── FocusCaret.tsx           # VERIFY: Caret indicator
│   │   └── ChunkHighlight.tsx       # VERIFY: Chunk highlighting
│   └── upload/
│       ├── UploadZone.tsx           # EXISTING: From foundation phase
│       ├── UploadProgress.tsx       # EXISTING: Progress display
│       └── UrlInput.tsx             # EXISTING: URL ingestion
└── types/
    ├── chat.ts                      # VERIFY: Chat type definitions
    └── document.ts                  # EXISTING: Document types
```

## Data Models

### Frontend TypeScript Interfaces

**File**: `frontend/src/types/chat.ts`

```typescript
// Chat Session
export interface ChatSession {
  id: string;                    // UUID
  document_id: string;           // UUID
  created_at: string;            // ISO 8601
  updated_at: string;            // ISO 8601
  message_count: number;
}

// Chat Message
export interface ChatMessage {
  id: string;                    // UUID
  session_id: string;            // UUID
  role: 'user' | 'assistant';
  content: string;
  created_at: string;            // ISO 8601
  sources?: SourceAttribution[]; // Only for assistant messages
}

// Source Attribution
export interface SourceAttribution {
  chunk_id: string;              // UUID
  document_id: string;           // UUID
  document_title: string;
  chunk_index: number;
  similarity: number;            // 0-1
  content_preview: string;       // First 100 chars
}

// Focus Context
export interface FocusContext {
  text: string;                  // ±150 chars around caret
  position: number;              // Character position
  document_id: string;           // UUID
}

// SSE Event Types
export type SSEEventType = 'token' | 'source' | 'done' | 'error';

export interface SSEEvent {
  event: SSEEventType;
  data: string | SourceAttribution | { message: string };
}
```

## Relevant Codebase Files

### Existing Files to Reference (READ BEFORE IMPLEMENTING!)

**Hooks (Verify Implementation)**:
- `frontend/src/hooks/useChatSession.ts` - Session CRUD operations pattern
- `frontend/src/hooks/useStreamingMessage.ts` - SSE streaming pattern
- `frontend/src/hooks/useFocusCaret.ts` - Focus caret state management
- `frontend/src/hooks/useDocumentUpload.ts` - Upload flow with polling

**Services (Verify Implementation)**:
- `frontend/src/services/chat-api.ts` - ChatAPI class with REST methods
- `frontend/src/services/sse-client.ts` - SSEClient class for streaming
- `frontend/src/services/api.ts` - Base API client configuration

**Components (Verify Implementation)**:
- `frontend/src/components/chat/ChatInterface.tsx` - Split-pane layout
- `frontend/src/components/chat/MessageList.tsx` - Message history display
- `frontend/src/components/chat/MessageInput.tsx` - Input with validation
- `frontend/src/components/chat/StreamingMessage.tsx` - Streaming display
- `frontend/src/components/chat/ThinkingIndicator.tsx` - Loading indicator
- `frontend/src/components/chat/SourceAttribution.tsx` - Source links
- `frontend/src/components/document/DocumentViewer.tsx` - Markdown renderer
- `frontend/src/components/document/FocusCaret.tsx` - Caret indicator
- `frontend/src/components/document/ChunkHighlight.tsx` - Chunk highlighting
- `frontend/src/components/upload/UploadZone.tsx` - Drag-drop upload
- `frontend/src/components/upload/UploadProgress.tsx` - Progress display
- `frontend/src/components/upload/UrlInput.tsx` - URL ingestion

**Types (Verify Implementation)**:
- `frontend/src/types/chat.ts` - Chat-related TypeScript interfaces
- `frontend/src/types/document.ts` - Document-related interfaces

**Tests (Reference for Patterns)**:
- `frontend/tests/useChatSession.test.ts` - Hook testing pattern
- `frontend/tests/ChatInterface.test.tsx` - Component testing pattern
- `frontend/tests/sse-client.test.ts` - Service testing pattern
- `frontend/tests/setup.ts` - Test setup configuration

**Configuration**:
- `frontend/vitest.config.ts` - Test configuration (uses happy-dom)
- `frontend/tsconfig.json` - TypeScript configuration
- `frontend/vite.config.ts` - Build configuration

**Design System**:
- `.kiro/documentation/project-docs/visual-identity.md` - Colors, typography, animations

### Files to Modify

**Primary Target**:
- `frontend/src/App.tsx` - **REWRITE**: Remove demo data, integrate real hooks

**Pattern**: App.tsx currently contains hardcoded demo data. Rewrite to use hooks and display appropriate UI based on state (UploadZone vs ChatInterface).

### Backend API Endpoints (Existing - No Changes)

**Session Management**:
- `POST /api/chat/sessions` - Create session
- `GET /api/chat/sessions` - List sessions
- `GET /api/chat/sessions/{id}` - Get session details
- `DELETE /api/chat/sessions/{id}` - Delete session

**Messaging**:
- `POST /api/chat/sessions/{id}/messages` - Send message (SSE streaming)
- `GET /api/chat/sessions/{id}/messages` - Get message history

**Documents**:
- `POST /api/documents/upload` - Upload document
- `GET /api/documents/status/{task_id}` - Poll processing status
- `GET /api/documents/{id}` - Get document content


## Component Interfaces

### 1. App.tsx (Main Orchestrator)

**Purpose**: Orchestrate all application state and coordinate between hooks and components.

**Hook Integration**:
```typescript
function App() {
  // Integrate all custom hooks
  const { currentSession, sessions, loadSessions, loadSession, createSession, deleteSession } = useChatSession();
  const { streamingContent, isStreaming, sources, sendMessage } = useStreamingMessage();
  const { caretPosition, focusContext, moveCaret, focusModeEnabled, toggleFocusMode } = useFocusCaret();
  const { uploadProgress, uploadError, uploadDocument } = useDocumentUpload();

  // Local state for document and messages
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Load sessions on mount, auto-load most recent
  useEffect(() => { loadSessions(); }, []);
  useEffect(() => {
    if (sessions.length > 0 && !currentSession) loadSession(sessions[0].id);
  }, [sessions]);

  // Event handlers delegate to hooks
  const handleDocumentUpload = async (file: File) => {
    const result = await uploadDocument(file);
    if (result.success) {
      await createSession(result.document_id);
      setCurrentDocument(await fetchDocument(result.document_id));
    }
  };

  const handleSendMessage = async (message: string) => {
    await sendMessage(currentSession!.id, message, focusModeEnabled ? focusContext : null);
  };

  // Conditional rendering: UploadZone or ChatInterface
  return !currentSession ? <UploadZone onUpload={handleDocumentUpload} /> : <ChatInterface {...props} />;
}
```

**Key Responsibilities**:
- Initialize by loading sessions, auto-load most recent
- Coordinate upload → session creation → document loading
- Delegate message sending with optional focus context
- Persist session ID to localStorage (handled in hook)
- Conditional UI: upload zone vs chat interface


### 2. useChatSession Hook

**File**: `frontend/src/hooks/useChatSession.ts`

**Purpose**: Manage chat session CRUD operations and state.

**Interface**:
```typescript
interface UseChatSessionReturn {
  currentSession: ChatSession | null;
  sessions: ChatSession[];
  isLoading: boolean;
  error: string | null;
  loadSessions: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  createSession: (documentId: string) => Promise<ChatSession>;
  deleteSession: (sessionId: string) => Promise<void>;
}
```

**Key Implementation Details**:
```typescript
const loadSessions = async () => {
  const response = await ChatAPI.getSessions();
  // CRITICAL: Sort by updated_at DESC for auto-load
  const sorted = response.sort((a, b) => 
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
  setSessions(sorted);
};

const loadSession = async (sessionId: string) => {
  const session = await ChatAPI.getSession(sessionId);
  setCurrentSession(session);
  // CRITICAL: Persist to localStorage
  localStorage.setItem('iubar_current_session_id', sessionId);
};

const deleteSession = async (sessionId: string) => {
  await ChatAPI.deleteSession(sessionId);
  setSessions(prev => prev.filter(s => s.id !== sessionId));
  // CRITICAL: If deleted session is current, switch to most recent remaining
  if (currentSession?.id === sessionId) {
    const remaining = sessions.filter(s => s.id !== sessionId);
    if (remaining.length > 0) {
      await loadSession(remaining[0].id);
    } else {
      setCurrentSession(null);
      localStorage.removeItem('iubar_current_session_id');
    }
  }
};
```

**Pattern**: createSession follows similar pattern - call API, update state, persist to localStorage.


### 3. useStreamingMessage Hook

**File**: `frontend/src/hooks/useStreamingMessage.ts`

**Purpose**: Manage SSE streaming connections and accumulate response tokens.

```typescript
interface UseStreamingMessageReturn {
  streamingContent: string;
  isStreaming: boolean;
  sources: SourceAttribution[];
  error: string | null;
  sendMessage: (sessionId: string, message: string, focusContext: FocusContext | null) => Promise<void>;
}

export function useStreamingMessage(): UseStreamingMessageReturn {
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sources, setSources] = useState<SourceAttribution[]>([]);
  const [error, setError] = useState<string | null>(null);
  const sseClientRef = useRef<SSEClient | null>(null);

  const sendMessage = async (
    sessionId: string,
    message: string,
    focusContext: FocusContext | null
  ) => {
    setIsStreaming(true);
    setStreamingContent('');
    setSources([]);
    setError(null);

    try {
      const client = new SSEClient();
      sseClientRef.current = client;

      await client.connect(
        `/api/chat/sessions/${sessionId}/messages`,
        {
          message,
          focus_context: focusContext
        },
        {
          onToken: (token: string) => {
            setStreamingContent(prev => prev + token);
          },
          onSource: (source: SourceAttribution) => {
            setSources(prev => [...prev, source]);
          },
          onDone: () => {
            setIsStreaming(false);
          },
          onError: (err: string) => {
            setError(err);
            setIsStreaming(false);
          }
        }
      );
    } catch (err) {
      setError('Failed to send message');
      setIsStreaming(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sseClientRef.current?.disconnect();
    };
  }, []);

  return {
    streamingContent,
    isStreaming,
    sources,
    error,
    sendMessage
  };
}
```

**SSE Reconnection Logic**:
```typescript
class SSEClient {
  private retryCount = 0;
  private maxRetries = 3;
  private retryDelay = 2000; // ms

  async connect(url: string, body: any, handlers: SSEHandlers) {
    try {
      // Establish SSE connection
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const events = this.parseSSE(chunk);

        for (const event of events) {
          this.handleEvent(event, handlers);
        }
      }
    } catch (err) {
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.connect(url, body, handlers);
      } else {
        handlers.onError('Connection lost. Please try again.');
      }
    }
  }

  private handleEvent(event: SSEEvent, handlers: SSEHandlers) {
    switch (event.event) {
      case 'token':
        handlers.onToken(event.data as string);
        break;
      case 'source':
        handlers.onSource(event.data as SourceAttribution);
        break;
      case 'done':
        handlers.onDone();
        break;
      case 'error':
        handlers.onError((event.data as { message: string }).message);
        break;
    }
  }
}
```


### 4. useFocusCaret Hook

**File**: `frontend/src/hooks/useFocusCaret.ts`

**Purpose**: Manage focus caret position and extract surrounding context.

**Interface**:
```typescript
interface UseFocusCaretReturn {
  caretPosition: number;
  focusContext: FocusContext | null;
  focusModeEnabled: boolean;
  moveCaret: (position: number) => void;
  toggleFocusMode: () => void;
}
```

**Key Implementation Details**:
```typescript
const extractContext = (position: number, content: string): string => {
  // CRITICAL: Extract exactly ±150 characters
  const start = Math.max(0, position - 150);
  const end = Math.min(content.length, position + 150);
  return content.substring(start, end);
};

const moveCaret = (position: number) => {
  setCaretPosition(position);
  
  const contextText = extractContext(position, documentContent);
  setFocusContext({
    text: contextText,
    position,
    document_id: documentId
  });

  // CRITICAL: Persist position per session
  localStorage.setItem(
    `iubar_caret_position_${documentId}`,
    position.toString()
  );
};

// Initialize from localStorage on mount
useEffect(() => {
  const savedPosition = localStorage.getItem(`iubar_caret_position_${documentId}`);
  if (savedPosition) {
    moveCaret(parseInt(savedPosition, 10));
  } else {
    moveCaret(0); // Default to start
  }
}, [documentId]);
```

**Keyboard Navigation**:
```typescript
const handleKeyDown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowUp':
      e.preventDefault();
      moveToPreviousParagraph(); // Find previous \n\n
      break;
    case 'ArrowDown':
      e.preventDefault();
      moveToNextParagraph(); // Find next \n\n
      break;
    case 'Home':
      moveCaret(0);
      break;
    case 'End':
      moveCaret(documentContent.length - 1);
      break;
  }
};
```

**Pattern**: Paragraph navigation splits on `\n\n` and moves caret to paragraph boundaries.


### 5. useDocumentUpload Hook

**File**: `frontend/src/hooks/useDocumentUpload.ts`

**Purpose**: Manage document upload flow with polling for processing status.

**Interface**:
```typescript
interface UseDocumentUploadReturn {
  uploadProgress: UploadProgress | null;
  uploadError: string | null;
  uploadDocument: (file: File) => Promise<UploadResult>;
}

interface UploadProgress {
  status: 'uploading' | 'processing' | 'complete' | 'error';
  progress: string;
  percentage?: number;
}
```

**Key Implementation Details**:
```typescript
const uploadDocument = async (file: File): Promise<UploadResult> => {
  // Step 1: Upload file
  const formData = new FormData();
  formData.append('file', file);
  const uploadResponse = await fetch('/api/documents/upload', {
    method: 'POST',
    body: formData
  });
  const { task_id } = await uploadResponse.json();

  // Step 2: Poll for status every 2 seconds
  const result = await pollProcessingStatus(task_id);
  return result;
};

const pollProcessingStatus = async (taskId: string): Promise<any> => {
  const maxAttempts = 60; // 2 minutes max
  let attempts = 0;

  while (attempts < maxAttempts) {
    const response = await fetch(`/api/documents/status/${taskId}`);
    const status = await response.json();

    // CRITICAL: Map backend progress to user-friendly messages
    setUploadProgress({
      status: 'processing',
      progress: mapProgressMessage(status.progress)
    });

    if (status.status === 'complete') return status;
    if (status.status === 'error') throw new Error(status.error);

    // CRITICAL: Wait exactly 2 seconds between polls
    await new Promise(resolve => setTimeout(resolve, 2000));
    attempts++;
  }

  throw new Error('Processing timeout');
};

const mapProgressMessage = (progress: string): string => {
  const mapping: Record<string, string> = {
    'Queued for processing...': 'Preparing document...',
    'Converting document to text...': 'Reading document...',
    'Splitting into searchable sections...': 'Processing content...',
    'Generating embeddings...': 'Preparing for AI...'
  };
  return mapping[progress] || progress;
};
```


### 6. ChatAPI Service

**File**: `frontend/src/services/chat-api.ts`

**Purpose**: Centralized API client for chat-related endpoints.

```typescript
export class ChatAPI {
  private static baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  static async getSessions(): Promise<ChatSession[]> {
    const response = await fetch(`${this.baseUrl}/api/chat/sessions`);
    if (!response.ok) throw new Error('Failed to fetch sessions');
    return response.json();
  }

  static async getSession(sessionId: string): Promise<ChatSession> {
    const response = await fetch(`${this.baseUrl}/api/chat/sessions/${sessionId}`);
    if (!response.ok) throw new Error('Failed to fetch session');
    return response.json();
  }

  static async createSession(documentId: string): Promise<ChatSession> {
    const response = await fetch(`${this.baseUrl}/api/chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_id: documentId })
    });
    if (!response.ok) throw new Error('Failed to create session');
    return response.json();
  }

  static async deleteSession(sessionId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/chat/sessions/${sessionId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete session');
  }

  static async getMessages(sessionId: string): Promise<ChatMessage[]> {
    const response = await fetch(`${this.baseUrl}/api/chat/sessions/${sessionId}/messages`);
    if (!response.ok) throw new Error('Failed to fetch messages');
    return response.json();
  }
}
```

### 7. DocumentViewer Component

**File**: `frontend/src/components/document/DocumentViewer.tsx`

**Purpose**: Render markdown content with chunk highlighting and focus caret.

```typescript
interface DocumentViewerProps {
  document: Document;
  focusCaret: ReactNode;
  highlightedChunkId?: string;
  onCaretClick: (position: number) => void;
}

export function DocumentViewer({
  document,
  focusCaret,
  highlightedChunkId,
  onCaretClick
}: DocumentViewerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Handle click-to-place caret
  const handleClick = (e: React.MouseEvent) => {
    if (!contentRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(contentRef.current);
    preCaretRange.setEnd(range.endContainer, range.endOffset);

    const position = preCaretRange.toString().length;
    onCaretClick(position);
  };

  // Scroll to highlighted chunk
  useEffect(() => {
    if (highlightedChunkId) {
      const element = document.getElementById(`chunk-${highlightedChunkId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightedChunkId]);

  // Track scroll progress
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
    setScrollProgress(progress);
  };

  return (
    <div className="document-viewer" onScroll={handleScroll}>
      {/* Scroll progress indicator */}
      <div 
        className="scroll-progress" 
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Document metadata */}
      <div className="document-header">
        <h1>{document.metadata.title || document.original_name}</h1>
        <div className="document-badges">
          <span className="file-type-badge">{document.file_type}</span>
          <span className="chunk-count">{document.chunk_count} sections</span>
        </div>
      </div>

      {/* Markdown content */}
      <div 
        ref={contentRef}
        className="document-content"
        onClick={handleClick}
      >
        <ReactMarkdown
          components={{
            code: CodeBlock,
            // ... other custom renderers
          }}
        >
          {document.content}
        </ReactMarkdown>

        {/* Focus caret overlay */}
        {focusCaret}
      </div>
    </div>
  );
}
```


## Data Flow Diagrams

### Document Upload Flow

```
User                    Frontend                Backend
 │                         │                       │
 │  Drop file              │                       │
 ├────────────────────────>│                       │
 │                         │  POST /api/documents/upload
 │                         ├──────────────────────>│
 │                         │                       │ Process file
 │                         │  { task_id }          │ (async)
 │                         │<──────────────────────┤
 │                         │                       │
 │  Show "Uploading..."    │                       │
 │<────────────────────────┤                       │
 │                         │                       │
 │                         │  Poll: GET /api/documents/status/{task_id}
 │                         ├──────────────────────>│
 │                         │  { status: "processing", progress: "..." }
 │                         │<──────────────────────┤
 │  Show progress          │                       │
 │<────────────────────────┤                       │
 │                         │                       │
 │                         │  Poll again (2s later)│
 │                         ├──────────────────────>│
 │                         │  { status: "complete", document_id }
 │                         │<──────────────────────┤
 │                         │                       │
 │                         │  POST /api/chat/sessions
 │                         ├──────────────────────>│
 │                         │  { session_id }       │
 │                         │<──────────────────────┤
 │                         │                       │
 │                         │  GET /api/documents/{id}
 │                         ├──────────────────────>│
 │                         │  { document content } │
 │                         │<──────────────────────┤
 │                         │                       │
 │  Show document + chat   │                       │
 │<────────────────────────┤                       │
```

### Streaming Chat Flow

```
User                    Frontend                Backend
 │                         │                       │
 │  Type message           │                       │
 │  Click send             │                       │
 ├────────────────────────>│                       │
 │                         │  POST /api/chat/sessions/{id}/messages (SSE)
 │                         │  { message, focus_context }
 │                         ├──────────────────────>│
 │                         │                       │ Retrieve context
 │                         │                       │ Generate response
 │  Show ThinkingIndicator │                       │
 │<────────────────────────┤                       │
 │                         │  event: token         │
 │                         │  data: "Hello"        │
 │                         │<──────────────────────┤
 │  Show "Hello"           │                       │
 │<────────────────────────┤                       │
 │                         │  event: token         │
 │                         │  data: " there"       │
 │                         │<──────────────────────┤
 │  Show "Hello there"     │                       │
 │<────────────────────────┤                       │
 │                         │  event: source        │
 │                         │  data: { chunk_id, ... }
 │                         │<──────────────────────┤
 │                         │                       │
 │                         │  event: done          │
 │                         │<──────────────────────┤
 │  Show complete message  │                       │
 │  with source links      │                       │
 │<────────────────────────┤                       │
```

### Focus Caret Flow

```
User                    Frontend                Backend
 │                         │                       │
 │  Click in document      │                       │
 ├────────────────────────>│                       │
 │                         │  Calculate position   │
 │                         │  Extract ±150 chars   │
 │  Show caret at position │                       │
 │<────────────────────────┤                       │
 │                         │  Save to localStorage │
 │                         │                       │
 │  Type message           │                       │
 │  Click send             │                       │
 ├────────────────────────>│                       │
 │                         │  POST /api/chat/sessions/{id}/messages
 │                         │  { message, focus_context: { text, position, document_id } }
 │                         ├──────────────────────>│
 │                         │                       │ Boost similarity
 │                         │                       │ for focused chunks
 │                         │                       │ Include context
 │                         │                       │ in prompt
 │                         │  Streaming response   │
 │                         │<──────────────────────┤
 │  Show response          │                       │
 │  (context-aware)        │                       │
 │<────────────────────────┤                       │
```


## Error Handling Strategy

### Error Categories and Handling

**1. Network Errors** (Backend unreachable, timeout, connection lost):
```typescript
try {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
} catch (err) {
  if (err instanceof TypeError) {
    setError('Cannot connect to server. Please check your connection.');
  } else {
    setError('Request failed. Please try again.');
  }
}
```

**2. API Errors** (404, 429, 500):
```typescript
const handleAPIError = (status: number, message: string) => {
  switch (status) {
    case 404: return 'Resource not found. It may have been deleted.';
    case 429: return 'Too many requests. Please wait a moment.';
    case 500: return 'Something went wrong on our end. Please try again.';
    default: return message || 'An error occurred.';
  }
};
```

**3. Validation Errors** (Message too long, file too large, unsupported type):
```typescript
const validateMessage = (message: string): string | null => {
  if (message.length === 0) return 'Message cannot be empty';
  if (message.length > 6000) return 'Message too long (max 6000 characters)';
  return null;
};

const validateFile = (file: File): string | null => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown'];
  
  if (file.size > maxSize) return 'File too large. Maximum size is 10MB.';
  if (!allowedTypes.includes(file.type)) return 'Unsupported file type. Please upload PDF, TXT, or MD files.';
  return null;
};
```

**4. State Errors** (Session not found, concurrent operations):
```typescript
// Prevent concurrent message sending
if (isStreaming) return; // UI already shows disabled state

// Validate session exists
if (!currentSession) {
  setError('No active session. Please upload a document first.');
  return;
}
```

### Error Display Components

**Toast Notifications** (transient errors):
```typescript
interface ToastProps {
  message: string;
  type: 'error' | 'success' | 'info';
  duration?: number;
}

export function Toast({ message, type, duration = 3000 }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  if (!visible) return null;

  return (
    <div className={`toast toast-${type}`}>
      {message}
      <button onClick={() => setVisible(false)}>×</button>
    </div>
  );
}
```

**Error Boundaries** (component crashes):
```typescript
class ErrorBoundary extends React.Component<Props, State> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <p>Please refresh the page to continue.</p>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```


## State Management Patterns

### localStorage Persistence

**Session ID**:
```typescript
// Save on session load/create
localStorage.setItem('iubar_current_session_id', sessionId);

// Restore on app mount
const savedSessionId = localStorage.getItem('iubar_current_session_id');
if (savedSessionId) {
  loadSession(savedSessionId);
}

// Clear on session delete
localStorage.removeItem('iubar_current_session_id');
```

**Caret Position** (per session):
```typescript
// Save on caret move
localStorage.setItem(`iubar_caret_position_${sessionId}`, position.toString());

// Restore on session load
const savedPosition = localStorage.getItem(`iubar_caret_position_${sessionId}`);
if (savedPosition) {
  moveCaret(parseInt(savedPosition, 10));
}

// Reset on document switch
localStorage.setItem(`iubar_caret_position_${newSessionId}`, '0');
```

### Optimistic Updates

**Message Sending**:
```typescript
const handleSendMessage = async (message: string) => {
  // Optimistic update: Add user message immediately
  const userMessage: ChatMessage = {
    id: generateUUID(),
    session_id: currentSession!.id,
    role: 'user',
    content: message,
    created_at: new Date().toISOString()
  };
  setMessages(prev => [...prev, userMessage]);

  // Clear input
  setInputValue('');

  // Send to backend (streaming response will add assistant message)
  await sendMessage(currentSession!.id, message, focusContext);
};
```

**Session Deletion**:
```typescript
const handleDeleteSession = async (sessionId: string) => {
  // Optimistic update: Remove from UI immediately
  setSessions(prev => prev.filter(s => s.id !== sessionId));

  try {
    await ChatAPI.deleteSession(sessionId);
  } catch (err) {
    // Rollback on error
    setSessions(prev => [...prev, deletedSession].sort(sortByUpdatedAt));
    setError('Failed to delete session');
  }
};
```

### Derived State

**Most Recent Session**:
```typescript
const mostRecentSession = useMemo(() => {
  if (sessions.length === 0) return null;
  return sessions[0]; // Already sorted by updated_at DESC
}, [sessions]);
```

**Message Count**:
```typescript
const messageCount = useMemo(() => {
  return messages.length;
}, [messages]);
```

**Has Active Document**:
```typescript
const hasActiveDocument = useMemo(() => {
  return currentDocument !== null && currentSession !== null;
}, [currentDocument, currentSession]);
```


## Visual Design Integration

### Design System Reference

All components follow `#[[file:.kiro/documentation/project-docs/visual-identity.md]]`.

**Key Colors** (from design system):
- Background: `#0F1419` (bgPrimary)
- Panel: `#1A2332` (bgPanel)
- Border: `#253550` (border)
- Text: `#E8EDF2` (textPrimary)
- Golden Accent: `#D4A574` (accent)

### Component Styling Examples

**FocusCaret** (golden glow with pulse animation):
```css
.focus-caret {
  position: absolute;
  width: 2px;
  height: 1.2em;
  background: linear-gradient(180deg, var(--accent) 0%, rgba(212, 165, 116, 0) 100%);
  box-shadow: 0 0 8px rgba(212, 165, 116, 0.6);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
```

**ThinkingIndicator** (three animated dots):
```css
.thinking-indicator {
  display: flex;
  gap: 8px;
  padding: 16px;
}

.thinking-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  animation: bounce 1.4s ease-in-out infinite;
}

.thinking-dot:nth-child(1) { animation-delay: 0s; }
.thinking-dot:nth-child(2) { animation-delay: 0.2s; }
.thinking-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-10px); }
}
```

**ChunkHighlight** (fade in/out with border accent):
```css
.chunk-highlight {
  background: rgba(37, 53, 80, 0.5); /* border color with opacity */
  border-left: 3px solid var(--accent);
  padding: 8px;
  margin: 4px 0;
  animation: fadeIn 0.5s ease-in, fadeOut 0.5s ease-out 4.5s;
}

@keyframes fadeIn {
  from { opacity: 0; background: rgba(37, 53, 80, 0); }
  to { opacity: 1; background: rgba(37, 53, 80, 0.5); }
}

@keyframes fadeOut {
  from { opacity: 1; background: rgba(37, 53, 80, 0.5); }
  to { opacity: 0; background: rgba(37, 53, 80, 0); }
}
```

**Loading Skeleton** (shimmer animation):
```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--bgPanel) 0%,
    var(--border) 50%,
    var(--bgPanel) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: 4px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton-heading { height: 32px; width: 60%; margin-bottom: 16px; }
.skeleton-paragraph { height: 16px; width: 100%; margin-bottom: 8px; }
```

**Pattern**: All other components (StreamingMessage, SourceAttribution, UploadProgress) follow similar patterns using design system colors and animations.


## Testing Strategy

### Unit Tests

**Hook Testing** (`useChatSession.test.ts`):
```typescript
describe('useChatSession', () => {
  it('should load sessions on mount', async () => {
    const { result } = renderHook(() => useChatSession());
    
    await act(async () => {
      await result.current.loadSessions();
    });

    expect(result.current.sessions).toHaveLength(2);
    expect(result.current.isLoading).toBe(false);
  });

  it('should sort sessions by updated_at DESC', async () => {
    const { result } = renderHook(() => useChatSession());
    
    await act(async () => {
      await result.current.loadSessions();
    });

    const sessions = result.current.sessions;
    expect(new Date(sessions[0].updated_at).getTime())
      .toBeGreaterThan(new Date(sessions[1].updated_at).getTime());
  });

  it('should persist session ID to localStorage', async () => {
    const { result } = renderHook(() => useChatSession());
    
    await act(async () => {
      await result.current.createSession('doc-123');
    });

    expect(localStorage.getItem('iubar_current_session_id'))
      .toBe(result.current.currentSession!.id);
  });
});
```

**Component Testing** (`DocumentViewer.test.tsx`):
```typescript
describe('DocumentViewer', () => {
  it('should render markdown content', () => {
    const document = {
      content: '# Hello\n\nThis is **bold**.',
      metadata: { title: 'Test Doc' }
    };

    render(<DocumentViewer document={document} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hello');
    expect(screen.getByText('bold')).toHaveStyle({ fontWeight: 'bold' });
  });

  it('should handle click-to-place caret', () => {
    const onCaretClick = jest.fn();
    const document = { content: 'Hello world', metadata: {} };

    render(<DocumentViewer document={document} onCaretClick={onCaretClick} />);

    const content = screen.getByText('Hello world');
    fireEvent.click(content);

    expect(onCaretClick).toHaveBeenCalledWith(expect.any(Number));
  });

  it('should scroll to highlighted chunk', () => {
    const document = { content: 'Content', metadata: {} };
    const { rerender } = render(
      <DocumentViewer document={document} highlightedChunkId={undefined} />
    );

    const scrollIntoView = jest.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    rerender(<DocumentViewer document={document} highlightedChunkId="chunk-123" />);

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center'
    });
  });
});
```

### Integration Tests

**Upload Flow** (`upload-flow.test.ts`):
```typescript
describe('Document Upload Flow', () => {
  it('should complete full upload → session creation flow', async () => {
    render(<App />);

    // Upload file
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const uploadZone = screen.getByTestId('upload-zone');
    fireEvent.drop(uploadZone, { dataTransfer: { files: [file] } });

    // Wait for upload progress
    expect(await screen.findByText('Uploading...')).toBeInTheDocument();

    // Wait for processing
    expect(await screen.findByText('Processing...')).toBeInTheDocument();

    // Wait for completion
    expect(await screen.findByText('Ready!')).toBeInTheDocument();

    // Verify session created and document loaded
    expect(await screen.findByText('test.pdf')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /message/i })).toBeInTheDocument();
  });
});
```

**Streaming Chat** (`streaming-chat.test.ts`):
```typescript
describe('Streaming Chat', () => {
  it('should display streaming response token by token', async () => {
    render(<App />);

    // Assume session already loaded
    const input = screen.getByRole('textbox', { name: /message/i });
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(sendButton);

    // Verify thinking indicator
    expect(await screen.findByTestId('thinking-indicator')).toBeInTheDocument();

    // Verify tokens appear
    expect(await screen.findByText(/Hello/)).toBeInTheDocument();
    expect(await screen.findByText(/Hello there/)).toBeInTheDocument();

    // Verify complete message
    expect(await screen.findByText(/Hello there, how can I help/)).toBeInTheDocument();

    // Verify thinking indicator removed
    expect(screen.queryByTestId('thinking-indicator')).not.toBeInTheDocument();
  });
});
```


## Implementation Phases

### Phase 1.1: Hook Integration (Requirements 1-3)

**Goal**: Replace demo data with real hooks in App.tsx

**Tasks**:
1. Verify all hooks exist and match interfaces
2. Rewrite App.tsx to use hooks instead of demo data
3. Remove all hardcoded demo content
4. Implement session loading on mount
5. Implement auto-load most recent session
6. Add localStorage persistence for session ID
7. Test session CRUD operations

**Validation**:
- App loads without errors
- Sessions fetch from backend
- Most recent session auto-loads
- Session ID persists across refreshes

### Phase 1.2: Document Upload Integration (Requirement 2)

**Goal**: Connect upload flow to backend with session creation

**Tasks**:
1. Verify useDocumentUpload hook
2. Integrate UploadZone with hook
3. Implement status polling (2s intervals)
4. Map progress messages to user-friendly text
5. Auto-create session on upload success
6. Load document content after session creation
7. Handle upload errors gracefully

**Validation**:
- File upload triggers backend processing
- Progress updates display correctly
- Session created automatically on success
- Document content loads in viewer
- Errors display user-friendly messages

### Phase 1.3: Streaming Chat Integration (Requirement 4)

**Goal**: Implement real-time SSE streaming

**Tasks**:
1. Verify useStreamingMessage hook
2. Verify SSEClient service
3. Integrate MessageInput with sendMessage
4. Display ThinkingIndicator before first token
5. Accumulate streaming tokens in StreamingMessage
6. Handle source events
7. Handle done event (add to MessageList)
8. Handle error events
9. Implement SSE reconnection logic (3 retries)
10. Disable input while streaming

**Validation**:
- Messages send to backend
- Thinking indicator appears
- Tokens stream in real-time
- Sources display as links
- Complete message added to history
- Input re-enabled after completion
- Reconnection works on connection drop

### Phase 1.4: Focus Caret Integration (Requirement 5)

**Goal**: Implement focus caret with context extraction

**Tasks**:
1. Verify useFocusCaret hook
2. Integrate FocusCaret component in DocumentViewer
3. Implement click-to-place functionality
4. Implement keyboard navigation (arrows, home, end)
5. Extract ±150 char context on caret move
6. Add focus mode toggle button
7. Send focus context with messages when enabled
8. Persist caret position to localStorage
9. Restore position on session load

**Validation**:
- Caret displays at correct position
- Click moves caret
- Keyboard navigation works
- Context extracted correctly
- Focus context sent with messages
- Position persists across refreshes

### Phase 1.5: Document Viewer Integration (Requirement 6)

**Goal**: Render markdown with chunk highlighting

**Tasks**:
1. Verify DocumentViewer component
2. Integrate react-markdown
3. Add custom renderers for code blocks
4. Implement lazy loading for large documents
5. Integrate ChunkHighlight component
6. Implement scroll-to-chunk on source click
7. Add scroll progress indicator
8. Display document metadata (title, type, chunk count)
9. Handle empty document state

**Validation**:
- Markdown renders correctly
- Code blocks have syntax highlighting
- Large documents load smoothly
- Source links scroll to chunks
- Chunks highlight with fade animation
- Scroll progress indicator works
- Metadata displays correctly

### Phase 1.6: Error Handling (Requirement 7)

**Goal**: Comprehensive error handling and edge cases

**Tasks**:
1. Add error boundary to App
2. Handle backend unreachable on load
3. Handle session load failures
4. Handle document upload failures
5. Map backend errors to user-friendly messages
6. Handle SSE connection failures
7. Prevent concurrent message sending
8. Handle rate limit errors (429)
9. Handle server errors (500)
10. Handle session spending limit
11. Add toast notification system

**Validation**:
- Backend unreachable shows error page
- Session errors display gracefully
- Upload errors show user-friendly messages
- SSE reconnection attempts work
- Concurrent sends prevented
- Rate limit shows countdown
- Server errors show retry button
- Toast notifications appear and dismiss


## Correctness Properties

### Property 1: Session State Consistency

**Validates: Requirement 1.6, 1.7, 1.8**

**Property**: After loading sessions, the most recent session (by `updated_at`) is automatically loaded as `currentSession`.

**Test Strategy**:
```typescript
property('most recent session auto-loads', async () => {
  // Generate random sessions with different updated_at timestamps
  const sessions = fc.array(
    fc.record({
      id: fc.uuid(),
      updated_at: fc.date(),
      document_id: fc.uuid()
    }),
    { minLength: 1, maxLength: 10 }
  );

  // Sort by updated_at DESC
  const sorted = sessions.sort((a, b) => 
    b.updated_at.getTime() - a.updated_at.getTime()
  );

  // Mock API response
  mockGetSessions(sessions);

  // Render app
  const { result } = renderHook(() => useChatSession());
  await act(() => result.current.loadSessions());

  // Verify most recent is loaded
  expect(result.current.currentSession?.id).toBe(sorted[0].id);
});
```

### Property 2: Focus Context Extraction

**Validates: Requirement 5.4**

**Property**: Focus context always contains exactly ±150 characters around the caret position (or less at document boundaries).

**Test Strategy**:
```typescript
property('focus context extraction', () => {
  const document = fc.string({ minLength: 500 });
  const position = fc.integer({ min: 0, max: document.length - 1 });

  const context = extractContext(position, document);

  // Calculate expected bounds
  const expectedStart = Math.max(0, position - 150);
  const expectedEnd = Math.min(document.length, position + 150);
  const expectedLength = expectedEnd - expectedStart;

  // Verify context length
  expect(context.length).toBe(expectedLength);

  // Verify context content
  expect(context).toBe(document.substring(expectedStart, expectedEnd));
});
```

### Property 3: SSE Token Accumulation

**Validates: Requirement 4.2, 4.3**

**Property**: Streaming content accumulates tokens in order without loss or duplication.

**Test Strategy**:
```typescript
property('token accumulation', async () => {
  const tokens = fc.array(fc.string(), { minLength: 1, maxLength: 100 });

  // Mock SSE events
  const events = tokens.map(token => ({ event: 'token', data: token }));

  const { result } = renderHook(() => useStreamingMessage());

  // Send tokens
  for (const event of events) {
    await act(() => result.current.handleSSEEvent(event));
  }

  // Verify accumulated content
  const expected = tokens.join('');
  expect(result.current.streamingContent).toBe(expected);
});
```

### Property 4: Upload Status Polling

**Validates: Requirement 2.2**

**Property**: Status polling continues every 2 seconds until status is 'complete' or 'error'.

**Test Strategy**:
```typescript
property('upload polling', async () => {
  const pollCount = fc.integer({ min: 1, max: 10 });

  // Mock status responses (processing N times, then complete)
  const responses = Array(pollCount).fill({ status: 'processing' });
  responses.push({ status: 'complete', document_id: 'doc-123' });

  mockStatusPolling(responses);

  const { result } = renderHook(() => useDocumentUpload());

  const startTime = Date.now();
  await act(() => result.current.uploadDocument(mockFile));
  const endTime = Date.now();

  // Verify polling happened correct number of times
  expect(mockStatusPolling).toHaveBeenCalledTimes(pollCount + 1);

  // Verify 2-second intervals (with tolerance)
  const expectedDuration = pollCount * 2000;
  const actualDuration = endTime - startTime;
  expect(actualDuration).toBeGreaterThanOrEqual(expectedDuration - 500);
  expect(actualDuration).toBeLessThanOrEqual(expectedDuration + 500);
});
```

### Property 5: localStorage Persistence

**Validates: Requirement 3.8, 5.8**

**Property**: Session ID and caret position persist to localStorage and restore correctly.

**Test Strategy**:
```typescript
property('localStorage persistence', () => {
  const sessionId = fc.uuid();
  const caretPosition = fc.integer({ min: 0, max: 10000 });

  // Save to localStorage
  localStorage.setItem('iubar_current_session_id', sessionId);
  localStorage.setItem(`iubar_caret_position_${sessionId}`, caretPosition.toString());

  // Restore
  const restoredSessionId = localStorage.getItem('iubar_current_session_id');
  const restoredPosition = parseInt(
    localStorage.getItem(`iubar_caret_position_${sessionId}`) || '0',
    10
  );

  // Verify
  expect(restoredSessionId).toBe(sessionId);
  expect(restoredPosition).toBe(caretPosition);
});
```

### Property 6: Error Message Mapping

**Validates: Requirement 7.3**

**Property**: All backend error messages map to user-friendly equivalents.

**Test Strategy**:
```typescript
property('error message mapping', () => {
  const backendErrors = [
    'File too large',
    'Unsupported file type',
    'Could not read this file'
  ];

  const userFriendlyErrors = [
    'This file is too large. Maximum size is 10MB.',
    'This file type is not supported. Please upload PDF, DOCX, TXT, or MD files.',
    'Could not read this file. It may be corrupted or password-protected.'
  ];

  backendErrors.forEach((backendError, index) => {
    const mapped = mapErrorMessage(backendError);
    expect(mapped).toBe(userFriendlyErrors[index]);
  });
});
```


## Dependencies and External Libraries

### Required Dependencies

**React Ecosystem**:
- `react` (^18.2.0) - Core React library
- `react-dom` (^18.2.0) - React DOM renderer
- `react-router-dom` (^6.20.0) - Routing (if needed for future)

**Markdown Rendering**:
- `react-markdown` (^9.0.0) - Markdown to React components
- `remark-gfm` (^4.0.0) - GitHub Flavored Markdown support
- `rehype-highlight` (^7.0.0) - Syntax highlighting for code blocks

**State Management**:
- No external library needed (using React hooks)

**HTTP Client**:
- Native `fetch` API (no axios needed)

**Utilities**:
- `uuid` (^9.0.0) - Generate UUIDs for messages
- `date-fns` (^3.0.0) - Date formatting and manipulation

### Development Dependencies

**Testing**:
- `@testing-library/react` (^14.0.0) - React component testing
- `@testing-library/react-hooks` (^8.0.0) - Hook testing
- `@testing-library/user-event` (^14.0.0) - User interaction simulation
- `vitest` (^1.0.0) - Test runner
- `@vitest/ui` (^1.0.0) - Test UI
- `happy-dom` (^12.0.0) - DOM environment for tests (jsdom alternative)
- `fast-check` (^3.15.0) - Property-based testing

**Type Checking**:
- `typescript` (^5.3.0) - TypeScript compiler
- `@types/react` (^18.2.0) - React type definitions
- `@types/react-dom` (^18.2.0) - React DOM type definitions

**Build Tools**:
- `vite` (^5.0.0) - Build tool and dev server
- `@vitejs/plugin-react` (^4.2.0) - Vite React plugin

### Installation Commands

```bash
# Production dependencies
npm install react-markdown remark-gfm rehype-highlight uuid date-fns

# Development dependencies
npm install -D @testing-library/react @testing-library/react-hooks @testing-library/user-event fast-check
```

### Import Patterns

```typescript
// React
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// Markdown
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

// Utilities
import { v4 as uuidv4 } from 'uuid';
import { formatDistanceToNow } from 'date-fns';

// Internal
import { ChatAPI } from '@/services/chat-api';
import { SSEClient } from '@/services/sse-client';
import type { ChatSession, ChatMessage } from '@/types/chat';
```


## Performance Considerations

### Optimization Strategies

**1. Prevent Unnecessary Re-renders**:
```typescript
// Memoize expensive components
const DocumentViewer = React.memo(({ document, focusCaret }) => {
  // Only re-render when document or focusCaret changes
}, (prevProps, nextProps) => {
  return prevProps.document.id === nextProps.document.id &&
         prevProps.focusCaret === nextProps.focusCaret;
});

// Memoize callbacks
const handleSendMessage = useCallback((message: string) => {
  sendMessage(currentSession!.id, message, focusContext);
}, [currentSession, focusContext, sendMessage]);

// Memoize computed values
const sortedSessions = useMemo(() => {
  return sessions.sort((a, b) => 
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}, [sessions]);
```

**2. Debounce Expensive Operations**:
```typescript
// Debounce focus context extraction
const debouncedExtractContext = useMemo(
  () => debounce((position: number) => {
    const context = extractContext(position, documentContent);
    setFocusContext(context);
  }, 300),
  [documentContent]
);
```

**3. Lazy Load Large Documents**:
```typescript
// Render only first 10,000 characters initially
const [visibleContent, setVisibleContent] = useState(
  document.content.substring(0, 10000)
);

// Load more on scroll
const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
  const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
  const scrollPercentage = (scrollTop / (scrollHeight - clientHeight)) * 100;

  if (scrollPercentage > 80 && visibleContent.length < document.content.length) {
    const nextChunk = document.content.substring(
      visibleContent.length,
      visibleContent.length + 10000
    );
    setVisibleContent(prev => prev + nextChunk);
  }
};
```

**4. Optimize SSE Event Handling**:
```typescript
// Batch token updates to reduce re-renders
const tokenBuffer = useRef<string[]>([]);
const flushInterval = useRef<NodeJS.Timeout>();

const handleToken = (token: string) => {
  tokenBuffer.current.push(token);

  if (!flushInterval.current) {
    flushInterval.current = setInterval(() => {
      if (tokenBuffer.current.length > 0) {
        setStreamingContent(prev => prev + tokenBuffer.current.join(''));
        tokenBuffer.current = [];
      }
    }, 50); // Flush every 50ms
  }
};
```

### Bundle Size Optimization

**Code Splitting**:
```typescript
// Lazy load heavy components
const DocumentViewer = lazy(() => import('@/components/document/DocumentViewer'));
const ChatInterface = lazy(() => import('@/components/chat/ChatInterface'));

// Show loading skeleton while loading
<Suspense fallback={<LoadingSkeleton />}>
  <DocumentViewer document={document} />
</Suspense>
```

**Tree Shaking**:
```typescript
// Import only what's needed
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
// Instead of: import { formatDistanceToNow } from 'date-fns';
```

### Memory Management

**Cleanup Effects**:
```typescript
useEffect(() => {
  const client = new SSEClient();
  sseClientRef.current = client;

  return () => {
    // Cleanup on unmount
    client.disconnect();
    sseClientRef.current = null;
  };
}, []);
```

**Limit Message History**:
```typescript
// Keep only last 50 messages in memory
const recentMessages = useMemo(() => {
  return messages.slice(-50);
}, [messages]);
```


## Security Considerations

### Input Validation

**Message Validation**:
```typescript
const validateMessage = (message: string): string | null => {
  // Check length
  if (message.trim().length === 0) {
    return 'Message cannot be empty';
  }
  if (message.length > 6000) {
    return 'Message too long (max 6000 characters)';
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(message)) {
      return 'Message contains invalid content';
    }
  }

  return null;
};
```

**File Validation**:
```typescript
const validateFile = (file: File): string | null => {
  // Check size
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return 'File too large. Maximum size is 10MB.';
  }

  // Check type
  const allowedTypes = [
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (!allowedTypes.includes(file.type)) {
    return 'Unsupported file type.';
  }

  // Check extension
  const allowedExtensions = ['.pdf', '.txt', '.md', '.docx'];
  const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

  if (!allowedExtensions.includes(extension)) {
    return 'Unsupported file extension.';
  }

  return null;
};
```

### XSS Prevention

**Sanitize Markdown**:
```typescript
// Use react-markdown with safe defaults
<ReactMarkdown
  components={{
    // Disable dangerous HTML
    html: () => null,
    // Sanitize links
    a: ({ href, children }) => {
      // Only allow http(s) and mailto
      if (href && (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:'))) {
        return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
      }
      return <span>{children}</span>;
    }
  }}
  // Disable HTML in markdown
  skipHtml={true}
>
  {content}
</ReactMarkdown>
```

**Escape User Content**:
```typescript
// React automatically escapes text content
// But be careful with dangerouslySetInnerHTML
// NEVER use: <div dangerouslySetInnerHTML={{ __html: userContent }} />
```

### API Security

**HTTPS Only**:
```typescript
// Verify API URL uses HTTPS in production
const apiUrl = import.meta.env.VITE_API_BASE_URL;

if (import.meta.env.PROD && !apiUrl.startsWith('https://')) {
  console.error('API URL must use HTTPS in production');
  throw new Error('Insecure API configuration');
}
```

**No Sensitive Data in localStorage**:
```typescript
// NEVER store API keys or tokens in localStorage
// Only store non-sensitive data like session IDs and preferences

// Good:
localStorage.setItem('iubar_current_session_id', sessionId);

// Bad:
// localStorage.setItem('api_key', apiKey); // NEVER DO THIS
```

### Rate Limiting

**Frontend Rate Limiting**:
```typescript
const useRateLimit = (maxRequests: number, windowMs: number) => {
  const requests = useRef<number[]>([]);

  const checkRateLimit = (): boolean => {
    const now = Date.now();
    // Remove old requests outside window
    requests.current = requests.current.filter(time => now - time < windowMs);

    if (requests.current.length >= maxRequests) {
      return false; // Rate limit exceeded
    }

    requests.current.push(now);
    return true;
  };

  return { checkRateLimit };
};

// Usage
const { checkRateLimit } = useRateLimit(1, 2000); // 1 request per 2 seconds

const handleSendMessage = async (message: string) => {
  if (!checkRateLimit()) {
    setError('Please wait before sending another message');
    return;
  }

  await sendMessage(message);
};
```


## Migration from Demo to Real Data

### Current Demo Implementation

**App.tsx (Before)**:
```typescript
// Demo data
const demoMessages = [
  { id: '1', role: 'user', content: 'Hello' },
  { id: '2', role: 'assistant', content: 'Hi there!' }
];

const demoDocument = {
  id: 'demo-doc',
  content: '# Demo Document\n\nThis is demo content.',
  metadata: { title: 'Demo' }
};

function App() {
  const [messages, setMessages] = useState(demoMessages);
  const [document, setDocument] = useState(demoDocument);
  const [isStreaming, setIsStreaming] = useState(false);

  const handleSendMessage = (message: string) => {
    // Simulate streaming
    setIsStreaming(true);
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: 'Demo response'
      }]);
      setIsStreaming(false);
    }, 1000);
  };

  return (
    <ChatInterface
      messages={messages}
      document={document}
      isStreaming={isStreaming}
      onSendMessage={handleSendMessage}
    />
  );
}
```

### New Real Implementation

**App.tsx (After)**:
```typescript
function App() {
  // Real hooks
  const {
    currentSession,
    sessions,
    isLoading: sessionsLoading,
    error: sessionError,
    loadSessions,
    loadSession,
    createSession,
    deleteSession
  } = useChatSession();

  const {
    streamingContent,
    isStreaming,
    sources,
    error: streamError,
    sendMessage
  } = useStreamingMessage();

  const {
    caretPosition,
    focusContext,
    moveCaret,
    focusModeEnabled,
    toggleFocusMode
  } = useFocusCaret(currentDocument?.content || '', currentDocument?.id || '');

  const {
    uploadProgress,
    uploadError,
    uploadDocument
  } = useDocumentUpload();

  // Real state
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  // Auto-load most recent session
  useEffect(() => {
    if (sessions.length > 0 && !currentSession) {
      loadSession(sessions[0].id);
    }
  }, [sessions]);

  // Load document when session changes
  useEffect(() => {
    if (currentSession) {
      fetchDocument(currentSession.document_id).then(setCurrentDocument);
      fetchMessages(currentSession.id).then(setMessages);
    }
  }, [currentSession]);

  // Real event handlers
  const handleSendMessage = async (message: string) => {
    if (!currentSession) return;

    // Optimistic update
    const userMessage: ChatMessage = {
      id: uuidv4(),
      session_id: currentSession.id,
      role: 'user',
      content: message,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    // Send to backend
    const context = focusModeEnabled ? focusContext : null;
    await sendMessage(currentSession.id, message, context);
  };

  const handleDocumentUpload = async (file: File) => {
    const result = await uploadDocument(file);
    if (result.success) {
      const session = await createSession(result.document_id!);
      const doc = await fetchDocument(result.document_id!);
      setCurrentDocument(doc);
    }
  };

  // Conditional rendering
  if (sessionsLoading) {
    return <LoadingSkeleton />;
  }

  if (sessionError) {
    return <ErrorPage error={sessionError} onRetry={loadSessions} />;
  }

  if (!currentSession) {
    return <UploadZone onUpload={handleDocumentUpload} />;
  }

  return (
    <ChatInterface
      document={currentDocument}
      messages={messages}
      streamingContent={streamingContent}
      isStreaming={isStreaming}
      sources={sources}
      onSendMessage={handleSendMessage}
      focusCaret={
        <FocusCaret
          position={caretPosition}
          onMove={moveCaret}
          enabled={focusModeEnabled}
        />
      }
      focusModeEnabled={focusModeEnabled}
      onToggleFocusMode={toggleFocusMode}
    />
  );
}
```

### Migration Checklist

- [ ] Remove all demo data constants
- [ ] Replace useState with hook calls
- [ ] Add useEffect for data loading
- [ ] Update event handlers to call real APIs
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add conditional rendering based on state
- [ ] Test all flows end-to-end
- [ ] Verify no demo data remains


## Summary

This design document provides a comprehensive technical blueprint for Phase 1 of Frontend Integration. It covers:

**Architecture**:
- Clear separation between hooks (state), services (API), and components (UI)
- App.tsx as the central orchestrator
- Real-time SSE streaming for chat responses
- localStorage persistence for session and caret state

**Key Components**:
- 4 custom hooks managing distinct concerns (session, streaming, caret, upload)
- 2 service classes for API communication (ChatAPI, SSEClient)
- 10+ UI components for chat, document viewing, and upload
- Comprehensive error handling and loading states

**Data Flow**:
- Document upload → session creation → document loading
- Message sending → SSE streaming → message history
- Focus caret → context extraction → enhanced responses

**Quality Assurance**:
- 6 correctness properties with property-based tests
- Unit tests for all hooks and components
- Integration tests for complete user flows
- Error handling for all edge cases

**Implementation Strategy**:
- 6 sequential phases building on each other
- Clear validation criteria for each phase
- Migration path from demo to real data

The design ensures a robust, performant, and user-friendly integration that transforms the demo UI into a production-ready application.

## Next Steps

After design approval:
1. Create tasks.md with detailed implementation tasks
2. Begin Phase 1.1: Hook Integration
3. Proceed through phases sequentially
4. Validate each phase before moving to next
5. Complete with comprehensive testing

