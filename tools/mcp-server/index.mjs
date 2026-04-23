#!/usr/bin/env node
// MCP bridge for Mission Control.
//
// Exposes memory_* and browser_use tools to Claude Code over stdio. Every
// tool call is a single HTTPS request to Mission Control's REST API.
//
// Env:
//   MC_BASE_URL     e.g. https://mc.example.com  (required, no trailing slash)
//   MC_MCP_TOKEN    bearer token matching server's MC_MCP_TOKEN (required)
//
// Register with Claude Code on each device:
//   claude mcp add mission-control \
//     --env MC_BASE_URL=https://mc.example.com \
//     --env MC_MCP_TOKEN=... \
//     -- node /absolute/path/to/onlylabs/tools/mcp-server/index.mjs

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const BASE = (process.env.MC_BASE_URL || "").replace(/\/+$/, "");
const TOKEN = process.env.MC_MCP_TOKEN || "";
if (!BASE || !TOKEN) {
  process.stderr.write(
    "mc-mcp: MC_BASE_URL and MC_MCP_TOKEN must be set in the environment.\n",
  );
  process.exit(2);
}

async function mc(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body = text;
  try { body = JSON.parse(text); } catch { /* keep raw */ }
  if (!res.ok) {
    throw new Error(`Mission Control ${res.status}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
  }
  return body;
}

const encPath = (p) => p.split("/").map(encodeURIComponent).join("/");

const TOOLS = [
  {
    name: "memory_list",
    description:
      "List memory entries stored in Mission Control. Returns paths + timestamps, not content. Use memory_read to fetch content.",
    inputSchema: {
      type: "object",
      properties: {
        prefix: { type: "string", description: "Only return paths starting with this prefix (e.g. 'sessions/')." },
        q: { type: "string", description: "Only return entries whose content contains this substring." },
        limit: { type: "integer", minimum: 1, maximum: 1000, default: 200 },
      },
    },
  },
  {
    name: "memory_read",
    description: "Read a single memory entry by path.",
    inputSchema: {
      type: "object",
      required: ["path"],
      properties: { path: { type: "string" } },
    },
  },
  {
    name: "memory_write",
    description: "Create or replace a memory entry at `path` with `content`.",
    inputSchema: {
      type: "object",
      required: ["path", "content"],
      properties: { path: { type: "string" }, content: { type: "string" } },
    },
  },
  {
    name: "memory_append",
    description: "Append `content` to the memory entry at `path`, creating it if missing. A newline is inserted between existing content and the new content.",
    inputSchema: {
      type: "object",
      required: ["path", "content"],
      properties: { path: { type: "string" }, content: { type: "string" } },
    },
  },
  {
    name: "memory_delete",
    description: "Delete the memory entry at `path`.",
    inputSchema: {
      type: "object",
      required: ["path"],
      properties: { path: { type: "string" } },
    },
  },
  {
    name: "browser_use",
    description:
      "Run a Browser Use cloud task. Give a natural-language task; the cloud agent opens a real browser and returns the result. May take up to a few minutes.",
    inputSchema: {
      type: "object",
      required: ["task"],
      properties: {
        task: { type: "string" },
        model: { type: "string", default: "claude-opus-4.7" },
        country: { type: "string", default: "us", description: "Proxy country code, ISO 3166-1 alpha-2." },
      },
    },
  },
];

const server = new Server(
  { name: "mission-control", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  try {
    let result;
    switch (name) {
      case "memory_list": {
        const qs = new URLSearchParams();
        if (args.prefix) qs.set("prefix", String(args.prefix));
        if (args.q) qs.set("q", String(args.q));
        if (args.limit) qs.set("limit", String(args.limit));
        const s = qs.toString();
        result = await mc(`/api/memory${s ? `?${s}` : ""}`);
        break;
      }
      case "memory_read": {
        result = await mc(`/api/memory/${encPath(String(args.path))}`);
        break;
      }
      case "memory_write": {
        result = await mc(`/api/memory/${encPath(String(args.path))}`, {
          method: "PUT",
          body: JSON.stringify({ content: String(args.content) }),
        });
        break;
      }
      case "memory_append": {
        result = await mc(`/api/memory/${encPath(String(args.path))}`, {
          method: "PATCH",
          body: JSON.stringify({ content: String(args.content) }),
        });
        break;
      }
      case "memory_delete": {
        result = await mc(`/api/memory/${encPath(String(args.path))}`, {
          method: "DELETE",
        });
        break;
      }
      case "browser_use": {
        result = await mc(`/api/browser-use`, {
          method: "POST",
          body: JSON.stringify({
            task: String(args.task),
            model: args.model,
            country: args.country,
          }),
        });
        break;
      }
      default:
        return {
          content: [{ type: "text", text: `unknown tool: ${name}` }],
          isError: true,
        };
    }
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return {
      content: [{ type: "text", text: err instanceof Error ? err.message : String(err) }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
