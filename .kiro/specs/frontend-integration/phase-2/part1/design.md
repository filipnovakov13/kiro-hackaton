# Design Document - Phase 2 Part 1: Essential Functionality

## Overview

This design document specifies the technical implementation for Phase 2 Part 1 of the Frontend Integration feature. Part 1 focuses on completing essential functionality gaps from Phase 1, ensuring the application runs with all core features specified in the PRD.

### Scope

Part 1 addresses five critical areas:

1. **Implementation Gaps (Requirement 7.1)**: Fix bugs discovered during Phase 1 property testing, add missing UI components, and complete backend configuration
2. **API Integration (Requirement 8)**: Configure and optimize Voyage AI and DeepSeek API usage with proper caching strategies
3. **Loading States (Requirement 9)**: Implement comprehensive visual feedback for all async operations
4. **DocumentViewer Essentials (Requirement 9.5)**: Add markdown rendering, syntax highlighting, and basic focus caret functionality
5. **Visual Identity (Requirement 15)**: Apply consistent typography, spacing, and welcome screen design
6. **Basic Security (Requirement 14)**: Implement input sanitization and secure API communication

### Key Design Decisions

**Markdown Rendering**: Use `react-markdown` with `remark-gfm` for GitHub-flavored markdown support. This provides robust parsing and rendering without custom implementation complexity.

**Syntax Highlighting**: Use `react-syntax-highlighter` with a dark theme matching the visual identity. This provides language detection and consistent styling.

**Loading Skeletons**: Implement skeleton screens (not spinners) that match actual component layouts. This provides better perceived performance and reduces layout shift.

**API Optimization**: Structure prompts with static prefixes to maximize DeepSeek cache hits (90% cost reduction). Use `voyage-4-lite` for embeddings (200M free tokens, lowest latency).

**Focus Caret**: Implement paragraph-level focus caret for MVP. Letter-level precision is deferred to Part 2 due to complexity of coordinate mapping in markdown-rendered content.

## Architecture

### Component Hierarchy

```
App.tsx (Root)
├── DocumentViewer (Left Panel)
│   ├── MarkdownRenderer (react-markdown)
│   ├── FocusCaret (paragraph-level)
│   └── ChunkHighlight (scroll-to + fade animation)
├── ChatInterface (Right Panel)
│   ├── SessionControls (New/Delete/Switch)
│   ├── CostTracker (tokens/cost/cache%)
│   ├── MessageList
│   │   ├── Message
│   │   ├── SourceAttribution (clickable links)
│   │   └── ThinkingIndicator (contextual)
│   └── MessageInput (character count)
└── UploadZone (Initial State)
    ├── WelcomeMessage
    ├── UploadTabs (File/URL/GitHub)
    └── UploadProgress (stages)
```

### Data Flow

**Session Management**:
```
User Action → Handler (App.tsx) → API Call → Update State → Save to localStorage → Re-render
```

**Document Upload**:
```
File/URL/GitHub → UploadZone → API (/api/documents/upload) → Processing → Embedding (Voyage AI) → ChromaDB → Ready
```

**Chat Message**:
```
User Input → MessageInput → API (/api/chat/stream) → DeepSeek (with caching) → Streaming Response → MessageList
```

**Cost Tracking**:
```
Message Sent → Response Metadata → Extract Token Counts → Fetch Session Stats → Update CostTracker Display
```

### External Service Integration

**Voyage AI**:
- Model: `voyage-4-lite` (200M free tokens, 32K context, 1024 dimensions)
- Batch Size: Up to 128 chunks per request
- Caching: ChromaDB stores embeddings (never re-embed)
- Rate Limits: Monitor via backend logs

**DeepSeek**:
- Model: `deepseek-chat` (128K context)
- Streaming: Always enabled for better UX
- Caching: Structure prompts with static prefix (system message + document context)
- Cache Hit Rate: 90% cost reduction ($0.014/M tokens vs $0.14/M tokens)
- Monitoring: Track `prompt_cache_hit_tokens` and `prompt_cache_miss_tokens` in response metadata

## Components and Interfaces

### 1. Session Management (App.tsx)

**Bug Fix: Session Sorting**
```typescript
// BEFORE (Bug from Task 62)
const mostRecentSession = sessions[0]; // Wrong: unsorted array

// AFTER (Fix)
const sortedSessions = [...sessions].sort((a, b) => 
  new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
);
const mostRecentSession = sortedSessions[0];
```

