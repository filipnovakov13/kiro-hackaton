# Task Breakdown: Tasks 5-6 - Frontend Components

## Parent Tasks
- Task 5: Frontend Components (UI Layer - Part 1)
- Task 6: Frontend Components (UI Layer - Part 2)

## Complexity
HIGH

## Estimated Duration
8-10 hours total

## Overview
Build React components for the chat interface and document viewer with split-pane layout, streaming messages, focus caret, and source attribution. All components must follow #[[file:.kiro/documentation/project-docs/visual-identity.md]] and use/create design system artifacts in `frontend/src/design-system/`.

---

## Task 5: Frontend Components (UI Layer - Part 1)

### Sub-Task 5.1: ChatInterface Component
**Duration**: 90 min  
**Files**: 
- `frontend/src/components/chat/ChatInterface.tsx`
- `frontend/src/design-system/layout.ts` (create spacing/grid tokens)  
**Dependencies**: None  

**Scope**:
- Split-pane layout (70/30 default per visual-identity.md)
- Resizable border with drag handling
- Document pane collapse/expand
- Persist pane width to localStorage
- Enforce minimum widths (40% doc, 20% chat)
- Use design tokens from design-system/

**Design Requirements** (from visual-identity.md):
- Document margin: 64px left/right
- Chat sidebar padding: 24px all sides
- Background colors: Canvas `#131D33`, Panel `#1B2844`
- Spacing: 8px base unit system

**Acceptance**:
- [ ] Split pane renders correctly
- [ ] Drag to resize works
- [ ] Collapse/expand toggles document pane
- [ ] Width persists across page reloads
- [ ] Minimum widths enforced
- [ ] Uses design-system tokens
- [ ] Playwright test passes

**Playwright Test**:
```typescript
test('ChatInterface split pane resizing', async ({ page }) => {
  await page.goto('/chat');
  
  // Verify default 70/30 split
  const docPane = page.locator('[data-testid="document-pane"]');
  const chatPane = page.locator('[data-testid="chat-pane"]');
  
  await expect(docPane).toHaveCSS('width', '70%');
  await expect(chatPane).toHaveCSS('width', '30%');
  
  // Test resize
  const resizer = page.locator('[data-testid="pane-resizer"]');
  await resizer.drag({ x: -100, y: 0 });
  
  // Verify width changed
  await expect(docPane).not.toHaveCSS('width', '70%');
  
  // Test persistence
  await page.reload();
  await expect(docPane).not.toHaveCSS('width', '70%');
});
```

### Sub-Task 5.2: MessageList Component
**Duration**: 45 min  
**Files**: 
- `frontend/src/components/chat/MessageList.tsx`
- `frontend/src/design-system/typography.ts` (create if needed)  
**Dependencies**: None  

**Scope**:
- Display user and assistant messages
- Auto-scroll to latest message
- Handle empty state

**Design Requirements**:
- Message background: `#1B2844` (night blue card)
- Text: `#E8E1D5` @ 90%
- Padding: 16px 20px
- Border-radius: 8px
- Margin: 16px 0
- Font: iA Writer Quattro or Merriweather, 18px, line-height 1.7

**Acceptance**:
- [ ] Messages render in order
- [ ] Auto-scrolls to bottom on new message
- [ ] Empty state shows helpful message
- [ ] Uses design-system tokens
- [ ] Playwright test passes

**Playwright Test**:
```typescript
test('MessageList displays and scrolls', async ({ page }) => {
  await page.goto('/chat');
  
  // Send multiple messages
  for (let i = 0; i < 10; i++) {
    await page.fill('[data-testid="message-input"]', `Message ${i}`);
    await page.click('[data-testid="send-button"]');
  }
  
  // Verify auto-scroll to bottom
  const messageList = page.locator('[data-testid="message-list"]');
  const lastMessage = messageList.locator('[data-testid="message"]').last();
  await expect(lastMessage).toBeInViewport();
});
```

### Sub-Task 5.3: MessageInput Component
**Duration**: 45 min  
**Files**: 
- `frontend/src/components/chat/MessageInput.tsx`
- `frontend/src/design-system/forms.ts` (create input styles)  
**Dependencies**: None  

**Scope**:
- Text input with 6000 char limit
- Send button
- Enter key to send
- Disable during streaming

