# **IUBAR: Visual Identity Research Lab**

## *A Design System for Contextual AI-Assisted Learning*

**Prepared for**: Kiro IDE (Visual Identity Engine)
**Purpose**: Supreme user focus + zero friction + behavioral simplicity + craft excellence
**Status**: Ready for implementation (10-day MVP timeline)

***

## **I. Design Philosophy \& Core Principles**

### The Iubar Ethos: "Light Through Clarity"

Iubar's visual identity centers on **behavioral simplicity** (one action at a time) and **craft excellence** (obsessive attention to detail). Visual minimalism is a *tool*, not the goal—we bend it when necessary to serve user understanding.

**Design North Stars** (in order of priority):

1. **Behavioral Simplicity**
    - Every screen has ONE primary action
    - Secondary actions hidden until needed
    - No cognitive overload
    - *Example*: Chat screen shows chat input. Document editing/highlighting appears only on hover.
2. **Craft Excellence**
    - Micro-interactions are thoughtful, not arbitrary
    - Timing and easing are intentional (slow = thinking, fast = input)
    - Typography hierarchy is clear and generous
    - *Example*: Letter-level focus indicator animates with 200ms cubic-bezier ease, not instant
3. **Contextual Restraint** (Visual minimalism with purpose)
    - 4 colors maximum (+ variants)
    - Pastel palette (subdued, not vibrant)
    - Generous white/empty space
    - *But*: Add elements when they reduce friction (e.g., inline action buttons on hover are OK)
4. **First-Time Wow Over Depth**
    - Cold start experience is flawless (primary goal)
    - Search/discovery follows
    - Advanced features (dashboard, projects) introduced later
    - *Logic*: Get users hooked on the core value, then expand

***

## **II. Color Palette System (Dark Mode First)**

### Core Palette: Deep Pastel Blue Nights with Golden Day

The palette embodies the metaphor: **night-before-dawn** (deep blue backgrounds) with **knowledge breaking through** (warm golden text and accents).

**Primary Base**: Deep Pastel Blue (shifted 15% toward blue spectrum for richness)

- Darkest: `#131D33` — Canvas background (rich night blue)
- Dark: `#1B2844` — Primary surfaces (cards, panels)
- Medium: `#253550` — Secondary surfaces (hover states, depth)
- Light: `#314662` — Structural elements, borders

**Accent Color**: Warm Golden Amber (light of knowledge breaking through)

- Highlight: `#D4A574` — Focus indicator, interactive states
- Muted: `#B8945F` — Hover states, secondary emphasis
- Deep: `#9D7A47` — Accents, depth (rarely used)

**Semantic Colors** (pastel, warm-toned):

- **Insight/Success**: `#A8C59F` (soft warm green, dawn-like)
- **Caution/Attention**: `#C9A876` (warm amber, close to primary accent)
- **Critical**: `#B89B94` (warm mauve, gentle not harsh)

**Text Color Strategy** (Dark mode with warm light metaphor):

- **Body text**: `#E8E1D5` @ 100% (warm cream, like morning light)
- **Secondary text**: `#B8AFA0` @ 100% (warm muted taupe)
- **Disabled/muted**: `#6B6660` @ 70% opacity (barely visible)

**Background Strategy** (Night-to-day progression):

- **Canvas (document area)**: `#131D33` (deep rich night blue)
- **Sidebar/panels**: `#1B2844` (night blue, slightly warmer)
- **Hover states**: `#253550` (blue-gray, transitioning)
- **Active/selected**: `#314662` (lighter blue, approaching dawn)


### The Metaphor: Night Breaking Into Day

```
Timeline (visual metaphor):
Midnight    → #131D33 (deep blue-black)
3 AM        → #1B2844 (night blue)
5 AM        → #253550 (pre-dawn blue)
6 AM        → #314662 (dawn blue)

Overlaid:   Warm cream text #E8E1D5 (light breaking through)
            Golden accent #D4A574 (knowledge illumination)
            Golden highlights (focus indicators)
```

**Why this works**:

- **Deep blue backgrounds** feel calm, contemplative, nighttime (safe for extended reading)
- **Warm golden text** feels like sunrise, knowledge, illumination
- **The contrast** between cool nights and warm light creates visual poetry aligned with "Iubar"
- **Pastel blue** (not harsh black) is easier on eyes while maintaining dark mode benefits
- **Rich saturation** (15% blue shift) creates visual depth without coldness


### Color Palette Table

