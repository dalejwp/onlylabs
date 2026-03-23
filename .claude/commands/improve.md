# /improve — Autonomous Iterative Code Improvement

Inspired by Karpathy's autoresearch framework. Runs an autonomous hypothesis→implement→score→keep/revert loop to improve the current project without a GPU.

## Arguments

`$ARGUMENTS` may contain:
- A number (iterations, default: 10), e.g. `/improve 20`
- A focus area, e.g. `/improve performance` or `/improve 15 type safety`
- Both, e.g. `/improve 5 reduce bundle size`

Parse `$ARGUMENTS` to extract these. Default to 10 iterations if no number given.

---

## Step 1 — Detect project type and scoring commands

Examine the project root. In order of priority, select commands that give a **numeric score**:

| Project type | Detection | Score command | Score = |
|---|---|---|---|
| Node/JS | `package.json` with `test` script | `npm test 2>&1` | tests passed / total (0.0–1.0) |
| Node/JS | `package.json` with `lint` script | `npm run lint 2>&1` | 1 - (error count / 100), min 0 |
| Node/JS | `package.json` with `build` script | `npm run build 2>&1` | 1.0 = success, 0.0 = fail |
| Python | `pytest` or `pyproject.toml` | `python -m pytest --tb=no -q 2>&1` | tests passed / total |
| Python | `ruff` or `flake8` | `ruff check . 2>&1` | 1 - (error count / 100) |
| Go | `go.mod` | `go test ./... 2>&1` | tests passed / total |
| Rust | `Cargo.toml` | `cargo test 2>&1` | tests passed / total |
| TypeScript | `tsconfig.json` | `npx tsc --noEmit 2>&1` | 1.0 = 0 errors, else 1 - (errors/100) |

Prefer **tests** over **lint** over **build** — tests give the richest signal.

If multiple apply, pick the best one. If none apply, use lint, then build.

Tell the user: "Scoring with: `<command>` → metric: `<what it measures>`"

---

## Step 2 — Establish baseline

Run the score command. Parse output and compute the baseline score (a float 0.0–1.0, where higher is always better).

Print:
```
Baseline score: <score> (<raw summary, e.g. "42/45 tests passing, 3 lint errors">)
```

If baseline is already 1.0 (perfect), note it but continue — improvements can still reduce complexity, dead code, or bundle size.

Initialize a results log at `improve-results.tsv` in the project root:
```
iteration	score	delta	status	hypothesis
0	<baseline>	0.000	baseline	Initial state
```

---

## Step 3 — Autonomous improvement loop

Run for the number of iterations specified (default 10). For each iteration:

### 3a. Generate a hypothesis

Read the current codebase state (focus on source files, not tests or config). Consider:
- Failing tests: what's the root cause?
- Lint errors: which are easiest to fix correctly?
- Dead code, unused imports, redundant logic
- Type errors or missing types
- Repeated patterns that can be simplified
- Performance hotspots (N+1 queries, unnecessary re-renders, missing indexes)
- If focus area was specified in `$ARGUMENTS`, bias toward that area

State the hypothesis in one sentence, e.g.:
- "Removing unused import in `src/lib/auth.ts` will fix 2 lint errors"
- "Extracting duplicated fetch logic in 3 components will improve maintainability"
- "Adding missing return type annotations will fix 4 TypeScript errors"

### 3b. Implement the change

Make the change. Constraints (same philosophy as autoresearch):
- Modify **source files only** — never modify test files, lock files, or build config
- No new dependencies
- Prefer deletion and simplification over addition
- One focused change per iteration (not a refactor sweep)

### 3c. Score

Run the score command again. Compute new score and delta.

### 3d. Decision

```
if new_score > baseline_score:
    KEEP — commit with message: "improve: <hypothesis>"
    Update baseline_score = new_score
    status = "improved"
elif new_score == baseline_score AND change reduced line count:
    KEEP — commit with message: "improve(simplify): <hypothesis>"
    status = "simplified"
else:
    REVERT — git checkout the changed files to restore previous state
    status = "reverted"
```

### 3e. Log result

Append to `improve-results.tsv`:
```
<iteration>	<new_score>	<delta>	<status>	<hypothesis>
```

Print one-line progress:
```
[3/10] score=0.94 (+0.02) KEPT — "Fixed unused variable causing lint error in auth.ts"
[4/10] score=0.94 (+0.00) REVERTED — "Extracted helper function" (no improvement)
```

---

## Step 4 — Summary

After all iterations, print a summary table:

```
## Improvement Run Complete

Baseline → Final: <baseline> → <final> (<total delta>)
Iterations: <kept> kept, <simplified> simplified, <reverted> reverted

### Changes made:
- [iter 2] +0.04 "Fixed null check causing 2 test failures in api/users.ts"
- [iter 5] +0.02 "Removed unused middleware import reducing lint errors"
- [iter 8] simplify "Deduplicated fetch logic across 3 components"

Results log saved to: improve-results.tsv
```

If score reached 1.0 (perfect), celebrate: "All tests passing, no lint errors — project is clean!"

If no improvements were found after 10 iterations, say: "Project is already in good shape. Consider specifying a focus area: `/improve performance` or `/improve 20` for more attempts."

---

## Important rules

1. **Never skip the revert** — if a change doesn't improve the score, always restore the previous state with `git checkout -- <files>`
2. **Commit each improvement immediately** — don't batch changes
3. **Don't touch tests** — tests define correctness; source code must satisfy them, not the other way around
4. **Be honest about score parsing** — if you can't parse a numeric score from output, say so and fall back to binary (1.0 = clean exit, 0.0 = error exit)
5. **One hypothesis per iteration** — focused changes are reviewable; sweeping refactors are not