**Bug Fix: localStorage Persistence**
```typescript
// Save session ID when session changes
useEffect(() => {
  if (currentSessionId) {
    localStorage.setItem('currentSessionId', currentSessionId);
  }
}, [currentSessionId]);

// Restore session ID on mount
useEffect(() => {
  const savedSessionId = localStorage.getItem('currentSessionId');
  if (savedSessionId && sessions.find(s => s.id === savedSessionId)) {
    setCurrentSessionId(savedSessionId);
  }
}, [sessions]);

// Clear session ID when deleted
const handleDeleteSession = async (sessionId: string) => {
  await api.deleteSession(sessionId);
  if (sessionId === currentSessionId) {
    localStorage.removeItem('currentSessionId');
    setCurrentSessionId(null);
  }
};
```

**UI Components**:
```typescript
// ChatInterface.tsx - Add session controls
<div className="session-controls">
  <button onClick={onNewSession}>New Session</button>
  <SessionSwitcher 
    sessions={sessions}
    currentSessionId={currentSessionId}
    onSwitch={onSessionSwitch}
  />
  <button onClick={() => onDeleteSession(currentSessionId)}>
    Delete Session
  </button>
</div>
```

### 2. Backend Configuration (backend/app/config.py)

**Complete Settings Class**:
```python
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    # Existing fields...
    
    # DeepSeek Configuration
    deepseek_api_url: str = Field(default="https://api.deepseek.com/v1")
    deepseek_model: str = Field(default="deepseek-chat")
    deepseek_timeout_seconds: int = Field(default=60)
    
    # Context Configuration
    max_context_tokens: int = Field(default=120000)  # Leave 8K for response
    similarity_threshold: float = Field(default=0.7)
    focus_boost_amount: float = Field(default=0.2)
    top_k_chunks: int = Field(default=10)
    
    # Caching Configuration
    response_cache_max_size: int = Field(default=1000)
    response_cache_ttl_seconds: int = Field(default=3600)
    
    # Rate Limiting
    rate_limit_queries_per_hour: int = Field(default=100)
    rate_limit_max_concurrent_streams: int = Field(default=5)
    
    # Spending Limits
    default_spending_limit_usd: float = Field(default=10.0)
    
    # Session Management
    session_cleanup_interval_hours: int = Field(default=24)
    session_max_age_days: int = Field(default=30)
    
    # Message Validation
    max_message_length: int = Field(default=6000)
    
    # Circuit Breaker
    circuit_breaker_failure_threshold: int = Field(default=5)
    circuit_breaker_success_threshold: int = Field(default=2)
    circuit_breaker_timeout_seconds: int = Field(default=60)
    
    class Config:
        env_file = ".env"
        # Remove: extra = "allow"  # This was a quick fix, now we have explicit fields
```

### 3. Error Handling (frontend/src/utils/errorMapping.ts)

**Bug Fix: Function Object Handling**:
```typescript
// BEFORE (Bug from Property Test)
export function mapUploadError(error: string): string {
  const mapping: Record<string, string> = {
    'file_too_large': 'File size exceeds 10MB limit',
    // ...
  };
  return mapping[error] || 'Upload failed. Please try again.';
}

// AFTER (Fix)
export function mapUploadError(error: unknown): string {
  // Type guard: ensure error is a string
  if (typeof error !== 'string') {
    return 'Upload failed. Please try again.';
  }
  
  const mapping: Record<string, string> = {
    'file_too_large': 'File size exceeds 10MB limit',
    'invalid_format': 'Only PDF files are supported',
    'processing_failed': 'Failed to process document',
    'network_error': 'Network error. Check your connection.',
  };
  
  return mapping[error] || 'Upload failed. Please try again.';
}
```

### 4. DocumentViewer with Markdown

**Component Structure**:
```typescript
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { spacing } from '@/design-system/layout';
import { accents, backgrounds } from '@/design-system/colors';
import { fontFamilies } from '@/design-system/typography';

interface DocumentViewerProps {
  content: string;
  focusedChunkId?: string;
  onChunkClick?: (chunkId: string) => void;
}

export function DocumentViewer({ content, focusedChunkId, onChunkClick }: DocumentViewerProps) {
  return (
    <div className="document-viewer" style={{ margin: `${spacing['3xl']}px` }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                customStyle={{
                  borderLeft: `3px solid ${accents.highlight}`,
                  fontFamily: fontFamilies.mono,
                }}
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          p({ children }) {
            return (
              <p 
                onClick={() => onChunkClick?.(/* chunk id */)}
                className="paragraph"
              >
                {children}
              </p>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
```