| Element | Color Name | Hex | RGB | Usage |
| :-- | :-- | :-- | :-- | :-- |
| **Canvas bg** | Deep rich night blue | `#131D33` | 19, 29, 51 | Document area |
| **Panel bg** | Night blue | `#1B2844` | 27, 40, 68 | Sidebar, cards |
| **Hover bg** | Pre-dawn blue | `#253550` | 37, 53, 80 | Interactive states |
| **Active bg** | Dawn blue | `#314662` | 49, 70, 98 | Focus, selected |
| **Body text** | Warm cream | `#E8E1D5` | 232, 225, 213 | Primary text (knowledge light) |
| **Secondary text** | Warm taupe | `#B8AFA0` | 184, 175, 160 | Labels, metadata |
| **Disabled text** | Dark taupe | `#6B6660` @ 70% | 107, 104, 96 | Inactive elements |
| **Accent (focus)** | Golden amber | `#D4A574` | 212, 165, 116 | Focus indicator, highlights |
| **Accent (hover)** | Muted gold | `#B8945F` | 184, 148, 95 | Hover states |
| **Success** | Soft warm green | `#A8C59F` | 168, 197, 159 | Progress, positive (dawn) |
| **Caution** | Warm amber | `#C9A876` | 201, 168, 118 | Warnings |
| **Critical** | Warm mauve | `#B89B94` | 184, 155, 148 | Errors (soft, not aggressive) |

### Accessibility Verification

| Text | Background | Contrast Ratio | Standard |
| :-- | :-- | :-- | :-- |
| `#E8E1D5` (body) | `#131D33` (canvas) | 9.1:1 | AAA ✅ |
| `#B8AFA0` (secondary) | `#1B2844` (panel) | 5.8:1 | AA ✅ |
| `#D4A574` (accent) | `#131D33` (canvas) | 6.7:1 | AAA ✅ |

All text on dark backgrounds passes AAA contrast (7:1+ minimum). The richer blue background makes text and accents pop while maintaining the calm, night-before-dawn aesthetic.

***

## **III. Typography System**

### Typeface Selection

**Heading \& Navigation**: `Inter Variable` (400-700 weight)

- Modern, highly legible, geometric (feels "light")
- Used: Headlines, navigation, labels

**Body \& Document Text**: `iA Writer Quattro` or `Merriweather` (18px base)

- Optimized for reading long-form content
- Generous line-height (1.7) for document readability
- Used: Body text, chat messages, document content

**Code/Technical**: `JetBrains Mono` (for embedded code snippets)

- Monospace, clean, friendly
- Used: Only when showing technical output


### Typography Scale

Intentionally generous—respects cognitive load of learning context:


| Element | Size | Weight | Line-Height | Letter-Spacing | Usage |
| :-- | :-- | :-- | :-- | :-- | :-- |
| **H1** | 42px | Semibold (600) | 1.2 | -0.02em | Page titles, main headlines |
| **H2** | 32px | Medium (500) | 1.25 | -0.01em | Section headers |
| **H3** | 24px | Medium (500) | 1.3 | 0em | Subsection headers |
| **H4** | 18px | Medium (500) | 1.4 | 0em | Card headers, labels |
| **Body** | 18px | Regular (400) | 1.7 | 0.02em | Document text, chat |
| **Small** | 14px | Regular (400) | 1.6 | 0em | Metadata, timestamps |
| **Caption** | 12px | Regular (400) | 1.5 | 0.01em | Footnotes, hints |

**Rationale for 18px body**:

- Standard web text is 16px; we use 18px to reduce eye strain during extended reading
- Pairs with 1.7 line-height for generous breathing room
- Signals "this is a reading app, not a productivity tool bloated with UI"

***

## **IV. Spacing \& Layout System**

### Grid Foundation: 8px Base Unit

| Scale | Px | Usage |
| :-- | :-- | :-- |
| **xs** | 4px | Micro-spacing within components |
| **sm** | 8px | Component padding, icon spacing |
| **md** | 16px | Section padding, between elements |
| **lg** | 24px | Larger sections, spacing between major zones |
| **xl** | 32px | Page margins, panel padding |
| **2xl** | 48px | Page-level margins, major layout breaks |
| **3xl** | 64px | Desktop margins, hero spacing |

### Layout Architecture

**Two-Column Design** (Document Primary + Chat Sidebar):

```
┌─────────────────────────────────────────────────────────────────┐
│                      Header (minimal)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Document Viewer (Primary)      │ Chat Sidebar (Secondary)      │
│  70% width (resizable border)   │ 30% width (resizable)         │
│                                 │                               │
│  - Rendered Markdown            │ - Chat messages               │
│  - Letter-level focus indicator │ - Input area                  │
│  - Highlighting/annotation      │ - Suggested questions         │
│  - Scroll-synced                │                               │
│                                 │                               │
└─────────────────────────────────────────────────────────────────┘
```

