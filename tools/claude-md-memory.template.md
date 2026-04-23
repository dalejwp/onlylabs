# Global Memory Protocol

This file is installed to `~/.claude/CLAUDE.md` and applies to every Claude
Code session on this device. It teaches Claude to use an Obsidian vault as
persistent memory via the `__MCP_NAME__` MCP server.

Vault root: `__VAULT_PATH__`
MCP server: `__MCP_NAME__` (mcp-obsidian → Local REST API)

## Start of session

1. Read `Memory/index.md` via the `__MCP_NAME__` MCP server. That file links to
   the rest of memory — follow the links that look relevant to the user's
   current request.
2. Load `Memory/profile.md` for voice, preferences, and identity.
3. Skim `Memory/projects.md` for active context. If the user mentions a
   project, read its section.
4. Check `Memory/sessions/` for the most recent session file; read it if the
   current request seems to continue that thread.
5. Do not recite the whole memory back to the user. Use it silently unless
   they ask.

## During the session

- Treat `Memory/profile.md` as authoritative for how to address the user, what
  tone to use, and what they care about.
- Honor decisions recorded in `Memory/decisions.md`. If a new request
  contradicts a past decision, flag it and ask before acting.
- If the user tells you a durable fact about themselves ("I'm allergic to…",
  "I always deploy on Fridays", "call me X"), add it to the right memory file
  before the session ends.

## End of session

Before responding to a final "thanks / bye / that's all" or when the user
explicitly asks to checkpoint:

1. Append a dated entry to `Memory/sessions/YYYY-MM-DD.md` with:
   - What we worked on (1–3 bullets)
   - Decisions made (if any, also append to `decisions.md`)
   - Open threads / what's next
2. If the request advanced an active project, update that project's section
   in `Memory/projects.md`.
3. Keep entries short. Memory is for the next session, not a transcript.

## Scoping rules

- **Write scope:** only `Memory/` inside the vault. Never edit other notes
  unless the user explicitly asks.
- **Read scope:** anywhere in the vault is fair game when researching a user
  question, but cite the note you pulled from.
- **Don't invent facts** to fill memory files. If a field is unknown, leave it
  blank or ask once.

## When the MCP server is unavailable

If `__MCP_NAME__` isn't running (Obsidian closed, plugin disabled, device
offline), say so plainly once, proceed without memory, and don't retry every
turn. Don't pretend to remember.

## Self-improvement

At the end of each session, consider whether anything in this protocol
actively got in the way or could be sharper. If so, tell the user and
propose an edit to this file — do not edit it silently.