**Focus Caret (Paragraph-Level)**:
```typescript
import { accents } from '@/design-system/colors';

interface FocusCaretProps {
  paragraphIndex: number;
  visible: boolean;
}

export function FocusCaret({ paragraphIndex, visible }: FocusCaretProps) {
  if (!visible) return null;
  
  return (
    <div 
      className="focus-caret"
      style={{
        position: 'absolute',
        left: 0,
        top: `${paragraphIndex * 24}px`,
        width: '2px',
        height: '20px',
        backgroundColor: accents.highlight,
        boxShadow: `0 0 8px ${accents.highlight}66`,
        animation: 'blink 1s infinite',
      }}
    />
  );
}
```

**Keyboard Navigation**:
```typescript
const handleKeyDown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowUp':
      setFocusedParagraph(prev => Math.max(0, prev - 1));
      break;
    case 'ArrowDown':
      setFocusedParagraph(prev => Math.min(totalParagraphs - 1, prev + 1));
      break;
    case 'Home':
      setFocusedParagraph(0);
      break;
    case 'End':
      setFocusedParagraph(totalParagraphs - 1);
      break;
    case 'PageUp':
      scrollBy({ top: -window.innerHeight, behavior: 'smooth' });
      break;
    case 'PageDown':
      scrollBy({ top: window.innerHeight, behavior: 'smooth' });
      break;
  }
};
```

### 5. Loading States

**Skeleton Components**:
```typescript
// SessionListSkeleton.tsx
export function SessionListSkeleton() {
  return (
    <div className="session-list-skeleton">
      {[1, 2, 3].map(i => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-line" style={{ width: '70%' }} />
          <div className="skeleton-line" style={{ width: '40%' }} />
        </div>
      ))}
    </div>
  );
}

// DocumentSkeleton.tsx
export function DocumentSkeleton() {
  return (
    <div className="document-skeleton">
      <div className="skeleton-heading" />
      <div className="skeleton-paragraph" />
      <div className="skeleton-paragraph" />
      <div className="skeleton-heading" />
      <div className="skeleton-paragraph" />
    </div>
  );
}

// MessageListSkeleton.tsx
export function MessageListSkeleton() {
  return (
    <div className="message-list-skeleton">
      {[1, 2].map(i => (
        <div key={i} className="skeleton-message">
          <div className="skeleton-line" style={{ width: '90%' }} />
          <div className="skeleton-line" style={{ width: '75%' }} />
        </div>
      ))}
    </div>
  );
}
```

**Skeleton Styles** (following visual-identity.md):
```typescript
import { backgrounds } from '@/design-system/colors';
import { durations, easings } from '@/design-system/animations';

// Use existing design tokens for skeleton styling
const skeletonStyle = {
  background: backgrounds.panel,
  backgroundImage: `linear-gradient(
    90deg,
    ${backgrounds.panel} 0%,
    ${backgrounds.hover} 50%,
    ${backgrounds.panel} 100%
  )`,
  backgroundSize: '200% 100%',
  animation: `shimmer ${durations.base * 5}ms infinite`,
  borderRadius: '4px',
};
```

```css
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

**ThinkingIndicator with Context**:
```typescript
import { accents } from '@/design-system/colors';
import { durations } from '@/design-system/animations';

interface ThinkingIndicatorProps {
  message?: string;
}

export function ThinkingIndicator({ message = 'Thinking...' }: ThinkingIndicatorProps) {
  return (
    <div className="thinking-indicator">
      <span className="thinking-text">{message}</span>
      <div className="thinking-dots">
        <span className="dot" style={{ animationDelay: '0s' }} />
        <span className="dot" style={{ animationDelay: '0.2s' }} />
        <span className="dot" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  );
}

// Styling uses design tokens
const dotStyle = {
  backgroundColor: accents.highlight,
  boxShadow: `0 0 8px ${accents.highlight}`,
  animation: `pulse ${durations.thinkingCycle}ms infinite`,
};
```

**UploadProgress Stages**:
```typescript
type UploadStage = 'uploading' | 'processing' | 'ready' | 'failed';

interface UploadProgressProps {
  stage: UploadStage;
  progress?: number; // 0-100 for uploading stage
  error?: string;
}

export function UploadProgress({ stage, progress, error }: UploadProgressProps) {
  return (
    <div className="upload-progress">
      {stage === 'uploading' && (
        <>
          <span>Uploading...</span>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </>
      )}
      {stage === 'processing' && (
        <>
          <span>Processing...</span>
          <div className="spinner" />
        </>
      )}
      {stage === 'ready' && (
        <>
          <CheckIcon className="success-icon" />
          <span>Ready!</span>
        </>
      )}
      {stage === 'failed' && (
        <>
          <XIcon className="error-icon" />
          <span>{error || 'Upload failed'}</span>
        </>
      )}
    </div>
  );
}
```

### 6. Cost Tracking

**CostTracker Component**:
```typescript
import { text } from '@/design-system/colors';
import { typography, fontFamilies } from '@/design-system/typography';
import { spacing } from '@/design-system/layout';