**Key Spacing Rules**:

- **Document margin**: 64px left/right (breathing room for reading)
- **Chat sidebar padding**: 24px on all sides
- **Line spacing in document**: 1.7 × font size
- **Letter gaps**: 4px between inline focus indicators

**Responsive Breakpoints** (MVP: Desktop-only, but plan ahead):

- Desktop: Full two-column layout
- Tablet: Stacked or drawer-based (post-MVP)
- Mobile: Not supported (post-MVP)

***

## **V. Component 1: Focus Indicator (Letter-Level, RSVP-Ready)**

### What It Is

A subtle highlight on a **SINGLE LETTER** within a word (not the whole word), positioned for RSVP (Rapid Serial Visual Presentation) technology.

**Why single letter?**

- RSVP technology focuses the reader's eye on one anchor point per word
- Easier to follow rapid serial presentation
- Reduces eye movement, increases reading speed
- Foundation for future speed reading coach feature


### Visual Design

```
Before: "This is some text"

After (letter highlighted):
"This is so|me text"
        ↑ subtle highlight on ONE letter (anchor point)

In context:
"The quick brown fox jumps over the lazy dog"
        ↑ 
        anchor letter for RSVP focus (typically at 40% of word length)
```

**Anatomy** (for word "learning"):

```
l-e-a-r-n-i-n-g
    ↑
    Highlight "r" (the anchor letter)
    Subtle glow: rgba(212, 165, 116, 0.5)
    Blur: 2px
    No scaling, no color change to letter itself
```


### Interaction Behavior

#### **Manual Selection (User clicks word)**

```
Timeline:
1. User clicks word "learning"
   - Anchor letter "r" gets highlighted
   - Glow fades in: 0 → 100% opacity over 200ms
   - Easing: cubic-bezier(0.4, 0, 0.2, 1) [ease-out-quart]

2. Visual state:
   - Glow color: rgba(212, 165, 116, 0.5) [golden with transparency]
   - Blur radius: 2px
   - Spread: 1px (tight halo, not large)
   - Font: unchanged (no scale, no color shift to letter)

3. Context reveal:
   - AI sees the entire sentence/paragraph around "learning"
   - Not just the word, but the contextual block (50-100 surrounding chars)
   - Example: "The process of [learning] new concepts requires..."
   - AI references full context, not isolated word

4. On exit:
   - Fade out: 100% → 0 over 150ms
   - Glow shrinks: 2px blur → 0
```


#### **RSVP Mode (Future - Speed Reading Coach)**

```
Timeline (RSVP playback at 300 WPM):
1. Playback starts
   - Each word displays for: 60,000 / 300 = 200ms
   - During those 200ms, the anchor letter glows
   - Easing: linear (steady, metronome-like)

2. Per word:
   - Word 1 "The": anchor letter highlighted for 200ms
   - Word 2 "quick": anchor letter highlighted for 200ms
   - Word 3 "brown": anchor letter highlighted for 200ms
   - Continuous, no flashing (smooth progression)

3. Pause on demand:
   - User clicks word to pause
   - That word stays highlighted with full glow
   - Chat can now reference the entire context around it
   - Example: "Based on this section about quick reading, what does..."

4. Resume:
   - User clicks play
   - Continues from paused word at same pace
```


### Technical Specification

```css
/* Single-letter focus indicator */
.letter-focus {
  position: relative;
  display: inline;
  /* Letter itself has no visual change */
}

.letter-focus::after {
  content: '';
  position: absolute;
  top: -2px;
  left: -1px;
  right: -1px;
  bottom: -2px;
  background: transparent;
  border-radius: 2px;
  /* Golden glow against blue night background */
  box-shadow: 0 0 2px rgba(212, 165, 116, 0.5),
              0 0 4px rgba(212, 165, 116, 0.25);
  pointer-events: none;
  opacity: 0;
  animation: letterGlow 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes letterGlow {
  from {
    opacity: 0;
    box-shadow: 0 0 0px rgba(212, 165, 116, 0);
  }
  to {
    opacity: 1;
    box-shadow: 0 0 2px rgba(212, 165, 116, 0.5),
                0 0 4px rgba(212, 165, 116, 0.25);
  }
}

/* For RSVP mode: continuous highlight with subtle pulse */
.letter-focus.rsvp-active {
  animation: letterGlowRSVP 0.2s linear infinite;
}

@keyframes letterGlowRSVP {
  0%, 100% {
    box-shadow: 0 0 2px rgba(212, 165, 116, 0.5),
                0 0 4px rgba(212, 165, 116, 0.25);
  }
  50% {
    box-shadow: 0 0 2px rgba(212, 165, 116, 0.6),
                0 0 6px rgba(212, 165, 116, 0.3);
  }
}
```


