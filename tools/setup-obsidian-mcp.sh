#!/usr/bin/env bash
#
# Wire an Obsidian vault into Claude Code as an MCP server so memory persists
# across sessions and devices. See docs/obsidian-mcp-setup.md for the full
# rationale.
#
# Usage:
#   ./tools/setup-obsidian-mcp.sh \
#     --vault "$HOME/Documents/MyVault" \
#     --api-key "<Local REST API key from Obsidian>"
#
# Optional flags:
#   --host <host>      Local REST API host (default: 127.0.0.1)
#   --port <port>      Local REST API port (default: 27124)
#   --name <name>      MCP server name to register (default: obsidian)
#   --skip-claude-md   Don't touch ~/.claude/CLAUDE.md
#   --force-claude-md  Overwrite ~/.claude/CLAUDE.md if it already exists

set -euo pipefail

VAULT=""
API_KEY=""
HOST="127.0.0.1"
PORT="27124"
MCP_NAME="obsidian"
SKIP_CLAUDE_MD=0
FORCE_CLAUDE_MD=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --vault)            VAULT="$2"; shift 2 ;;
    --api-key)          API_KEY="$2"; shift 2 ;;
    --host)             HOST="$2"; shift 2 ;;
    --port)             PORT="$2"; shift 2 ;;
    --name)             MCP_NAME="$2"; shift 2 ;;
    --skip-claude-md)   SKIP_CLAUDE_MD=1; shift ;;
    --force-claude-md)  FORCE_CLAUDE_MD=1; shift ;;
    -h|--help)
      sed -n '3,20p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown flag: $1" >&2
      exit 2
      ;;
  esac
done

err()  { echo "error: $*" >&2; exit 1; }
info() { echo "▸ $*"; }

[[ -n "$VAULT" ]]   || err "--vault is required"
[[ -n "$API_KEY" ]] || err "--api-key is required"
[[ -d "$VAULT" ]]   || err "vault does not exist: $VAULT"

command -v claude >/dev/null 2>&1 || err "claude (Claude Code CLI) not found on PATH"

# --- 1. install mcp-obsidian ------------------------------------------------

install_mcp_obsidian() {
  if command -v mcp-obsidian >/dev/null 2>&1; then
    info "mcp-obsidian already installed ($(command -v mcp-obsidian))"
    return
  fi

  if command -v uv >/dev/null 2>&1; then
    info "installing mcp-obsidian via uv"
    uv tool install mcp-obsidian
  elif command -v pipx >/dev/null 2>&1; then
    info "installing mcp-obsidian via pipx"
    pipx install mcp-obsidian
  else
    err "neither uv nor pipx found. Install one: https://docs.astral.sh/uv/ or https://pipx.pypa.io/"
  fi
}

install_mcp_obsidian

# --- 2. register with Claude Code ------------------------------------------

info "registering MCP server '$MCP_NAME' with Claude Code"

if claude mcp list 2>/dev/null | awk '{print $1}' | grep -Fxq "$MCP_NAME"; then
  info "existing '$MCP_NAME' entry found; removing before re-adding"
  claude mcp remove "$MCP_NAME" >/dev/null
fi

claude mcp add "$MCP_NAME" \
  --env "OBSIDIAN_HOST=$HOST" \
  --env "OBSIDIAN_PORT=$PORT" \
  --env "OBSIDIAN_API_KEY=$API_KEY" \
  -- mcp-obsidian

# --- 3. seed the Memory/ folder in the vault --------------------------------

MEM="$VAULT/Memory"
mkdir -p "$MEM/sessions"

seed() {
  local path="$1"; shift
  if [[ -f "$path" ]]; then
    info "keeping existing $path"
    return
  fi
  info "creating $path"
  printf '%s\n' "$@" > "$path"
}

seed "$MEM/index.md" \
  "# Memory Index" \
  "" \
  "Claude reads this file first each session. Keep it short. Link out to the" \
  "other files in this folder for detail." \
  "" \
  "- [[profile]] — who I am, how I talk, preferences" \
  "- [[projects]] — what I'm working on right now" \
  "- [[decisions]] — decisions made, with date + rationale" \
  "- [[goals]] — longer-term goals" \
  "- sessions/ — per-day session journal"

seed "$MEM/profile.md" \
  "# Profile" \
  "" \
  "## Identity" \
  "- Name:" \
  "- Location:" \
  "- Role:" \
  "" \
  "## Voice and style" \
  "- How I write:" \
  "- Pet peeves:" \
  "- Preferred tone:" \
  "" \
  "## Tools I use daily" \
  "-"

seed "$MEM/projects.md" \
  "# Active Projects" \
  "" \
  "One heading per project. Archive finished ones to the bottom under" \
  "\`## Archive\`." \
  "" \
  "## Mission Control" \
  "- Repo: onlylabs" \
  "- Status: in progress" \
  "- Next step:"

seed "$MEM/decisions.md" \
  "# Decisions" \
  "" \
  "Append-only. Newest at the top. Format:" \
  "" \
  "## YYYY-MM-DD — <short title>" \
  "- **Context:**" \
  "- **Decision:**" \
  "- **Why:**" \
  "- **Revisit:**"

seed "$MEM/goals.md" \
  "# Goals" \
  "" \
  "## Now (this quarter)" \
  "-" \
  "" \
  "## Next (this year)" \
  "-" \
  "" \
  "## Someday" \
  "-"

seed "$MEM/sessions/README.md" \
  "# Sessions" \
  "" \
  "One file per day: \`YYYY-MM-DD.md\`. Claude appends a short entry at the" \
  "end of each session summarizing what we did and what's next."

# --- 4. install global CLAUDE.md memory contract ----------------------------

CLAUDE_MD="$HOME/.claude/CLAUDE.md"
TEMPLATE="$(cd "$(dirname "$0")/.." && pwd)/tools/claude-md-memory.template.md"

if [[ "$SKIP_CLAUDE_MD" == "1" ]]; then
  info "skipping ~/.claude/CLAUDE.md (per --skip-claude-md)"
elif [[ ! -f "$TEMPLATE" ]]; then
  info "memory template not found at $TEMPLATE; skipping global CLAUDE.md"
else
  mkdir -p "$(dirname "$CLAUDE_MD")"
  if [[ -f "$CLAUDE_MD" && "$FORCE_CLAUDE_MD" != "1" ]]; then
    info "$CLAUDE_MD already exists; not overwriting (pass --force-claude-md to replace)"
    info "diff against template:"
    diff -u "$CLAUDE_MD" "$TEMPLATE" || true
  else
    info "writing $CLAUDE_MD"
    sed "s|__VAULT_PATH__|$VAULT|g; s|__MCP_NAME__|$MCP_NAME|g" "$TEMPLATE" > "$CLAUDE_MD"
  fi
fi

# --- 5. done ----------------------------------------------------------------

cat <<EOF

Setup complete.

  MCP server:   $MCP_NAME (mcp-obsidian → $HOST:$PORT)
  Vault:        $VAULT
  Memory root:  $MEM
  CLAUDE.md:    $CLAUDE_MD

Verify:
  claude mcp list

Then start a Claude Code session and ask it to read Memory/index.md.
EOF
