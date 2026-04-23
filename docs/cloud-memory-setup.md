# Cloud Memory + MCP Setup

Mission Control acts as the single cloud brain for Claude Code across every
device you use. Memory lives in the Mission Control database; any computer
with Claude Code reads and writes it through an MCP bridge that speaks to
Mission Control's HTTPS API.

Browser Use is wired in too, so Claude Code can fire off a browser-automation
task through the same pipe.

## Architecture

```
    Your laptop              Your desktop            Your phone
 ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
 │  Claude Code    │     │  Claude Code    │     │ (browser only,  │
 │       │         │     │       │         │     │  reads web UI)  │
 │  mc-mcp bridge  │     │  mc-mcp bridge  │     │                 │
 └────────┬────────┘     └────────┬────────┘     └────────┬────────┘
          │ HTTPS + Bearer token  │                       │
          └───────────┬───────────┴───────────┬───────────┘
                      │                       │
                      ▼                       ▼
                 ┌─────────────────────────────────┐
                 │     Mission Control (VPS)       │
                 │  /api/memory/*, /api/browser-use│
                 │        Prisma + SQLite          │
                 └───────────────┬─────────────────┘
                                 │
                                 ▼
                        Browser Use cloud API
```

One deploy. One database. All devices see the same memory.

## 1. Deploy Mission Control

Follow [Golden Path](./golden-path.md) to deploy to your VPS (Docker Compose
or direct Node). Before starting the app, generate and set two new secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # MC_AUTH_SECRET if not set
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # MC_MCP_TOKEN
```

Add to your VPS env:

```
MC_MCP_TOKEN=<the hex token>
BROWSER_USE_API_KEY=<from https://cloud.browser-use.com>
BROWSER_USE_PROFILE_ID=<optional>
BROWSER_USE_WORKSPACE_ID=<optional>
```

Apply the new migration:

```bash
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

Restart the app. Smoke-test:

```bash
curl -H "Authorization: Bearer $MC_MCP_TOKEN" https://mc.example.com/api/memory
# → {"ok":true,"entries":[]}
```

If you get 401, the token is wrong. If you get 503 with
`MC_MCP_TOKEN is not configured`, the env var didn't make it into the running
process — restart the container.

## 2. Register the MCP bridge on each computer

Per computer (Mac, Linux, Windows-via-Git-Bash):

```bash
# 2a. Clone this repo if you haven't already
git clone https://github.com/dalejwp/onlylabs.git
cd onlylabs

# 2b. Install the bridge's dep
cd tools/mcp-server
npm install
cd ../..

# 2c. Register with Claude Code
claude mcp add mission-control \
  --env MC_BASE_URL=https://mc.example.com \
  --env MC_MCP_TOKEN=<same token as on the server> \
  -- node "$(pwd)/tools/mcp-server/index.mjs"

# 2d. Verify
claude mcp list       # should show mission-control
```

In a Claude Code session, ask:

> List my memory entries.

Claude will call `memory_list` through the bridge and show an empty list on a
fresh install. Write a test entry:

> Remember that my vault path is /Users/me/Documents (write to `profile`).

Claude will call `memory_write` and you'll see a row in Mission Control's
database.

## 3. Memory conventions

No folder enforcement — Mission Control stores anything at any path. The
conventions Claude follows (driven by your local `~/.claude/CLAUDE.md`) are:

| Path                          | Purpose                                                     |
| ----------------------------- | ----------------------------------------------------------- |
| `profile`                     | Who you are, voice, preferences. Stable.                    |
| `projects`                    | Active projects. Updated per session.                       |
| `decisions`                   | Append-only log of decisions with date + rationale.         |
| `goals`                       | Quarterly / yearly / someday.                               |
| `sessions/YYYY-MM-DD`         | Per-day journal Claude appends to at session end.           |

Nothing stops you from adding more. Keep them short — memory is context fuel,
not a transcript.

## 4. Global CLAUDE.md (memory protocol)

