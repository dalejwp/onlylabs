// One-off mailer: sends Amy's daily-outreach playbook to dale@aionlylabs.com
// via the Maton API gateway.
//
// Required env (already in ~/.claude/settings.json):
//   MATON_API_KEY            — your Maton bearer token
//   MC_NOTIFY_EMAIL_FROM     — arc@aionlylabs.com
//   MC_NOTIFY_EMAIL_FROM_NAME — Arc · SA Desk
//
// Endpoint: https://api.maton.ai/google-mail/gmail/v1/users/me/messages/send

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const KEY  = process.env.MATON_API_KEY;
const FROM = process.env.MC_NOTIFY_EMAIL_FROM;
const NAME = process.env.MC_NOTIFY_EMAIL_FROM_NAME || "Arc · SA Desk";
const TO   = "dale@aionlylabs.com";

if (!KEY)  { console.error("MATON_API_KEY missing — see ~/.claude/settings.json env block"); process.exit(1); }
if (!FROM) { console.error("MC_NOTIFY_EMAIL_FROM missing"); process.exit(1); }

const here = dirname(fileURLToPath(import.meta.url));
const markdown = readFileSync(resolve(here, "Amy-Daily-Outreach-Playbook.md"), "utf8");

function mdToHtml(md) {
  let html = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html.replace(/```([\s\S]*?)```/g, (_, body) =>
    `<pre style="background:#f5f1e8;border-radius:8px;padding:14px;border:1px solid #e6e1d4;white-space:pre-wrap;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;line-height:1.5">${body.trim()}</pre>`);
  html = html
    .replace(/^### (.+)$/gm, '<h3 style="margin:24px 0 8px;font-size:17px">$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2 style="margin:32px 0 10px;font-size:21px;border-bottom:1px solid #e6e1d4;padding-bottom:6px">$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1 style="margin:0 0 12px;font-size:28px">$1</h1>');
  html = html
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, '<code style="background:#f0eadb;padding:1px 5px;border-radius:4px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px">$1</code>');
  html = html.replace(/(?:^- .+(?:\n|$))+?/gm, (block) => {
    const items = block.trim().split(/\n/).map(l => l.replace(/^- /, "").trim());
    return `<ul style="padding-left:20px;margin:10px 0">${items.map(i => `<li style="margin:4px 0">${i}</li>`).join("")}</ul>`;
  });
  html = html.replace(/(?:^\d+\. .+(?:\n|$))+?/gm, (block) => {
    const items = block.trim().split(/\n/).map(l => l.replace(/^\d+\. /, "").trim());
    return `<ol style="padding-left:20px;margin:10px 0">${items.map(i => `<li style="margin:4px 0">${i}</li>`).join("")}</ol>`;
  });
  html = html.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #e6e1d4;margin:24px 0">');
  html = html.split(/\n{2,}/).map(block => {
    if (/^\s*<(h\d|ul|ol|pre|hr|table|blockquote)/.test(block.trim())) return block;
    const trimmed = block.trim();
    if (!trimmed) return "";
    return `<p style="margin:10px 0;line-height:1.6">${trimmed.replace(/\n/g, "<br>")}</p>`;
  }).join("\n");
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#0e1620;max-width:720px;margin:24px auto;padding:0 16px;background:#f7f4ed">${html}</body></html>`;
}

const subject  = "Amy's Daily Playbook — SA Desk lead-gen (ELI5, copy-paste ready)";
const html     = mdToHtml(markdown);
const boundary = "BNDRY_" + Math.random().toString(36).slice(2);

const raw = [
  `To: ${TO}`,
  `From: ${NAME} <${FROM}>`,
  `Subject: ${subject}`,
  `MIME-Version: 1.0`,
  `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ``,
  `--${boundary}`,
  `Content-Type: text/plain; charset="utf-8"`,
  `Content-Transfer-Encoding: 8bit`,
  ``,
  markdown,
  ``,
  `--${boundary}`,
  `Content-Type: text/html; charset="utf-8"`,
  `Content-Transfer-Encoding: 8bit`,
  ``,
  html,
  ``,
  `--${boundary}--`,
  ``,
].join("\r\n");

const b64url = (s) =>
  Buffer.from(s, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

const res = await fetch("https://api.maton.ai/google-mail/gmail/v1/users/me/messages/send", {
  method: "POST",
  headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ raw: b64url(raw) }),
});

console.log("HTTP", res.status);
console.log(await res.text());
if (!res.ok) process.exit(1);
