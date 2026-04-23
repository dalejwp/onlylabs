# Obsidian as Persistent Memory for Claude Code

This guide wires an Obsidian vault into Claude Code as a Model Context Protocol
(MCP) server so Claude remembers context across sessions and across every
device you log into.

## Architecture

```
  ┌────────────────┐   sync    ┌────────────────┐   sync    ┌────────────────┐
  │ Mac / Desktop  │◀─────────▶│  Phone / iPad  │◀─────────▶│ Laptop / other │
  │   Obsidian     │           │   Obsidian     │           │   Obsidian     │
  │   + Local REST │           │   (read-only)  │           │   + Local REST │
  └───────┬────────┘                                        └───────┬────────┘
          │ HTTPS on 127.0.0.1:27124                                │
          │                                                         │
  ┌───────▼────────┐                                        ┌───────▼────────┐
  │  mcp-obsidian  │                                        │  mcp-obsidian  │
  │ (MCP server)   │                                        │ (MCP server)   │
  └───────┬────────┘                                        └───────┬────────┘
          │ stdio                                                   │ stdio
  ┌───────▼────────┐                                        ┌───────▼────────┐
  │  Claude Code   │                                        │  Claude Code   │
  └────────────────┘                                        └────────────────┘
```

Two things make the memory feel continuous:

1. **Obsidian vault sync** — the same Markdown files appear on every device.
2. **A `CLAUDE.md` memory contract** — Claude Code reads a `Memory/` folder in
   the vault at the start of each session and writes updates back when the
   session ends.

The `obsidian-mcp-tools` plugin you may have seen is **Claude Desktop only**.
For Claude Code (the CLI) we use [`mcp-obsidian`], which talks to the
**Local REST API** plugin over HTTPS.

[`mcp-obsidian`]: https://github.com/MarkusPfundstein/mcp-obsidian

## Prerequisites

Per device:

- [Obsidian](https://obsidian.md) ≥ 1.7.7, opened on a vault.
- [Claude Code](https://docs.claude.com/claude-code) installed and logged in.
- Python 3.10+ with [`uv`](https://docs.astral.sh/uv/) or `pipx`.
- One sync method for the vault:
  - **Obsidian Sync** (paid, easiest, end-to-end encrypted)
  - **iCloud Drive / OneDrive / Dropbox** (free, caveats with `.obsidian/`)
  - **Syncthing** (free, peer-to-peer)
  - **Git** (free, manual)

## 1. Install the Obsidian-side plugins

In Obsidian on every device:

1. Settings → Community plugins → Turn on community plugins.
2. Browse and install:
   - **Local REST API** (required — this is the HTTPS endpoint).
   - **Templater** (recommended — dynamic templates).
   - **Smart Connections** (recommended — semantic search over notes).
3. Enable each plugin.
4. Open **Local REST API** settings and copy the **API key**. Keep it.

## 2. Sync your vault

Pick one:

| Method         | Setup                                                                 |
| -------------- | --------------------------------------------------------------------- |
| Obsidian Sync  | Settings → Sync → enable, sign in on every device.                    |
| iCloud/Dropbox | Put the vault inside the synced folder. Don't sync `.obsidian/` the first time — open the vault once locally to regenerate it. |
| Syncthing      | Add the vault folder on every device, two-way.                        |
| Git            | `git init` in the vault, push to a private repo, `git pull` by hand.  |

> Don't skip this step. Without sync, each device has its own memory.

## 3. Run the setup script (per device)

From the repo root:

```bash
./tools/setup-obsidian-mcp.sh \
  --vault "$HOME/Documents/MyVault" \
  --api-key "<paste the Local REST API key>"
```

What the script does:

- Installs `mcp-obsidian` (via `uv tool install` or `pipx install`).
- Registers it with Claude Code under the name `obsidian`
  (`claude mcp add obsidian ...`).
- Creates a `Memory/` folder in the vault with the default memory files.
- Installs the global `~/.claude/CLAUDE.md` memory contract if one doesn't
  already exist (or prints a diff if it does).

Re-run the script on each device you want memory on. The API key and vault
path are per-device.

## 4. Verify

```bash
claude mcp list
# you should see: obsidian    running    stdio
```

Then in a new Claude Code session, ask:

> "What's in my Memory/index.md?"

Claude should read it via the `obsidian` MCP server and quote it back.

## 5. What goes in `Memory/`

The setup script seeds this layout:

```
Memory/
├── index.md            # entry point — Claude reads this first each session
├── profile.md          # who you are, how you talk, preferences
├── projects.md         # what you're working on right now
├── decisions.md        # decisions made, with date and rationale
├── goals.md            # longer-term goals
└── sessions/
    └── YYYY-MM-DD.md   # per-session journal, appended by Claude
```

You own these files — edit them directly in Obsidian any time. Claude will
pick up changes on the next session.

## Troubleshooting

| Symptom                                       | Fix                                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------------------- |
| `claude mcp list` shows `obsidian` as failed  | Obsidian isn't running, or the Local REST API plugin is disabled.                   |
| Self-signed certificate errors                | Set `OBSIDIAN_HOST=127.0.0.1` and `OBSIDIAN_API_KEY=...`; `mcp-obsidian` uses HTTPS with cert verification off by default for localhost. |
| Memory divergence across devices              | Your sync is lagging. Force a sync, or switch sync backends.                        |
| Claude isn't reading `Memory/` automatically  | Check `~/.claude/CLAUDE.md` exists and contains the "Memory Protocol" block.        |
| Port 27124 already in use                     | Change the port in Local REST API settings and pass `--port` to the setup script.   |

## What this setup does NOT do

- It does not monitor your phone, desktop, browser, or messages. That's a
  separate system with real privacy, legal, and platform (iOS/Android
  background-execution) constraints. Treat it as a future project, not a
  config change.
- It does not auto-update memory on every keystroke — Claude writes at the end
  of sessions (or when you ask it to). For continuous capture, feed data into
  the vault via other tools (Readwise, Obsidian Web Clipper, shortcuts, etc.)
  and let Claude read from there.
- It does not give Claude write access to files outside `Memory/` unless you
  explicitly ask. The MCP server can reach the whole vault, but the
  `CLAUDE.md` contract scopes writes to `Memory/`.

## Security notes

- The Local REST API key is a **bearer token to your entire vault**. Don't
  paste it into shared chats or commit it. The setup script stores it in your
  OS keyring via Claude Code's MCP config, not in this repo.
- `mcp-obsidian` runs locally and talks only to `127.0.0.1`. No data leaves
  your machine via this plugin — only via Claude Code's normal API traffic.
- If you lose a device, rotate the API key in Obsidian → Local REST API.