interface SessionStats {
  total_tokens: number;
  cached_tokens: number;
  total_cost_usd: number;
}

interface CostTrackerProps {
  sessionId: string;
}

export function CostTracker({ sessionId }: CostTrackerProps) {
  const [stats, setStats] = useState<SessionStats | null>(null);
  
  useEffect(() => {
    const fetchStats = async () => {
      const response = await fetch(`/api/chat/sessions/${sessionId}/stats`);
      const data = await response.json();
      setStats(data);
    };
    
    fetchStats();
  }, [sessionId]);
  
  if (!stats) return null;
  
  const cacheHitRate = stats.total_tokens > 0
    ? (stats.cached_tokens / stats.total_tokens * 100).toFixed(1)
    : '0.0';
  
  return (
    <div 
      className="cost-tracker"
      style={{
        fontSize: `${typography.caption.fontSize}px`,
        color: text.secondary,
        fontFamily: fontFamilies.mono,
        padding: `${spacing.sm}px ${spacing.md}px`,
      }}
    >
      <span>Tokens: {stats.total_tokens.toLocaleString()}</span>
      <span> | </span>
      <span>Cost: ${stats.total_cost_usd.toFixed(4)}</span>
      <span> | </span>
      <span>Cache: {cacheHitRate}%</span>
    </div>
  );
}
```

### 7. Source Attribution

**SourceAttribution Component**:
```typescript
interface Source {
  chunk_id: string;
  page_number?: number;
  similarity_score: number;
}

interface SourceAttributionProps {
  sources: Source[];
  onSourceClick: (chunkId: string) => void;
}

export function SourceAttribution({ sources, onSourceClick }: SourceAttributionProps) {
  if (!sources || sources.length === 0) return null;
  
  return (
    <div className="source-attribution">
      <span className="source-label">Sources:</span>
      {sources.map((source, index) => (
        <button
          key={source.chunk_id}
          className="source-link"
          onClick={() => onSourceClick(source.chunk_id)}
        >
          Chunk {index + 1}
          {source.page_number && `, Page ${source.page_number}`}
        </button>
      ))}
    </div>
  );
}
```

**Integration in MessageList**:
```typescript
{message.metadata?.sources && (
  <SourceAttribution
    sources={message.metadata.sources}
    onSourceClick={(chunkId) => {
      // Scroll DocumentViewer to chunk
      scrollToChunk(chunkId);
      // Highlight chunk with fade-out animation
      highlightChunk(chunkId, 5000); // 5 seconds
    }}
  />
)}
```

### 8. Welcome Screen

**WelcomeMessage Component**:
```typescript
import { typography, typographyStyles } from '@/design-system/typography';
import { text } from '@/design-system/colors';

export function WelcomeMessage() {
  return (
    <div className="welcome-screen">
      <h2 
        className="welcome-title"
        style={{
          ...typographyStyles.h2,
          color: text.primary,
          textAlign: 'center',
        }}
      >
        What would you like to explore today?
      </h2>
      <p 
        className="welcome-subtitle"
        style={{
          ...typographyStyles.body,
          color: text.secondary,
          textAlign: 'center',
        }}
      >
        Ask me about the content, or just start exploring
      </p>
    </div>
  );
}
```

**Initial Layout** (App.tsx):
```typescript
// Show welcome screen when no document and no session
const showWelcome = !currentDocument && !currentSessionId;

return (
  <div className="app">
    {showWelcome ? (
      <div className="welcome-container">
        <WelcomeMessage />
        <UploadZone onUpload={handleUpload} />
      </div>
    ) : (
      <div className="split-pane">
        <DocumentViewer content={currentDocument.content} />
        <ChatInterface sessionId={currentSessionId} />
      </div>
    )}
  </div>
);
```

### 9. Upload Tabs (File/URL/GitHub)

**UploadZone with Tabs**:
```typescript
type UploadMode = 'file' | 'url' | 'github';