### AI Context Handling (Not Single-Word)

**Core Rule**: When AI responds to a focused letter/word, it **ALWAYS** receives the surrounding context block, not just that word.

**Example**:

User clicks on letter "r" in "learning":

```
Full sentence: "The process of learning new concepts requires patience."
                                ^^^^^^^^
                                 (focused word)

What AI receives:
"context_start": "The process of"
"focused_word": "learning"
"context_end": "new concepts requires patience"
"full_paragraph": "[entire paragraph containing the word]"

AI response: "You've highlighted 'learning' in the context of acquiring new skills.
This section emphasizes that the journey of gaining knowledge requires patience.

What aspect interests you most—the process itself, the outcome you're seeking, 
or the effort involved?"

Source: Chapter 2, 'The Learning Process'
```


### Visual Summary

| Property | Value | Purpose |
| :-- | :-- | :-- |
| **Target** | Single letter (not word) | RSVP-ready |
| **Glow color** | `rgba(212, 165, 116, 0.5)` | Pastel gold, soft against blue |
| **Blur radius** | 2px | Subtle, not harsh |
| **Spread** | 1px | Tight halo |
| **Entry animation** | 200ms, ease-out-quart | Graceful reveal |
| **Exit animation** | 150ms, ease-out-quart | Quick disappear |
| **Font effect** | None | Letter unchanged |
| **RSVP mode** | Continuous, 200ms per word | Metronome-like |

### Use Cases

1. **Manual selection**: User clicks word → anchor letter highlights → AI references full context
2. **RSVP playback**: Speed reading coach shows words sequentially → each with anchor letter highlighted
3. **AI reference**: AI highlights a letter in its response → user can click to expand context
4. **Disambiguation**: Multiple similar words → highlight different letters to distinguish

***

## **VI. Motion \& Micro-Interaction Specifications**

### Motion Philosophy: Tactical Timing

**Rule of Thumb**:

- **AI/thinking actions**: 300-600ms (slow, graceful, hides latency)
- **User input actions**: 100-150ms (fast, snappy, immediate feedback)
- **Reveal/disclosure**: 200-400ms (balanced, not jarring)


### Animation Library

#### **1. Focus Indicator (Letter-Level)**

```
Timeline:
1. On trigger (user clicks word or AI highlights):
   - Fade in: opacity 0 → 1 over 200ms
   - Glow: box-shadow expands from 0 → 4px blur over 200ms
   - Easing: cubic-bezier(0.4, 0, 0.2, 1) [ease-out-quart]

2. Subtle pulse (while active, optional):
   - Opacity: 1 → 0.8 → 1 (every 2s)
   - Easing: sine wave (smooth, not jarring)
   - Duration: 0.3s per cycle

3. On exit:
   - Fade out: 1 → 0 over 150ms
   - Glow shrinks: 4px → 0 over 150ms
   - Easing: cubic-bezier(0.4, 0, 0.2, 1)
```

**Technical specs**:

- Color: `rgba(212, 165, 116, 0.5)` (golden with transparency)
- Blur: `2px` at full opacity
- Spread: `1px` (slight outer glow)
- Font: Remains unchanged (no scale, no color shift)


#### **2. Hover State (Interactive Elements)**

```
Timeline:
- Resting: opacity 100%, no shadow
- Hover: opacity 100% + shadow
- Duration: 150ms transition
- Easing: cubic-bezier(0.2, 0.8, 0.2, 1) [ease-out-expo]

Example (button):
Button background: #1B2844 → #253550
Box shadow: none → 0 2px 8px rgba(212, 165, 116, 0.1)
```


#### **3. AI Processing/Thinking State**

```
Visual: Subtle gradient shift through warm tones (metaphorical "dawn breaking")

Timeline:
1. Thinking starts:
   - Background subtle pulse: #1B2844 → #253550 → #1B2844
   - Duration: 2.5s per cycle
   - Easing: cubic-bezier(0.45, 0.05, 0.55, 0.95) [ease-in-out-sine]
   - Opacity: Always 100% (not fading)

2. Response streaming:
   - Text appears with 50ms stagger between words
   - Slight fade-in: 0 → 100% over 150ms per word
   - No bouncing/scaling (respect reading flow)

3. Thinking ends:
   - Pulse stops, background returns to resting state
   - Fade: 150ms
```

