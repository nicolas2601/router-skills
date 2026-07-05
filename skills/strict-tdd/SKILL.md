---
name: strict-tdd
description: Strict Test-Driven Development with RED → GREEN → TRIANGULATE → REFACTOR cycle. Use when implementing any feature, bug fix, or refactor that has (or should have) tests. Enforces Uncle Bob's Three Laws of TDD.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
version: 1.0.0
---

# Strict TDD

Disciplined Test-Driven Development with explicit phase gates. No improvisation: every line of production code must exist to satisfy a failing test.

## The Three Laws of TDD (Uncle Bob)

1. **You may not write production code until you have written a failing unit test.**
2. **You may not write more of a unit test than is sufficient to fail** — and compile errors count as failures.
3. **You may not write more production code than is sufficient to pass the currently failing test.**

Violating any of the three breaks the cycle. If in doubt, stop and re-read the last test you wrote.

## The Four Phases

### RED — write a failing test

- Write the smallest test that expresses the next behavior you want.
- Run it. **Confirm it fails for the expected reason** (assertion failure, not import error or typo — unless that is the point).
- Capture the literal failure output. Quote it in the commit message or PR description when you ship the cycle.
- Do NOT touch production code during RED. If you feel the urge, it means the test is too big — shrink it.

### GREEN — make it pass with the minimum code possible

- Return a hardcoded value if that makes the test green. **Fake it till you make it** is legitimate here.
- NO refactor. NO extra behavior. NO "while I'm at it".
- Run the full suite. Confirm green.

### TRIANGULATE — force generalization

- Write a second test whose input/output combination **breaks the hardcoded value**.
- Run. Confirm it fails.
- Modify production code **only enough** to make both tests pass. This is where real logic emerges — from the pressure of two concrete examples.
- Run the full suite. Confirm green.
- Repeat with a third example if the generalization is still ambiguous.

### REFACTOR — improve design without changing behavior

- Tests must stay green at every step. Run the suite after every non-trivial edit.
- Rename. Extract. Inline. Deduplicate. Simplify.
- **Do not add new behavior.** If you spot a missing case, write a new RED test first — that is a new cycle.
- Stop when the code is clean. Do not gold-plate.

## Explicit Gates

No phase advance without the corresponding gate. Record the evidence (output, hash, timestamp) before moving on.

- **GATE 1 (RED → GREEN)**: a test is failing with the expected message. You have the literal failure output in hand.
- **GATE 2 (GREEN → TRIANGULATE)**: the test that was red is now green, and the full suite is green.
- **GATE 3 (TRIANGULATE → REFACTOR)**: at least two tests exercise the behavior, and both pass. The hardcode is gone.
- **GATE 4 (FINAL)**: full suite green + coverage check. Compare coverage to the pre-cycle baseline — must be ≥ baseline.

## Safety Net

Before any TDD session:

1. Run the full test suite. Save the count of passing/failing tests and the coverage number.
2. This is the **baseline**. Every subsequent suite run must meet or exceed it.
3. Any regression (new failure, coverage drop, broken skipped test) is a full stop — fix before continuing.

## Test Layer Guidance

- **Unit test**: pure functions, single class, all external dependencies mocked. Milliseconds, deterministic, runs on every file save.
- **Integration test**: real database (test schema), real HTTP against a test server, real filesystem sandbox. Seconds, runs on pre-push and CI.
- **E2E test**: golden path only (login, checkout, main user journey). Expensive, flaky-prone, keep the set small. Runs on CI and before release.

Default to the narrowest layer that can falsify the behavior. Climb only when the unit layer cannot reach the concern (e.g., SQL migration, HTTP serialization, browser rendering).

## When to Skip TDD

- **Spike / exploration**: prefix the branch or commit with `SPIKE:`. Delete the spike when done and rewrite with TDD.
- **Config / schema migrations with no logic**: if there is literally nothing to assert, skip. If there is any conditional or transformation, do not skip.
- **NEVER skip on bug fixes.** The test that reproduces the bug is the only guarantee that it will not come back. Write the failing test first, watch it turn green when you fix the code — that is the whole value.

## End-to-End Example: `divide(a, b)`

### Cycle 1 — basic division

RED:

```python
def test_divide_returns_quotient():
    assert divide(6, 2) == 3
```

Run: `NameError: name 'divide' is not defined`. Good — that counts as a failure.

GREEN:

```python
def divide(a, b):
    return 3
```

Run: passes. Suite green.

### Cycle 2 — triangulate

RED:

```python
def test_divide_different_inputs():
    assert divide(10, 2) == 5
```

Run: `AssertionError: 3 != 5`. Good.

GREEN (generalize):

```python
def divide(a, b):
    return a / b
```

Run: both tests pass.

### Cycle 3 — divide by zero

RED:

```python
def test_divide_by_zero_raises():
    with pytest.raises(ValueError, match="cannot divide by zero"):
        divide(1, 0)
```

Run: `ZeroDivisionError` — wrong exception type. Failure confirmed.

GREEN:

```python
def divide(a, b):
    if b == 0:
        raise ValueError("cannot divide by zero")
    return a / b
```

Run: all three tests green.

### REFACTOR

Extract the guard, add a docstring, rename the file. Re-run after each change. Done.

## Anti-Patterns to Reject

- **Batch-writing tests first** without flipping each to green between them. Kills the RED signal and invites big-bang implementations.
- **Skipping TRIANGULATE** with "it's obvious what the code should be". The hardcode survives. Two examples is the minimum for responsible generalization.
- **Refactoring during GREEN**. Mixes two intents in one phase and corrupts the evidence that the minimal code passed.
- **Committing per-gate** instead of per-cycle. One cycle = one commit, message references the behavior, not the phase.
- **Ignoring the baseline**. A cycle that ends with fewer passing tests than it started with is a failed cycle, no matter how green the new ones look.
- **Writing the assertion last**. Start the test with the `assert` — it forces you to know what you are verifying before you invent the setup.

## Integration with Claude Code

- Sub-agent `sdd-apply` invokes this skill **before** writing any production code. Its Result Contract must include `tdd_cycles_completed: <n>` and `baseline_delta: { tests: +N, coverage: +X% }`.
- Slash command `/tdd <feature>` activates the flow: reads the feature request, drafts the first RED test, waits for confirmation of the failure output, proceeds.
- Post-tool-dispatcher hook detects writes to production files without matching writes to test files in the same turn and raises a warning: `strict-tdd violation: production code without failing test`.
- The `judgment-day` skill pairs well — it reviews the diff and the test evidence together, catching missing triangulation.

## Handoff Checklist

Before declaring a TDD cycle done:

- [ ] Baseline captured before the cycle
- [ ] Every new test was seen to fail before it was seen to pass
- [ ] At least two tests exercise each new behavior (or explicit justification for only one)
- [ ] Full suite green
- [ ] Coverage ≥ baseline
- [ ] Commit message quotes the RED output for one representative cycle
- [ ] No production code added without a corresponding test change in the same diff