**Design Requirements**:
- Background: `#1B2844`
- Border: 1px solid `#253550`
- Padding: 12px 16px
- Font: Inter, 16px
- Focus border: `#D4A574`
- Button background: `#D4A574`, text: `#131D33`

**Acceptance**:
- [ ] Input accepts text up to 6000 chars
- [ ] Send button triggers message send
- [ ] Enter key sends message
- [ ] Input disabled during streaming
- [ ] Uses design-system tokens
- [ ] Playwright test passes

**Playwright Test**:
```typescript
test('MessageInput sends message', async ({ page }) => {
  await page.goto('/chat');
  
  const input = page.locator('[data-testid="message-input"]');
  const sendButton = page.locator('[data-testid="send-button"]');
  
  // Test typing and sending
  await input.fill('Test message');
  await sendButton.click();
  
  // Verify message appears
  await expect(page.locator('text=Test message')).toBeVisible();
  
  // Test Enter key
  await input.fill('Another message');
  await input.press('Enter');
  await expect(page.locator('text=Another message')).toBeVisible();
  
  // Test char limit
  const longText = 'a'.repeat(7000);
  await input.fill(longText);
  await expect(input).toHaveValue('a'.repeat(6000));
});
```

### Sub-Task 5.4: ThinkingIndicator Component
**Duration**: 30 min  
**Files**: 
- `frontend/src/components/chat/ThinkingIndicator.tsx`
- `frontend/src/design-system/animations.ts` (create animation tokens)  
**Dependencies**: None  