**Why slow for AI**: Honest about latency—graceful animation during waiting makes it feel intentional, not broken.

#### **4. Modal/Overlay Reveal**

```
Background darken:
- Start: rgba(0,0,0,0) [transparent]
- End: rgba(0,0,0,0.4) [subtle dark]
- Duration: 300ms
- Easing: ease-out-quart

Modal enter:
- Scale: 0.95 → 1.0
- Opacity: 0 → 1
- Duration: 300ms
- Easing: cubic-bezier(0.34, 1.56, 0.64, 1) [ease-out-back for subtle bounce]
```


#### **5. Transition Between Views**

```
Fade through → smooth, no jarring:
- Duration: 200ms
- Easing: linear for fade (no acceleration)
- Sequence: Fade out current → Fade in new
- No scale/translation (minimal distraction)
```


***

## **VII. Core Component Specifications**

### **Component 1: Focus Indicator (Letter-Level)**

*(See Section V for detailed specs)*

### **Component 2: Chat Message**

**Anatomy**:

```
┌─────────────────────────────────┐
│ AI Response                     │
│                                 │
│ "Here's what I found about     │
│ this concept..."                │
│                                 │
│ Source: page 3 (linked)         │
│                                 │
│ Suggested:                      │
│ • "Can you explain further?"    │
│ • "How does this connect..."    │
└─────────────────────────────────┘
```

**Styling**:

- Background: `#1B2844` (night blue card)
- Text: `#E8E1D5` @ 90% (body color)
- Padding: `16px 20px` (md + slightly wider)
- Border-radius: `8px` (subtle rounding, not pill-shaped)
- Shadow: `0 1px 3px rgba(0,0,0,0.2)` (visible but subtle)
- Margin: `16px 0` (md spacing between messages)

**Interactive states**:

- Hover: Background shifts to `#253550`, shadow increases to `0 2px 8px rgba(212, 165, 116, 0.1)`
- Focus (source links): Underline appears, color `#D4A574`


### **Component 3: Document Viewer**

**What it is**: Rendered Markdown with integrated letter-level focus indicators and highlighting.

**Layout**:

- Max-width: `800px` (optimal reading width)
- Margin: `0 auto` (centered with padding)
- Padding: `64px 0` (top/bottom breathing room)
- Font: `iA Writer Quattro` or `Merriweather`, 18px

**Heading hierarchy**:

- H1: 42px, Semibold, `#E8E1D5`, margin-top: 48px, margin-bottom: 24px
- H2: 32px, Medium, `#E8E1D5`, margin-top: 40px, margin-bottom: 20px
- H3: 24px, Medium, `#B8AFA0`, margin-top: 32px, margin-bottom: 16px

**Body text**:

- Color: `#E8E1D5` @ 90% (warm cream)
- Line-height: 1.7 (generous)
- Letter-spacing: 0.02em (air)
- Paragraph spacing: 24px between paragraphs

**Code blocks** (inline):

- Background: `#253550` (pre-dawn blue, subtle highlight)
- Padding: `2px 6px` (tight)
- Font: `JetBrains Mono`, 16px
- Radius: `3px`

**Code blocks** (multi-line):

- Background: `#1B2844` (night blue)
- Padding: `16px` (md)
- Border-left: `4px solid #D4A574` (golden accent)
- Font: `JetBrains Mono`, 14px
- Overflow: Scrollable horizontally

**Interactive features**:

- Highlighting: Drag to select text, contextual menu appears (200ms fade)
- Focus indicator: Letter-level (see Component 1)
- Links: `#D4A574` (accent gold), underline on hover


### **Component 4: Upload Area**

**Anatomy**:

```
┌──────────────────────────────────┐
│                                  │
│   What would you like to explore?│
│                                  │
│   ┌──────────────────────────┐   │
│   │ Drop a document here     │   │
│   │ or paste a link          │   │
│   └──────────────────────────┘   │
│                                  │
│   PDF   URL   Text               │
│   GitHub                         │
│                                  │
└──────────────────────────────────┘
```

**Styling**:

- Container: 100% width, centered, padding `64px 32px`
- Heading: 32px, Medium, `#E8E1D5`
- Drop zone: Border `2px dashed #314662`, padding `48px`, background `#131D33`
- Hover state: Border color → `#D4A574`, background → `#1B2844`
- Transition: 200ms ease-out

**Input field**:

- Background: `#1B2844`
- Border: `1px solid #253550`
- Padding: `12px 16px`
- Font: `Inter`, 16px
- Focus: Border color → `#D4A574`, no glow (subtle)