Install once per computer at `~/.claude/CLAUDE.md` so Claude uses the memory
consistently on every machine:

```markdown
# Memory Protocol

Your memory lives in the `mission-control` MCP server. Call:
- `memory_list` at session start if the user's request might continue prior work.
- `memory_read('profile')` to load voice and preferences.
- `memory_read('projects')` when the user mentions any project.
- `memory_append('sessions/YYYY-MM-DD', '...')` before ending the session
  with 1–3 bullets: what we did, decisions made, what's next.
- `memory_append('decisions', '...')` whenever a durable decision is made.

Do not recite memory back to the user unless asked. Use it silently. If the
MCP server is unreachable, say so once, continue without memory, do not
retry every turn.
```

## 5. Using Browser Use from Claude Code

Once registered, Claude Code has a `browser_use` tool. Ask naturally:

> Open twitter.com/elonmusk and list his last 5 tweets.

Claude will invoke the tool, Mission Control will proxy to Browser Use cloud,
and you'll get the result in chat. Typical runs take 30 seconds to a few
minutes.

The browser runs on Browser Use's infrastructure — nothing runs locally on
the computer that issued the request. Good for anything logged-out.

## 6. (Optional) Local browser control via browser-harness

[browser-harness](https://github.com/browser-use/browser-harness) is a
per-device tool that lets Claude Code drive **your own Chrome** (with your
logged-in sessions) via CDP. It's the right fit when Browser Use cloud isn't
— e.g. tasks that need your Gmail, your LinkedIn, or a site behind SSO.

This is a local install, not cloud. It adds complexity; skip it unless you
actually need it.

**To install on a computer** (macOS / Linux / Windows-via-Git-Bash):

1. Open that computer's Claude Code.
2. Paste this exact prompt:

   > Set up https://github.com/browser-use/browser-harness for me.
   >
   > Read `install.md` first to install and connect this repo to my real
   > browser. Then read `SKILL.md` for normal usage. Always read `helpers.py`
   > because that is where the functions are. When you open a setup or
   > verification tab, activate it so I can see the active browser tab. After
   > it is installed, open browser-use.com as a smoke test.

3. Claude Code will clone the harness, open a setup tab in your browser, ask
   you to tick "Enable remote debugging", and then verify it works.

Browser-harness is independent of Mission Control — it does **not** register
as the same `mission-control` MCP server. It installs as its own local skill
and drives Chrome directly. Use it on the computer you're sitting at; use
`browser_use` (cloud) for everything else.

## Troubleshooting

| Symptom                                         | Cause / Fix                                                                 |
| ----------------------------------------------- | --------------------------------------------------------------------------- |
| `401 missing bearer token`                      | MCP bridge env is missing `MC_MCP_TOKEN` or it's the wrong token.           |
| `503 MC_MCP_TOKEN is not configured`            | Server didn't pick up the env var. Restart the app.                         |
| `claude mcp list` shows `mission-control failed`| Usually `MC_BASE_URL` is wrong, or Node isn't in PATH for the MCP process. Use an absolute path in `claude mcp add`. |
| Memory writes succeed but vanish                | Prisma migration never ran on the server. Run `npx prisma migrate deploy`. |
| `browser_use` returns `502`                     | Bad `BROWSER_USE_API_KEY` on the server, or Browser Use account inactive.   |
| Wrong device reads different memory             | Same `MC_BASE_URL` + `MC_MCP_TOKEN` on all devices? Only one Mission Control deployment in play? |

## Security notes

- `MC_MCP_TOKEN` grants full read/write to your memory and permission to run
  Browser Use tasks on your account. Treat it like a password. Rotate it by
  changing the env var on the server + every device.
- All traffic is HTTPS; the token is sent in the `Authorization` header only.
- Nothing is logged about memory contents beyond Mission Control's normal
  request log. Turn up logging carefully if you adjust it.
- Browser Use tasks run in their cloud — any site you visit via `browser_use`
  sees Browser Use's IP, not yours (unless you set a proxy country code).