export function UploadZone({ onUpload }: UploadZoneProps) {
  const [mode, setMode] = useState<UploadMode>('file');
  
  return (
    <div className="upload-zone">
      <div className="upload-tabs">
        <button 
          className={mode === 'file' ? 'active' : ''}
          onClick={() => setMode('file')}
        >
          File
        </button>
        <button 
          className={mode === 'url' ? 'active' : ''}
          onClick={() => setMode('url')}
        >
          URL
        </button>
        <button 
          className={mode === 'github' ? 'active' : ''}
          onClick={() => setMode('github')}
        >
          GitHub
        </button>
      </div>
      
      {mode === 'file' && <FileUpload onUpload={onUpload} />}
      {mode === 'url' && <UrlInput onSubmit={handleUrlUpload} />}
      {mode === 'github' && <GitHubInput onSubmit={handleGitHubUpload} />}
    </div>
  );
}
```

**GitHub Integration** (using gitingest):
```typescript
async function handleGitHubUpload(repoUrl: string) {
  try {
    // Validate GitHub URL
    const githubRegex = /^https:\/\/github\.com\/[\w-]+\/[\w-]+$/;
    if (!githubRegex.test(repoUrl)) {
      throw new Error('Invalid GitHub repository URL');
    }
    
    // Fetch via gitingest API
    const response = await fetch('https://gitingest.com/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: repoUrl }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch repository');
    }
    
    const { content } = await response.json();
    
    // Upload as text document
    await onUpload({
      type: 'text',
      content,
      metadata: { source: 'github', url: repoUrl },
    });
  } catch (error) {
    // Handle errors: invalid URL, private repo, rate limits
    showToast(error.message, 'error');
  }
}
```

### 10. Typography System

**Font Loading** (index.html):
```html
<head>
  <!-- Preconnect for performance -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  
  <!-- Load fonts (Inter Variable, iA Writer Quattro, JetBrains Mono) -->
  <!-- Note: Fonts already defined in design-system/typography.ts -->
</head>
```

**Use Existing Typography Tokens**:
```typescript
import { typography, fontFamilies, typographyStyles } from '@/design-system/typography';

// All typography uses existing design system tokens
// No new typography definitions needed
```

### 11. Spacing System

**Use Existing Spacing Tokens**:
```typescript
import { spacing, padding, paddingClasses } from '@/design-system/layout';

// All spacing uses existing design system tokens
// spacing.xs = 4px
// spacing.sm = 8px
// spacing.md = 16px
// spacing.lg = 24px
// spacing.xl = 32px
// spacing['2xl'] = 48px
// spacing['3xl'] = 64px

// Usage in components
<div style={{ padding: `${spacing.xl}px` }}>...</div>
<div style={{ margin: `${spacing['3xl']}px` }}>...</div>

// Or use Tailwind classes
<div className={paddingClasses.panel}>...</div>
```

### 12. Security Measures

**Input Sanitization**:
```typescript
import DOMPurify from 'dompurify';

// Sanitize markdown before rendering
function sanitizeMarkdown(content: string): string {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'code', 'pre', 'blockquote', 'strong', 'em'],
    ALLOWED_ATTR: ['href', 'class'],
  });
}

// Validate URLs before opening
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
```

**API Response Validation**:
```typescript
import { z } from 'zod';

const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  timestamp: z.string(),
  metadata: z.object({
    sources: z.array(z.object({
      chunk_id: z.string(),
      page_number: z.number().optional(),
      similarity_score: z.number(),
    })).optional(),
  }).optional(),
});

async function fetchMessages(sessionId: string) {
  const response = await fetch(`/api/chat/sessions/${sessionId}/messages`);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Validate response schema
  const messages = z.array(MessageSchema).parse(data);
  
  return messages;
}
```

**HTTPS Enforcement**:
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    https: process.env.NODE_ENV === 'production',
  },
  define: {
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
      process.env.VITE_API_BASE_URL || 'http://localhost:8000'
    ),
  },
});

// Warn if using HTTP in production
if (import.meta.env.PROD && !import.meta.env.VITE_API_BASE_URL.startsWith('https://')) {
  console.warn('WARNING: Using HTTP in production. Switch to HTTPS for security.');
}
```

## Data Models

### Session

```typescript
interface Session {
  id: string;
  document_id: string;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  metadata?: {
    document_name?: string;
    message_count?: number;
  };
}
```

### Message

```typescript
interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO 8601
  metadata?: {
    sources?: Source[];
    tokens?: {
      prompt_tokens: number;
      cached_tokens: number;
      completion_tokens: number;
    };
    cost_usd?: number;
  };
}
```

### Source

```typescript
interface Source {
  chunk_id: string;
  page_number?: number;
  similarity_score: number;
  content_preview?: string;
}
```

### SessionStats