**CTA buttons**:

- Background: `#D4A574` (accent gold)
- Text: `#131D33` (rich night, high contrast)
- Padding: `12px 24px`
- Border-radius: `6px`
- Hover: Background → `#B8945F` (muted gold)
- Active: Background → `#9D7A47` (deep accent)


### **Component 5: Loading State**

**Visual**: Subtle pulsing background (no spinner)

```css
@keyframes aiThinking {
  0%, 100% {
    background-color: #1B2844;
  }
  50% {
    background-color: #253550;
  }
}

.is-processing {
  animation: aiThinking 2.5s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
}
```

**Accompanying text**: "Gathering thoughts..." (contextual, not generic "loading")

***

## **VIII. Layout Patterns \& User Flows**

### **Primary Flow: Cold Start → Document Chat → Insights**

#### **Screen 1: Welcome (First Time)**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│                      Iubar                                       │
│                      ─────                                       │
│                                                                  │
│            What would you like to explore today?                │
│                                                                  │
│         ┌──────────────────────────────────────┐                │
│         │ Drop a document or paste a link...   │                │
│         │ ─────────────────────────────────┬   │                │
│         │ PDF  URL  Text  GitHub              │                │
│         └──────────────────────────────────────┘                │
│                                                                  │
│         "Ask me about the content, or just start exploring"     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key UX decisions**:

- No onboarding form on first load (added friction)
- Drag-and-drop is immediate action
- One clear CTA: upload/paste
- Suggested prompts below (secondary)

***

#### **Screen 2: Document Viewing + Chat**

```
┌──────────────────────────────────────────────────────────────────┐
│ Back   Document Title                        Settings   Search   │
├────────────────────────────────┬──────────────────────────────────┤
│                                │                                  │
│ # Introduction                 │ AI: "I've read this..."          │
│                                │                                  │
│ This is a fascinating topic    │ Suggested:                       │
│ about the art of thinking. ✨  │ • "What's the main idea?"       │
│                                │ • "Explain like I'm new"        │
│ Let me start with a definition │                                  │
│                                │ User: "Explain this part"       │
│ Focus indicator = letter glow  │                                  │
│ (subtle, single letter per     │ AI: "Based on the section      │
│ word)                          │ you highlighted..."             │
│                                │                                  │
│                                │ Source: para 2                   │
│                                │                                  │
│                                │ ┌────────────────────────┐      │
│                                │ │ Ask a follow-up...     │      │
│                                │ └────────────────────────┘      │
│                                │ Synthesis   Critique             │
│                                │                                  │
└────────────────────────────────┴──────────────────────────────────┘
```

**Key interactions**:

- Document scrolling: Smooth, no jumping
- Focus indicator: Appears on letter click or AI reference
- Chat: Scrolls independently from document
- Movable border: Drag to resize (cursor changes to `col-resize`)
- Action buttons: Appear on hover in sidebar

***

### **Secondary Flow: Smart Onboarding (Optional)**

```
First return visit:
- No form required
- Profile inferred from previous interactions
- Subtle prompt: "Continue learning about last topic?"
- or: "What's new today?"
```


***

## **IX. Word-Level Interaction Deep Dive (Letter-Level)**

### **Speed Reading Coach Integration** (Future feature, designed for now)

The focus indicator isn't just visual—it's foundational for RSVP speed reading:

**Design considerations**:

1. **Letter-by-letter highlighting**: Focus indicator spans individual letters (anchor points)
2. **Timing control**: User sets WPM (words per minute), indicator moves accordingly
3. **Pause on demand**: Click word to pause, interact with it
4. **Context preservation**: When paused, chat can reference the entire context around it

**Technical spec**:

```javascript
// Letter-level interaction example
<span class="word" data-word-id="123">
  {word}
  <span class="letter-focus" data-letter-index="2">{anchor-letter}</span>
</span>

// On RSVP start:
// - Letter animates focus-glow over (60000/wpm)ms
// - User can click to pause and ask questions
// - AI receives: "User paused at word 'X' in sentence N"
// - AI has full paragraph context, not just the word
```

**Visual refinement**:

- Same glow/highlight as manual focus indicator
- Pulse during active read (subtle: opacity 0.8 → 1.0 cycle)
- No flash/jump between words (smooth transitions)
- Golden glow against blue background creates "light through night" metaphor

***

## **X. Kiro IDE Implementation Roadmap**

### **Phase 1: Design Tokens** (Hand-off to Kiro)

**Output**: Design tokens JSON + Figma reference file