**Scope**:
- Pulsing glow effect (golden #D4A574)
- Animate opacity 0.5 → 1.0 with 1.5s cycle

**Design Requirements** (from visual-identity.md):
- Background pulse: `#1B2844` → `#253550` → `#1B2844`
- Duration: 2.5s per cycle
- Easing: cubic-bezier(0.45, 0.05, 0.55, 0.95)
- Text: "Gathering thoughts..." (contextual)

**Acceptance**:
- [ ] Glow effect renders
- [ ] Animation cycles smoothly
- [ ] Color matches spec (#D4A574)
- [ ] Uses design-system animation tokens
- [ ] Playwright test passes

**Playwright Test**:
```typescript
test('ThinkingIndicator animates', async ({ page }) => {
  await page.goto('/chat');
  
  await page.fill('[data-testid="message-input"]', 'Test');
  await page.click('[data-testid="send-button"]');
  
  const indicator = page.locator('[data-testid="thinking-indicator"]');
  await expect(indicator).toBeVisible();
  await expect(indicator).toHaveCSS('animation-duration', '2.5s');
});
```

### Sub-Task 5.5: StreamingMessage Component
**Duration**: 60 min  
**Files**: 
- `frontend/src/components/chat/StreamingMessage.tsx`  
**Dependencies**: ThinkingIndicator (5.4)  

**Scope**:
- Display streaming tokens as they arrive
- Show thinking indicator during streaming
- Display source attribution after completion
- Handle partial responses on errors

**Design Requirements**:
- Same styling as MessageList messages
- Tokens appear with 50ms stagger
- Fade-in per word: 150ms

**Acceptance**:
- [ ] Tokens appear incrementally
- [ ] Thinking indicator shows during stream
- [ ] Sources display after completion
- [ ] Partial responses handled gracefully
- [ ] Uses design-system tokens
- [ ] Playwright test passes

**Playwright Test**:
```typescript
test('StreamingMessage displays tokens', async ({ page }) => {
  await page.goto('/chat');
  
  await page.fill('[data-testid="message-input"]', 'Test streaming');
  await page.click('[data-testid="send-button"]');
  
  // Verify thinking indicator appears
  await expect(page.locator('[data-testid="thinking-indicator"]')).toBeVisible();
  
  // Wait for streaming to complete
  await page.waitForSelector('[data-testid="message-complete"]');
  
  // Verify sources appear
  await expect(page.locator('[data-testid="source-attribution"]')).toBeVisible();
});
```

### Sub-Task 5.6: SourceAttribution Component
**Duration**: 60 min  
**Files**: 
- `frontend/src/components/chat/SourceAttribution.tsx`  
**Dependencies**: DocumentViewer (Task 6.1)  

**Scope**:
- Display individual source links
- Handle click to scroll document viewer
- Highlight referenced chunk
- Place focus caret at chunk start

**Design Requirements**:
- Link color: `#D4A574` (accent gold)
- Underline on hover
- Text: "Source: page X" format

**Acceptance**:
- [ ] Source links render
- [ ] Click scrolls to chunk in document
- [ ] Chunk highlights on click
- [ ] Focus caret placed correctly
- [ ] Uses design-system tokens
- [ ] Playwright test passes

**Playwright Test**:
```typescript
test('SourceAttribution links to document', async ({ page }) => {
  await page.goto('/chat');
  
  // Send message and wait for response with sources
  await page.fill('[data-testid="message-input"]', 'What is this about?');
  await page.click('[data-testid="send-button"]');
  await page.waitForSelector('[data-testid="source-link"]');
  
  // Click source link
  const sourceLink = page.locator('[data-testid="source-link"]').first();
  await sourceLink.click();
  
  // Verify document scrolled and chunk highlighted
  const highlightedChunk = page.locator('[data-testid="chunk-highlight"]');
  await expect(highlightedChunk).toBeInViewport();
  await expect(highlightedChunk).toHaveCSS('background-color', 'rgb(37, 53, 80)'); // #253550
});
```

---

## Task 6: Frontend Components (UI Layer - Part 2)

### Sub-Task 6.1: DocumentViewer Component
**Duration**: 90 min  
**Files**: 
- `frontend/src/components/document/DocumentViewer.tsx`
- `frontend/src/design-system/markdown.ts` (create markdown styles)  
**Dependencies**: None  

**Scope**:
- Render Markdown with syntax highlighting
- Support independent scrolling
- Handle chunk highlighting on source click
- Integrate focus caret

**Design Requirements** (from visual-identity.md):
- Max-width: 800px
- Margin: 0 auto, padding 64px 0
- Font: iA Writer Quattro or Merriweather, 18px
- H1: 42px Semibold, H2: 32px Medium, H3: 24px Medium
- Body: `#E8E1D5` @ 90%, line-height 1.7
- Code blocks: background `#253550`, border-left 4px solid `#D4A574`

**Acceptance**:
- [ ] Markdown renders correctly
- [ ] Syntax highlighting works
- [ ] Scrolls independently from chat
- [ ] Chunk highlighting works
- [ ] Focus caret integrates
- [ ] Uses design-system markdown styles
- [ ] Playwright test passes

**Playwright Test**:
```typescript
test('DocumentViewer renders markdown', async ({ page }) => {
  await page.goto('/document/test-doc');
  
  const viewer = page.locator('[data-testid="document-viewer"]');
  
  // Verify headings render
  await expect(viewer.locator('h1')).toHaveCSS('font-size', '42px');
  await expect(viewer.locator('h2')).toHaveCSS('font-size', '32px');
  
  // Verify code blocks styled
  const codeBlock = viewer.locator('pre');
  await expect(codeBlock).toHaveCSS('background-color', 'rgb(37, 53, 80)');
  await expect(codeBlock).toHaveCSS('border-left', '4px solid rgb(212, 165, 116)');
  
  // Verify independent scrolling
  await viewer.evaluate(el => el.scrollTop = 500);
  const chatPane = page.locator('[data-testid="chat-pane"]');
  await expect(chatPane).toHaveJSProperty('scrollTop', 0);
});
```

### Sub-Task 6.2: FocusCaret Component
**Duration**: 90 min  
**Files**: 
- `frontend/src/components/document/FocusCaret.tsx`
- `frontend/src/design-system/animations.ts` (add focus animations)  
**Dependencies**: None  

**Scope**:
- Letter-level glow (anchor at 40% of word per visual-identity.md)
- Click-to-place functionality
- Keyboard navigation (arrow keys)
- Extract surrounding context (±150 chars)
- Fade in/out animations (200ms/150ms)

**Design Requirements** (from visual-identity.md Section V):
- Glow color: `rgba(212, 165, 116, 0.5)`
- Blur radius: 2px
- Spread: 1px
- Entry animation: 200ms cubic-bezier(0.4, 0, 0.2, 1)
- Exit animation: 150ms
- Target: Single letter (not whole word)

**Acceptance**:
- [ ] Glow renders at letter position
- [ ] Click places caret
- [ ] Arrow keys move caret
- [ ] Context extraction works (±150 chars)
- [ ] Fade animations smooth
- [ ] Uses design-system animation tokens
- [ ] Playwright test passes

**Playwright Test**:
```typescript
test('FocusCaret letter-level interaction', async ({ page }) => {
  await page.goto('/document/test-doc');
  
  // Click on a word
  const word = page.locator('text=learning').first();
  await word.click();
  
  // Verify focus caret appears on anchor letter
  const focusCaret = page.locator('[data-testid="focus-caret"]');
  await expect(focusCaret).toBeVisible();
  await expect(focusCaret).toHaveCSS('box-shadow', /rgba\(212, 165, 116, 0\.5\)/);
  
  // Test keyboard navigation
  await page.keyboard.press('ArrowRight');
  // Verify caret moved
  
  // Test context extraction
  const context = await page.locator('[data-testid="focus-context"]').textContent();
  expect(context.length).toBeGreaterThanOrEqual(300); // ±150 chars
});
```

### Sub-Task 6.3: ChunkHighlight Component
**Duration**: 30 min  
**Files**: 
- `frontend/src/components/document/ChunkHighlight.tsx`  
**Dependencies**: None  

**Scope**:
- Highlight chunk with background color (#253550)
- Scroll to chunk on source link click

**Design Requirements**:
- Background: `#253550` (pre-dawn blue)
- Transition: 200ms ease-out

**Acceptance**:
- [ ] Chunk highlights with correct color
- [ ] Scrolls to chunk on click
- [ ] Uses design-system tokens
- [ ] Playwright test passes

**Playwright Test**:
```typescript
test('ChunkHighlight on source click', async ({ page }) => {
  await page.goto('/chat');
  
  // Send message and get response with sources
  await page.fill('[data-testid="message-input"]', 'Test');
  await page.click('[data-testid="send-button"]');
  await page.waitForSelector('[data-testid="source-link"]');
  
  // Click source
  await page.locator('[data-testid="source-link"]').first().click();
  
  // Verify chunk highlighted
  const highlight = page.locator('[data-testid="chunk-highlight"]');
  await expect(highlight).toBeVisible();
  await expect(highlight).toHaveCSS('background-color', 'rgb(37, 53, 80)');
});
```

---

## Implementation Order

1. **Phase 1: Design System Setup** (1 hour)
   - Create `design-system/layout.ts` (spacing, grid)
   - Create `design-system/typography.ts` (font scales)
   - Create `design-system/forms.ts` (input styles)
   - Create `design-system/animations.ts` (motion tokens)
   - Create `design-system/markdown.ts` (markdown styles)

2. **Phase 2: Basic Chat UI** (3 hours)
   - 5.1: ChatInterface (split pane)
   - 5.2: MessageList
   - 5.3: MessageInput
   - 5.4: ThinkingIndicator

3. **Phase 3: Streaming & Sources** (2 hours)
   - 5.5: StreamingMessage
   - 5.6: SourceAttribution (partial - without document integration)

4. **Phase 4: Document Viewer** (3 hours)
   - 6.1: DocumentViewer
   - 6.2: FocusCaret
   - 6.3: ChunkHighlight

5. **Phase 5: Integration & Testing** (1 hour)
   - 5.6: Complete SourceAttribution (with document integration)
   - Run all Playwright tests
   - Fix any issues

---

## Testing Strategy

### Playwright Tests (E2E)
- All components tested via Playwright
- Visual regression tests for animations
- Interaction tests (click, keyboard, drag)
- Accessibility tests (ARIA, keyboard navigation)

### Component Tests (Unit)
- React Testing Library for isolated component logic
- Mock props and callbacks
- Test edge cases (empty states, errors)

---

## Rollback Plan

If issues arise:
1. Revert to previous commit
2. Components are independent - can disable individually
3. Feature flags for new UI elements

---

## Notes

- All components MUST reference #[[file:.kiro/documentation/project-docs/visual-identity.md]]
- Create reusable design tokens in `frontend/src/design-system/`
- Use Tailwind CSS with design system tokens
- Ensure accessibility (ARIA labels, keyboard navigation)
- Follow visual-identity.md specifications exactly