```typescript
interface SessionStats {
  session_id: string;
  total_messages: number;
  total_tokens: number;
  cached_tokens: number;
  total_cost_usd: number;
  created_at: string;
  updated_at: string;
}
```

### UploadMetadata

```typescript
interface UploadMetadata {
  source: 'file' | 'url' | 'github';
  filename?: string;
  url?: string;
  size_bytes?: number;
  mime_type?: string;
}
```

### DeepSeekResponse

```typescript
interface DeepSeekResponse {
  id: string;
  object: 'chat.completion' | 'chat.completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message?: {
      role: 'assistant';
      content: string;
    };
    delta?: {
      role?: 'assistant';
      content?: string;
    };
    finish_reason: 'stop' | 'length' | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_cache_hit_tokens: number;
    prompt_cache_miss_tokens: number;
  };
}
```

### VoyageEmbeddingRequest

```typescript
interface VoyageEmbeddingRequest {
  input: string | string[]; // Single text or batch (up to 128)
  model: 'voyage-4-lite';
  input_type?: 'document' | 'query';
  truncation?: boolean;
}

interface VoyageEmbeddingResponse {
  object: 'list';
  data: Array<{
    object: 'embedding';
    embedding: number[]; // 1024 dimensions
    index: number;
  }>;
  model: string;
  usage: {
    total_tokens: number;
  };
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified the following redundancies:
- Multiple UI component existence checks (buttons, tabs, welcome screen) can be grouped as integration tests rather than separate properties
- Loading skeleton design compliance checks are visual QA, not runtime properties
- Code quality checks (unused imports, hardcoded values) are linting concerns, not functional properties
- Manual tasks (research, documentation, configuration) are not testable properties

The following properties focus on testable functional correctness:

### Property 1: Session Sorting Invariant

*For any* array of sessions, sorting by `updated_at` DESC should place the most recently updated session first, and the order should be stable for sessions with identical timestamps.

**Validates: Requirements 7.1.1**

### Property 2: localStorage Round-Trip

*For any* valid session ID, saving to localStorage then retrieving should return the same session ID, and clearing should result in null retrieval.

**Validates: Requirements 7.1.2**

### Property 3: Error Mapping Type Safety

*For any* non-string input to `mapUploadError`, the function should return the fallback string without throwing an error or returning a non-string value.

**Validates: Requirements 7.1.7**

### Property 4: Embedding Cache Consistency

*For any* document content, generating embeddings twice should use the cached result on the second call (never re-embed identical content).

**Validates: Requirements 8.6**

### Property 5: ThinkingIndicator Message Display

*For any* string message passed to ThinkingIndicator, the component should display that exact message in the UI.

**Validates: Requirements 9.3**

### Property 6: Markdown Rendering Completeness

*For any* valid markdown content containing headings, lists, links, code blocks, and emphasis, the rendered output should preserve all semantic elements and structure.

**Validates: Requirements 9.5.2.1**

### Property 7: Focus Caret Navigation

*For any* document with N paragraphs, pressing ArrowDown from paragraph i (where i < N-1) should move the caret to paragraph i+1, and pressing ArrowUp from paragraph i (where i > 0) should move to paragraph i-1.

**Validates: Requirements 9.5.3.1**

### Property 8: Source Attribution Rendering

*For any* message with sources in metadata, the MessageList should render clickable source links for each source, and clicking a link should trigger the scroll-to-chunk handler with the correct chunk ID.

**Validates: Requirements 15.3.1**

### Property 9: GitHub URL Validation

*For any* string input to GitHub upload, only strings matching the pattern `https://github.com/{owner}/{repo}` should be accepted, and all other inputs should be rejected with a descriptive error.

**Validates: Requirements 15.4.3**

### Property 10: Input Sanitization Safety

*For any* user input string containing HTML tags or JavaScript, sanitizing before rendering should remove or escape all potentially dangerous content while preserving safe formatting.

**Validates: Requirements 14.2**

### Property 11: API Response Validation

*For any* API response, validation against the expected schema should either succeed and return typed data, or fail and throw a descriptive error (never return unvalidated data).

**Validates: Requirements 14.4**

## Error Handling

### Frontend Error Handling

**Upload Errors**:
- File too large (>10MB): Show toast with size limit message
- Invalid format: Show toast with supported formats
- Network error: Show toast with retry option
- Processing failed: Show toast with error details from backend

**API Errors**:
- 400 Bad Request: Show validation error message
- 401 Unauthorized: Redirect to login (future feature)
- 403 Forbidden: Show permission error
- 404 Not Found: Show resource not found error
- 429 Too Many Requests: Show rate limit message with retry-after
- 500 Internal Server Error: Show generic error with support contact
- Network timeout: Show timeout message with retry option