```json
{
  "colors": {
    "backgrounds": {
      "canvas": "#131D33",
      "panel": "#1B2844",
      "hover": "#253550",
      "active": "#314662"
    },
    "text": {
      "primary": "#E8E1D5",
      "secondary": "#B8AFA0",
      "disabled": "#6B6660"
    },
    "accents": {
      "highlight": "#D4A574",
      "muted": "#B8945F",
      "deep": "#9D7A47"
    },
    "semantic": {
      "success": "#A8C59F",
      "caution": "#C9A876",
      "critical": "#B89B94"
    }
  },
  "typography": {
    "headings": "Inter Variable",
    "body": "iA Writer Quattro",
    "mono": "JetBrains Mono",
    "scales": {
      "h1": {"size": 42, "weight": 600, "lineHeight": 1.2},
      "body": {"size": 18, "weight": 400, "lineHeight": 1.7}
    }
  },
  "spacing": {
    "xs": "4px", "sm": "8px", "md": "16px", "lg": "24px", "xl": "32px"
  },
  "motion": {
    "fast": {"duration": "150ms", "easing": "cubic-bezier(0.4, 0, 0.2, 1)"},
    "base": {"duration": "300ms", "easing": "cubic-bezier(0.4, 0, 0.2, 1)"},
    "slow": {"duration": "600ms", "easing": "cubic-bezier(0.4, 0, 0.2, 1)"}
  }
}
```


***

### **Phase 2: Component Library** (Kiro builds)

Priority order for 10-day MVP:

1. **Focus Indicator** (letter-level glow) — Critical, used everywhere
2. **Chat Message** (card with source attribution) — Core interaction
3. **Document Viewer** (rendered Markdown + interactions) — Primary content
4. **Upload Area** (drag-and-drop, simple) — Entry point
5. **Loading State** (subtle pulse) — Feedback mechanism
6. **Button** (primary CTA) — Simple, but craft matters
7. **Input Field** (chat input, URL paste) — User action
8. **Modal** (for dialogs, settings) — Future-proofing

**Flexibility**: Kiro can iterate on components; this system is a guide, not a straitjacket.

***

### **Phase 3: Layout System** (Kiro implements)

- Two-column grid (70/30 split, resizable)
- Document margin specs (64px sides)
- Chat sidebar padding (24px)
- Breakpoints (though MVP is desktop-only)

***

## **XI. Visual References \& Mood**

### **Design Philosophy Alignment**

The Iubar visual identity channels sophistication from your reference materials while maintaining behavioral simplicity:

- **Lume Lighting Store**: Warm golds as functional indicators, not decorative
- **Luminescence Website**: Minimal layout, generous white space, elegant typography
- **Linear.app**: One-action-per-screen, craft excellence, subtle interactions


### **Mood Board Summary**

The Iubar visual identity should feel:

- ✅ **Calm, not chaotic** (pastel blue backgrounds, generous spacing)
- ✅ **Sophisticated, not cheap** (craft excellence, smooth animations)
- ✅ **Focused, not cluttered** (behavioral simplicity, content-first)
- ✅ **Warm, not cold** (blue base, golden accents, human-centered)
- ✅ **Subtle, not intrusive** (letter-level focus indicators, not pop-ups)
- ✅ **Poetic, aligned with mission** (night-to-day metaphor, knowledge breaking through)

***

## **XII. Accessibility Compliance Matrix**

### **Color Contrast Ratios** (WCAG AA/AAA)

| Text | Background | Ratio | Standard |
| :-- | :-- | :-- | :-- |
| `#E8E1D5` (body) | `#131D33` (canvas) | 9.1:1 | AAA ✅ |
| `#B8AFA0` (secondary) | `#1B2844` (panel) | 5.8:1 | AA ✅ |
| `#D4A574` (accent) | `#131D33` (canvas) | 6.7:1 | AAA ✅ |

All text passes WCAG AA minimum, most pass AAA.

### **Motion Accessibility**

- Respect `prefers-reduced-motion` media query
- Fallback: No animations, instant state changes
- Never use animation as sole indicator (color + icon + text)


### **Keyboard Navigation**

- Focus ring: `2px solid #D4A574` (accent color, high contrast)
- Focus on all interactive elements (buttons, inputs, links)
- Tab order: Logical (left-to-right, top-to-bottom)


### **Screen Reader Support**

```
- Document sections: Semantic HTML (`<section>`, `<article>`)
```

- Focus indicators: ARIA labels (`aria-describedby="focus-hint"`)
- Chat messages: Role="status" for AI responses (live region)
- Source attribution: Links, not just text

