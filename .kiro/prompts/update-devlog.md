# Update Development Log

Analyze the current conversation and update the DEVLOG.md file with relevant development activities.

## Critical Constraints

- **NEVER invent or fabricate data** - only document what actually happened
- Use exact timestamps from conversation and file modifications
- If information is unclear or conversation lacks detail, ASK the user rather than assume
- DO NOT overwrite or delete existing DEVLOG entries
- DO NOT add entries for work that wasn't completed

## Process

1. **Read the current DEVLOG.md** from `.kiro/documentation/project-docs/DEVLOG.md`
2. **Analyze the conversation history** to identify documentable activities
3. **If conversation lacks clear activities**, ask user what to document before proceeding
4. **Present proposed additions** to user before writing to file

## What to Extract from Conversation

### Development Activities
- Files created, modified, or deleted
- Features implemented or attempted
- Bugs fixed or encountered
- Testing performed
- Architecture changes

### Technical Decisions
- Technology choices made
- Design patterns selected
- Trade-offs discussed
- Alternative approaches considered

### Time and Progress Tracking
- Use actual timestamps from conversation, not estimates
- Update completion status of planned tasks
- Note blockers or delays

## Update Rules

- **Daily entries**: Add to current week section, create new day if needed, or a new week if needed
- **Technical decisions**: Add to "Technical Decisions & Rationale" section
- **Statistics**: Update time tracking and Kiro usage counters
- **Format consistency**: Match existing DEVLOG style and structure
- **Intelligent summarization**: Condense conversation into concise, actionable entries

## Forbidden Actions

- DO NOT invent time estimates without evidence from timestamps
- DO NOT fabricate technical decisions not discussed
- DO NOT delete or modify existing entries
- DO NOT add entries for work that wasn't actually completed

## When to Ask for Clarification

If the conversation doesn't provide clear information about:
- What specific work was done
- Time period covered
- Challenges or decisions made

Then ask the user:
1. What type of entry is this? (daily work, technical decision, milestone)
2. What date/time period does this cover?
3. What specific work was done?
4. How much time was spent?
5. Any challenges or interesting discoveries?
6. What Kiro prompts were used?
7. What are the next steps?

## Output

Present proposed DEVLOG additions to user, then update the file and briefly explain what was added or changed.