**Streaming Errors**:
- Connection lost: Show reconnection message
- Partial response: Display what was received + error indicator
- Malformed chunk: Log error, continue with next chunk

**GitHub Ingestion Errors**:
- Invalid URL: Show format example
- Private repository: Show authentication required message
- Rate limit exceeded: Show retry-after time
- Repository too large: Show size limit message

### Backend Error Handling

**Voyage AI Errors**:
- Invalid API key: Log error, return 500 with "Embedding service unavailable"
- Rate limit: Implement exponential backoff, queue requests
- Timeout: Retry up to 3 times with increasing timeout
- Invalid input: Validate before sending, return 400 with details

**DeepSeek Errors**:
- Invalid API key: Log error, return 500 with "Chat service unavailable"
- Rate limit: Implement exponential backoff, queue requests
- Timeout: Return partial response if streaming, else retry
- Context too long: Truncate context to max_context_tokens, log warning
- Invalid response: Log error, return 500 with "Failed to generate response"

**Circuit Breaker**:
- Track failure rate for external services
- Open circuit after `circuit_breaker_failure_threshold` consecutive failures
- Half-open after `circuit_breaker_timeout_seconds`
- Close circuit after `circuit_breaker_success_threshold` consecutive successes
- Return cached response or fallback when circuit is open

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests**: Verify specific examples, edge cases, and error conditions
- UI component rendering (buttons, tabs, welcome screen)
- Loading skeleton appearance and styling
- Toast notification behavior (auto-dismiss, stacking)
- Upload progress stages (uploading, processing, ready, failed)
- Keyboard navigation (Home, End, PageUp, PageDown)
- Error message mapping for known error codes
- CSS property values (margins, padding, colors)

**Property Tests**: Verify universal properties across all inputs
- Session sorting with random timestamps
- localStorage round-trip with random session IDs
- Error mapping type safety with random non-string inputs
- Embedding cache consistency with random content
- ThinkingIndicator message display with random strings
- Markdown rendering with random valid markdown
- Focus caret navigation with random paragraph counts
- Source attribution with random source arrays
- GitHub URL validation with random URL strings
- Input sanitization with random HTML/JS content
- API response validation with random response shapes

### Property-Based Testing Configuration

**Library**: Use `fast-check` for TypeScript/JavaScript property-based testing

**Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Tag format: `Feature: frontend-integration-phase-2-part1, Property {N}: {property_text}`

**Example Property Test**:
```typescript
import fc from 'fast-check';

// Feature: frontend-integration-phase-2-part1, Property 1: Session Sorting Invariant
test('sessions are sorted by updated_at DESC', () => {
  fc.assert(
    fc.property(
      fc.array(fc.record({
        id: fc.uuid(),
        updated_at: fc.date().map(d => d.toISOString()),
      })),
      (sessions) => {
        const sorted = sortSessions(sessions);
        
        // Verify descending order
        for (let i = 0; i < sorted.length - 1; i++) {
          const current = new Date(sorted[i].updated_at).getTime();
          const next = new Date(sorted[i + 1].updated_at).getTime();
          expect(current).toBeGreaterThanOrEqual(next);
        }
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

**End-to-End Flows**:
1. Upload document → Verify embedding → Create session → Send message → Verify response
2. Switch sessions → Verify message history loads → Verify cost tracking updates
3. Click source link → Verify DocumentViewer scrolls → Verify chunk highlights
4. Upload GitHub repo → Verify gitingest call → Verify document processing

**API Integration**:
- Mock Voyage AI and DeepSeek APIs for deterministic testing
- Test error handling for each API error code
- Test streaming response handling (partial chunks, connection loss)
- Test cache hit/miss tracking

### Visual Regression Testing

**Snapshot Tests** (using Playwright or similar):
- Welcome screen layout
- Loading skeletons for each component
- Toast notification appearance and stacking
- Upload progress stages
- Cost tracker display
- Source attribution links

### Accessibility Testing

**Manual Checks** (deferred to Part 2 for comprehensive testing):
- Keyboard navigation works without mouse
- Focus indicators visible on all interactive elements
- Color contrast meets WCAG 2.1 AA (4.5:1 for text)
- Screen reader announces loading states and errors

### Performance Testing

**Metrics to Monitor** (deferred to Part 2 for comprehensive testing):
- Time to first render (< 1s)
- Time to interactive (< 2s)
- Markdown rendering time for large documents (< 500ms)
- Skeleton → content transition smoothness (no jank)

## Implementation Notes

### Dependencies to Install

**Frontend**:
```bash
npm install react-markdown remark-gfm react-syntax-highlighter
npm install --save-dev @types/react-syntax-highlighter
npm install dompurify zod
npm install --save-dev @types/dompurify
npm install fast-check
npm install --save-dev @types/fast-check
```

**Backend**:
```bash
pip install pydantic-settings
```

### API Endpoints to Implement

**Session Stats**:
```
GET /api/chat/sessions/{session_id}/stats
Response: {
  session_id: string,
  total_messages: number,
  total_tokens: number,
  cached_tokens: number,
  total_cost_usd: number,
  created_at: string,
  updated_at: string
}
```

**Status Check**:
```
GET /api/status
Response: {
  voyage_api: "configured" | "missing",
  deepseek_api: "configured" | "missing",
  database: "connected" | "disconnected"
}
```

### Prompt Structure for Cache Optimization

**System Prompt** (static prefix for caching):
```
You are a helpful AI assistant that answers questions about documents.
You have access to the following document context:

[DOCUMENT CONTEXT - This part is static and cacheable]

When answering questions:
- Cite specific sections from the document
- If the answer isn't in the document, say so
- Be concise and accurate
```

**User Prompt** (dynamic suffix):
```
User question: [USER_QUESTION]

Relevant chunks:
[CHUNK_1]
[CHUNK_2]
...

Answer the question based on the provided context.
```

This structure ensures the system prompt and document context are cached (90% cost reduction), while only the user question and relevant chunks change per request.

### Markdown Styling

**Use Existing Markdown Styles**:
```typescript
import { 
  codeBlock, 
  inlineCode, 
  markdownStyles 
} from '@/design-system/markdown';

// All markdown styling uses existing design system
// See frontend/src/design-system/markdown.ts for complete styles
```

### Chunk Highlight Animation

```typescript
import { accents } from '@/design-system/colors';
import { durations, easings } from '@/design-system/animations';

const highlightStyle = {
  animation: `highlight-fade ${durations.slow * 8}ms ${easings.linear}`,
};
```

```css
@keyframes highlight-fade {
  0% {
    background-color: ${accents.highlight}4D; /* 30% opacity */
  }
  100% {
    background-color: transparent;
  }
}

.chunk-highlighted {
  animation: highlight-fade 5s ease-out;
}
```

### Toast Notification System

**Implementation**:
```typescript
import { backgrounds, text, semantic } from '@/design-system/colors';
import { spacing, borderRadius, zIndex } from '@/design-system/layout';
import { durations, easings } from '@/design-system/animations';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration: number; // milliseconds
}

const ToastContext = createContext<{
  toasts: Toast[];
  showToast: (message: string, type: Toast['type'], duration?: number) => void;
  dismissToast: (id: string) => void;
}>(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const showToast = (message: string, type: Toast['type'], duration = 3000) => {
    const id = crypto.randomUUID();
    const toast = { id, message, type, duration };
    
    setToasts(prev => [...prev, toast]);
    
    // Auto-dismiss
    setTimeout(() => {
      dismissToast(id);
    }, duration);
  };
  
  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };
  
  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

// Styling uses design tokens
const toastStyle = {
  background: backgrounds.panel,
  color: text.primary,
  padding: `${spacing.md}px ${spacing.lg}px`,
  borderRadius: `${borderRadius.lg}px`,
  zIndex: zIndex.toast,
  transition: `all ${durations.base}ms ${easings.easeOutQuart}`,
};
```

## Summary

This design document specifies the implementation for Phase 2 Part 1, focusing on essential functionality:

1. **Bug Fixes**: Session sorting, localStorage persistence, error mapping type safety
2. **API Integration**: Voyage AI (voyage-4-lite) and DeepSeek (with prompt caching)
3. **Loading States**: Skeleton screens, thinking indicator, upload progress, toast notifications
4. **DocumentViewer**: Markdown rendering, syntax highlighting, paragraph-level focus caret
5. **Visual Identity**: Typography system, spacing tokens, welcome screen
6. **Security**: Input sanitization, API response validation, HTTPS enforcement

The design prioritizes:
- **Correctness**: 11 testable properties with property-based testing
- **Performance**: API caching (90% cost reduction), batch embeddings, skeleton screens
- **Usability**: Clear loading feedback, contextual messages, smooth animations
- **Maintainability**: Design tokens, type safety, error handling

Implementation will follow the task list in tasks.md, with incremental progress and checkpoints.
