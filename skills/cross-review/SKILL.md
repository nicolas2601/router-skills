---
name: cross-review
description: "Cross review code using a subagent with a specified model. Use when the user asks to review code changes AND specifies a model to use (e.g., 'review with opus', 'use sonnet to review', 'review changes with gemini'). The key differentiator from the regular code-review skill is that the user explicitly specifies which model should perform the review. The root agent reconstructs what changed from its own conversation history — no git commands are used."
metadata:
  version: 1.0.0
---

# Cross Review

Reconstruct what you changed during this conversation, then delegate the actual review to a single subagent running the `code-review` skill with a user-specified model.

IMPORTANT: Steps 1–2 run in the current agent (the master). Only Step 3 spawns a subagent. Do NOT spawn a subagent to execute this skill's workflow — that creates unnecessary nesting.

## Expected Prompt Format

```
Use review skill with <model-id> model to review the changes. Review instructions: <instructions>
```

## Workflow

### Step 1: Parse the user request

Extract from the user's prompt:
- **Model**: The model ID to use for the subagent. Validate against the available models.
- **Review instructions**: Any text after "Review instructions:" — pass these verbatim to the subagent.
- **Change scope**: Any indication of what should be reviewed. If not provided, default to reviewing all changes made by you during this conversation.

### Step 2: Gather context from your own changes

Collect all information the review subagent will need. Do this in the current agent — do NOT delegate this step.

You already know what you changed — reconstruct the diff from your own conversation history:

1. **Reconstruct the changes**: Compose a unified diff-style summary of all changes you made by Edit, Write, Bash, and other tools you called during this conversation. Group changes by file.

   **If no changes were made**: Inform the user that no changes were found in this conversation and stop.

2. **Read the final state of changed files** to provide full surrounding context. Use the Read tool on each changed file.

3. **Check for related context**:
   - Read test files related to the changed files, prioritizing nearby paths and excluding dependency/vendor directories (e.g., `node_modules`, `.git`, `dist`, `build`, `coverage`)
   - Check for configuration changes that may affect behavior
   - Note any related type definitions or interfaces

Do NOT show gathered context or its process to the user. Use it only for the subagent.

### Step 3: Spawn the review subagent

Use `spawn_subagent` with:
- **skill**: `"code-review"`
- **model**: The model extracted from the user's request.
- **prompt**: use following template

```
Review the changes below using "code-review" skill.

IMPORTANT CONSTRAINTS:
- Do NOT edit, write, or execute any commands that modify files. This is a read-only review.
- All necessary context is provided below. Read files only if provided context is clearly incomplete.
- Review the changes independently and objectively. Do not assume the changes are correct.

## Review Instructions

{user's review instructions, verbatim}

## Changes

{reconstructed diff or before/after summary of all changes, grouped by file}

## Full File Contents

{Do NOT include full file contents as subagent can read them if needed}

## Additional Context

{links to any related files, test files, type definitions, or user-provided requirements}
```

### Step 4: Relay the result — READ-ONLY, NO ACTIONS

CRITICAL: Your ONLY job in this step is to relay the subagent's review output to the user exactly as received. You MUST:

- **Output the review AS-IS**: Copy the subagent's response verbatim. Do NOT summarize, rephrase, reorder, filter, or editorialize the review in any way.
- **Do NOT act on the review**: Do NOT fix, improve, refactor, or otherwise modify any code based on the review findings. Do NOT open files to make corrections. Do NOT run any commands to address issues raised.
- **Do NOT add your own commentary on the findings**: Do not agree/disagree with findings, add caveats, or append your own analysis. A one-line model attribution (e.g., "Review produced by opus-4-6-think") is acceptable, but nothing more.

You can ONLY suggest or offer to implement any of the review's recommendations. Let the user decide what to do next.

## Error Handling

- **`spawn_subagent` fails or times out**: Inform the user of the failure. Suggest retrying or using a different model.
- **No changes in conversation**: Inform the user no changes were found and stop.
- **Subagent returns an error or incomplete review**: Relay whatever was returned and note that the review may be incomplete.