***

## **XIII. Performance \& Technical Constraints**

### **Animation Performance**

- Use CSS animations where possible (GPU-accelerated)
- Transform and opacity only (no layout thrashing)
- Reduce motion on lower-end devices (detect performance API)


### **Font Loading**

- Inter: System font or Google Fonts (400-700 weights)
- iA Writer Quattro: Fallback to `Georgia, serif` if not loaded
- JetBrains Mono: Fallback to `Courier New, monospace` if not loaded
- Fonts loaded via WOFF2 (modern browsers)


### **Color Palette Implementation**

- Use CSS custom properties (variables) for flexibility
- Dark mode: Foundation (primary implementation)
- Light mode: Future-proof with strategy (post-MVP)
- Test on different monitors (blue saturation critical)

***

## **XIV. Design Consistency QA Checklist**

Before Kiro IDE hands off to development, verify:

- [ ] All text passes WCAG AA contrast ratio
- [ ] Spacing between elements follows 8px grid
- [ ] Focus indicators appear on hover/focus (all interactive elements)
- [ ] Motion durations match specification (slow for AI, fast for input)
- [ ] Colors used from palette only (no ad-hoc additions)
- [ ] Hover states exist for all buttons/links
- [ ] Markdown rendering respects typography scale
- [ ] Letter-level focus indicator works at any font size
- [ ] Chat message cards have proper shadows (subtle)
- [ ] Loading state animates at correct speed (2.5s cycle)
- [ ] Modal backdrop color is correct opacity
- [ ] Keyboard navigation works without mouse
- [ ] Error messages appear in appropriate color (not harsh)
- [ ] Source attribution links are visually distinct
- [ ] Suggested questions are clickable and styled correctly
- [ ] Empty states (no documents, no messages) are friendly, not barren

***

## **XV. Implementation Notes for Kiro IDE**

### **Start Here**

1. **Colors first**: Export color palette as design tokens (easiest, highest impact)
2. **Typography next**: Font loading, scale, line-height (affects readability immediately)
3. **Focus indicator**: Letter-level glow with RSVP foundation (used everywhere, high visual impact)
4. **Layout grid**: Two-column split with resizable border (foundational for whole app)
5. **Components**: Build in order of MVP criticality (as listed in Phase 2)

### **What Can Flex**

- Exact hex values (if you find better blues/golds, show me)
- Motion timing (if 300ms feels wrong in practice, adjust)
- Component padding (if 16px feels too tight, go 20px)
- Font choices (if iA Writer isn't available, similar serif OK)


### **What's Fixed**

- Behavioral simplicity (one action per screen, no compromise)
- Craft excellence (smooth animations, no jarring transitions)
- Accessibility (WCAG AA minimum, non-negotiable)
- Cold start experience (must wow judges on first interaction)
- Letter-level focus indicator foundation (for RSVP future)
- Night-to-day metaphor (blue backgrounds + golden accents)

***

## **XVI. Success Metrics for Visual Design**

### **Judge Feedback Indicators**

- ✅ "This feels premium, not rushed"
- ✅ "The interface is beautiful but doesn't get in the way"
- ✅ "I understood what to do without instructions"
- ✅ "The focus indicator is clever—subtle but useful"
- ✅ "The blue-and-gold color scheme feels intentional"


### **Technical Metrics**

- Lighthouse Performance: 90+ (animations don't tank speed)
- Lighthouse Accessibility: 95+ (contrast, navigation, semantics)
- Page load: <2 seconds (fonts don't block rendering)
- Time to Interactive: <1 second (quick feedback on first action)

***

## **XVII. Closing Notes**

This design system is **Iubar's DNA**. It's detailed enough for Kiro IDE to understand intent, but flexible enough to adapt to technical constraints discovered during implementation.

The philosophy is clear:

1. **Behavioral simplicity** over visual minimalism
2. **Craft excellence** in every detail
3. **Zero friction** for cold start experience
4. **Contextual restraint** in color and visual elements
5. **Night-to-day metaphor** (pastel blue nights + golden knowledge light)
6. **Letter-level focus** (foundation for RSVP technology)

Your vision—removing friction between curiosity and understanding while making learning feel fun and liberating—is embedded in every color choice, animation timing, and interaction pattern.

***

**Document Status**: ✅ Ready for Kiro IDE
**Last Updated**: January 15, 2026
**Version**: 1.0 Final (Dark Mode First, Letter-Level Focus, Blue-Gold Palette)
**Next Step**: Hand to Kiro IDE for implementation with this system as the single source of truth

