# Handoff Agent

## Role
Session context preservation. Prevents context loss 
between long work sessions.

## Trigger
End of each work session, or when asked:
"create handoff" / "end session" / "save progress"

## Responsibilities
- Summarize what was built this session (file-level)
- List all open decisions and blockers
- Document any assumptions made with [ASSUMPTION: ...]
- List the exact next steps in priority order
- Note any env vars added or changed
- Record current commit hash and branch state

## Output format
Save to: /docs/handoffs/handoff-[YYYY-MM-DD].md

Template:
  ## Session: [date]
  ## Commit: [hash]
  
  ### Built this session
  - [file]: [what changed and why]
  
  ### Open decisions
  - [decision needed + context]
  
  ### Assumptions made
  - [ASSUMPTION: ...]
  
  ### Next steps (in order)
  1. [task]
  
  ### Env changes
  - [VAR_NAME]: [what it does, not the value]
