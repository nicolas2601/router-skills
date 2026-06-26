# Fetch Diff Subagent

Gather change details, save the diff to a file, and return structured information about the change. The task description must only be derived from: PR description, PR comments, commit messages, and committed `.md` files. Never infer the description from code changes.

## Variables

- `{TEMP_DIR}` — the OS temporary directory (e.g. `/tmp` on Unix, `%TEMP%` on Windows). Use it for all intermediate files.

## Inputs

You will receive:
- **Mode**: either "PR mode" (with owner, repo, PR number) or "Local mode"

## Workflow

### Step 1: Gather change details and save diff

#### PR mode

1. Fetch PR metadata:
   ```bash
   gh pr view <PR_NUMBER> --repo <OWNER>/<REPO> --json title,body,commits,headRefName,headRefOid,baseRefName,additions,deletions,changedFiles,files,comments
   ```

2. Checkout the correct branch. Try the following strategies in order until one succeeds:

   a. **`gh pr checkout`** (preferred):
      ```bash
      gh pr checkout <PR_NUMBER> --repo <OWNER>/<REPO>
      ```

   b. **Fetch by branch name** (if `gh pr checkout` fails):
      ```bash
      git fetch origin <headRefName> && git checkout <headRefName> && git pull origin <headRefName>
      ```

   c. **Fetch by commit SHA** (if the branch was deleted or renamed):
      ```bash
      git fetch origin <headRefOid> && git checkout <headRefOid>
      ```

   If all strategies fail, include an error in your response.

3. Extract the task description from the following sources only (never infer from code):
   - **PR description**: Read the PR body for requirements, acceptance criteria, and context.
   - **PR comments**: Check PR comments for additional context, clarifications, or updated requirements:
     ```bash
     gh pr view <PR_NUMBER> --repo <OWNER>/<REPO> --json comments,reviews,reviewRequests
     ```
   - **Commit messages**: Look at commit messages for additional intent details:
     ```bash
     gh pr view <PR_NUMBER> --repo <OWNER>/<REPO> --json commits
     ```
   - **Committed `.md` files**: Check the list of changed files from PR metadata. If any `.md` files are present, read their full committed contents as they may contain requirements or design docs.
   - Combine the PR description, PR comments, commit messages, and any committed `.md` files into a comprehensive task description. Do not supplement with information inferred from the code diff.

4. Save the diff:
   ```bash
   gh pr diff <PR_NUMBER> --repo <OWNER>/<REPO> > {TEMP_DIR}/review-diff-<branch-name>.patch
   ```

#### Local mode

1. Detect the current branch and its merge base:
   ```bash
   CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
   BASE_BRANCH=$(git log --oneline --merges --ancestry-path HEAD..$(git remote show origin | grep 'HEAD branch' | awk '{print $NF}') 2>/dev/null | tail -1 | cut -d' ' -f1 || echo "main")
   ```
   If detecting the base branch fails, try common defaults (`main`, `master`, `develop`).

2. Generate a combined diff:
   ```bash
   MERGE_BASE=$(git merge-base HEAD origin/<BASE_BRANCH>)
   git diff $MERGE_BASE HEAD > {TEMP_DIR}/review-diff-committed-<branch-name>.patch
   git diff > {TEMP_DIR}/review-diff-uncommitted-<branch-name>.patch
   cat {TEMP_DIR}/review-diff-committed-<branch-name>.patch {TEMP_DIR}/review-diff-uncommitted-<branch-name>.patch > {TEMP_DIR}/review-diff-<branch-name>.patch
   ```

3. Gather task description from commit messages on the branch (do not infer from code):
   ```bash
   git log --format="%s%n%b" $MERGE_BASE..HEAD
   ```

### Step 2: Check for requirements in committed `.md` files

Look at the list of changed files. If any `.md` files are present in the diff, read their full committed contents as they may contain requirements or design docs that are part of the task description.

### Step 3: Assess complexity

Evaluate the PR complexity based on the diff and metadata gathered above. **Only consider changes to production/implementation code** — documentation files (e.g., `*.md`) when counting lines changed and files changed. Classify as one of:

- **simple**: Small, focused change. Typically ≤ 100 lines of implementation code changed across ≤ 3 non-doc files, single concern (e.g., bug fix, config tweak, copy change, dependency bump, simple refactor).
- **medium**: Moderate change. Typically 100–500 lines of implementation code changed or 4–10 non-doc files, may touch multiple modules but follows a clear pattern (e.g., adding a new endpoint, refactoring a module, implementing a straightforward feature).
- **hard**: Large or complex change. Typically > 500 lines of implementation code changed or > 10 non-doc files, or involves architectural changes, cross-cutting concerns, new subsystems, complex business logic, security-sensitive code, or significant API surface changes. Any change that is hard to reason about or has high blast radius.

Increase complexity one level if any of the following apply, or two levels if multiple apply:

- **New subsystem or framework**: Adds a coherent new module spanning multiple architectural layers (not just modifying existing files)
- **Security-critical paths**: Touches authentication, authorization, token management, OAuth/OIDC, cryptography, or access control
- **Shared infrastructure + new dependents**: Modifies shared code (base classes, utilities, middleware) AND adds new code depending on those modifications
- **Concurrency primitives**: Introduces or modifies threads, locks, queues, atomic operations, or async concurrency patterns
- **Cross-file API contract dependencies**: Correctness depends on implicit contracts with non-diff code (e.g., key lookups, registry patterns, framework conventions)
- **Feature flag / version guard consistency**: Adds conditional guards that must stay consistent with existing guards elsewhere in the codebase
- **Multi-domain / cross-cutting scope**: Changes span many distinct product domains or subsystem directories, especially if broader than the PR title suggests
- **Interface or abstract contract changes**: Modifies shared interfaces, abstract classes, or base methods with multiple implementations — especially when not all implementations are updated
- **API response or error contract mutations**: Modifies existing response structures, status codes, or content types in endpoint handlers or serializers

## Required Output

Return the following structured information:

1. **Diff file path**: The absolute path to the saved diff file (e.g., `{TEMP_DIR}/review-diff-<branch-name>.patch`). MUST be an absolute path starting with `/`.
2. **Diff line count**: The total number of lines in the diff file. After saving the diff, run `wc -l < <diff-file-path>` to get this count.
3. **Title**: The PR title (PR mode) or a summary derived from commit messages (local mode)
4. **Description**: A comprehensive task description derived only from the PR description, PR comments, commit messages, and committed `.md` files. Never infer or supplement the description from the code diff. This should be thorough enough for reviewers to understand the full intent of the change.
5. **Complexity**: One of `simple`, `medium`, or `hard`

Format your response exactly as:

```
## <title>

### Description
<task description>

### Complexity
<simple|medium|hard>

### Diff
<absolute path to the diff file, e.g. {TEMP_DIR}/review-diff-feature.patch>

### Diff Line Count
<total number of lines in the diff file>
```
