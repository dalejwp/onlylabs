#!/usr/bin/env python3
"""
Run a Browser Use cloud task from the command line.

Reads credentials from environment:
  BROWSER_USE_API_KEY        (required)
  BROWSER_USE_PROFILE_ID     (optional)
  BROWSER_USE_WORKSPACE_ID   (optional)

Usage:
  export BROWSER_USE_API_KEY=bu_...
  ./tools/browser_use_agent.py "open hackernews and summarize the top 3 stories"

Install the SDK once per machine:
  uv tool install browser-use-sdk
  # or: pipx install browser-use-sdk
"""
import argparse
import os
import sys

try:
    from browser_use_sdk.v3 import BrowserUse
except ImportError:
    sys.stderr.write(
        "browser-use-sdk is not installed.\n"
        "Install it with:  uv tool install browser-use-sdk\n"
        "or:               pipx install browser-use-sdk\n"
    )
    sys.exit(2)


def main() -> int:
    parser = argparse.ArgumentParser(description="Run a Browser Use cloud task.")
    parser.add_argument("task", help="Natural-language task for the browser agent")
    parser.add_argument("--model", default="claude-opus-4.7",
                        help="LLM to drive the agent (default: claude-opus-4.7)")
    parser.add_argument("--country", default="us",
                        help="Proxy country code, ISO 3166-1 alpha-2 (default: us)")
    args = parser.parse_args()

    api_key = os.environ.get("BROWSER_USE_API_KEY")
    if not api_key:
        sys.stderr.write("error: BROWSER_USE_API_KEY is not set\n")
        return 2

    client = BrowserUse(api_key=api_key)

    kwargs = {
        "model": args.model,
        "proxy_country_code": args.country,
    }
    if profile_id := os.environ.get("BROWSER_USE_PROFILE_ID"):
        kwargs["profile_id"] = profile_id
    if workspace_id := os.environ.get("BROWSER_USE_WORKSPACE_ID"):
        kwargs["workspace_id"] = workspace_id

    result = client.run(args.task, **kwargs)
    print(result.output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
