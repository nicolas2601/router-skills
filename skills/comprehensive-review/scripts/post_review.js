#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const HUNK_HEADER_RE = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;
const MAX_LINE_DISTANCE = 5;
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 1000;

const REDACT_PATTERNS = [
  /Bearer\s+\S+/gi,
  /token\s+\S+/gi,
  /ghp_[A-Za-z0-9_]+/g,
  /gho_[A-Za-z0-9_]+/g,
  /ghs_[A-Za-z0-9_]+/g,
  /ghr_[A-Za-z0-9_]+/g,
  /ghu_[A-Za-z0-9_]+/g,
  /github_pat_[A-Za-z0-9_]+/g,
  /Authorization:[^\n]*/gi,
];

function redact(text) {
  return REDACT_PATTERNS.reduce((s, re) => s.replace(re, "[REDACTED]"), text);
}

function log(msg) {
  console.log(redact(String(msg)));
}

function logError(msg) {
  process.stderr.write(redact(String(msg)) + "\n");
}

function stripDiffPath(p) {
  if (p === "/dev/null" || p === "") return p;
  if (p.startsWith("a/") || p.startsWith("b/")) return p.slice(2);
  return p;
}

function parseUnifiedDiff(diffText) {
  const files = [];
  let currentOldPath = "";
  let currentNewPath = "";
  let currentFileKey = "";
  let currentHunks = [];

  function flush() {
    if (!currentFileKey) return;
    const oldPath = currentOldPath;
    const newPath = currentNewPath;
    let status = "modified";
    if (oldPath === "/dev/null" && newPath !== "/dev/null") status = "added";
    else if (oldPath !== "/dev/null" && newPath === "/dev/null") status = "deleted";
    else if (oldPath !== newPath) status = "renamed";
    files.push({ path: currentFileKey, status, hunks: currentHunks });
    currentOldPath = "";
    currentNewPath = "";
    currentFileKey = "";
    currentHunks = [];
  }

  for (const rawLine of diffText.split("\n")) {
    const line = rawLine.replace(/\r$/, "");

    if (line.startsWith("diff --git ")) {
      flush();
      const gitDiffMatch = line.match(/^diff --git (a\/.+) (b\/.+)$/);
      if (gitDiffMatch) {
        currentOldPath = stripDiffPath(gitDiffMatch[1]);
        currentNewPath = stripDiffPath(gitDiffMatch[2]);
        currentFileKey = currentNewPath;
      } else {
        currentOldPath = "";
        currentNewPath = "";
        currentFileKey = "";
      }
      currentHunks = [];
      continue;
    }

    if (line.startsWith("--- ")) {
      currentOldPath = stripDiffPath(line.slice(4).trim());
      continue;
    }

    if (line.startsWith("+++ ")) {
      currentNewPath = stripDiffPath(line.slice(4).trim());
      currentFileKey = currentNewPath !== "/dev/null" ? currentNewPath : currentOldPath;
      continue;
    }

    const match = line.match(HUNK_HEADER_RE);
    if (match) {
      currentHunks.push({
        old_start: parseInt(match[1], 10),
        old_count: parseInt(match[2] ?? "1", 10),
        new_start: parseInt(match[3], 10),
        new_count: parseInt(match[4] ?? "1", 10),
      });
      continue;
    }
  }

  flush();
  return files;
}

function isLineInHunk(hunk, line, side) {
  if (side === "LEFT") {
    return line >= hunk.old_start && line < hunk.old_start + hunk.old_count;
  }
  return line >= hunk.new_start && line < hunk.new_start + hunk.new_count;
}

function findNearestValidLine(hunks, line, side) {
  let bestLine = null;
  let bestDist = Infinity;

  for (const hunk of hunks) {
    const count = side === "LEFT" ? hunk.old_count : hunk.new_count;
    const hunkStart = side === "LEFT" ? hunk.old_start : hunk.new_start;
    if (count === 0) continue;

    const hunkEnd = hunkStart + count - 1;

    if (isLineInHunk(hunk, line, side)) {
      return { line, distance: 0 };
    }

    if (line < hunkStart) {
      const dist = hunkStart - line;
      if (dist < bestDist) {
        bestDist = dist;
        bestLine = hunkStart;
      }
    } else if (line > hunkEnd) {
      const dist = line - hunkEnd;
      if (dist < bestDist) {
        bestDist = dist;
        bestLine = hunkEnd;
      }
    }
  }

  if (bestLine !== null) {
    return { line: bestLine, distance: bestDist };
  }
  return null;
}

function adjustComments(payload, hunkMap) {
  const fileMap = new Map();
  for (const f of hunkMap) {
    fileMap.set(f.path, f);
  }

  const validComments = [];
  const bodyFindings = [];
  let adjustedCount = 0;

  for (const comment of payload.comments || []) {
    const fileEntry = fileMap.get(comment.path);

    if (!fileEntry || fileEntry.hunks.length === 0) {
      bodyFindings.push(comment);
      continue;
    }

    const side = comment.side || "RIGHT";
    const normalizedComment = { ...comment, side };
    const nearest = findNearestValidLine(fileEntry.hunks, normalizedComment.line, side);

    if (!nearest) {
      bodyFindings.push(normalizedComment);
      continue;
    }

    if (nearest.distance === 0) {
      validComments.push(normalizedComment);
    } else if (nearest.distance <= MAX_LINE_DISTANCE) {
      adjustedCount++;
      validComments.push({
        ...normalizedComment,
        line: nearest.line,
        body: `> _Original location: line ${normalizedComment.line} (adjusted to nearest diff line)_\n\n${normalizedComment.body}`,
      });
    } else {
      bodyFindings.push(normalizedComment);
    }
  }

  return { validComments, bodyFindings, adjustedCount };
}

function formatBodyFindings(existingBody, bodyFindings) {
  if (bodyFindings.length === 0) return existingBody;

  let extra = "\n\n---\n\n### Findings outside diff range\n\n";
  for (const f of bodyFindings) {
    extra += `#### ${f.path}:${f.line}\n\n${f.body}\n\n`;
  }

  return (existingBody || "") + extra;
}

function buildFallbackPayload(payload) {
  const allComments = payload.comments || [];
  let body = payload.body || "";

  if (allComments.length > 0) {
    body += "\n\n---\n\n### Inline findings (could not post as line comments)\n\n";
    for (const c of allComments) {
      body += `#### ${c.path}:${c.line}\n\n${c.body}\n\n`;
    }
  }

  return { event: payload.event || "COMMENT", body, comments: [] };
}

function ghApi(endpoint, method, inputFile) {
  const args = ["api", endpoint, "--method", method, "--input", inputFile];
  const result = execFileSync("gh", args, {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
    timeout: 60000,
  });
  return result;
}

function parseApiError(err) {
  let jsonBody = null;
  if (err.stdout) {
    try {
      jsonBody = JSON.parse(err.stdout);
    } catch (_) {}
  }

  let httpStatus = null;
  let apiResponseMessage = null;

  if (jsonBody && jsonBody.status != null) {
    const parsed = parseInt(jsonBody.status, 10);
    if (!isNaN(parsed)) httpStatus = parsed;

    const msgParts = [];
    if (jsonBody.message) msgParts.push(jsonBody.message);
    const errors = Array.isArray(jsonBody.errors) ? jsonBody.errors : [];
    for (const e of errors) {
      const text = typeof e === "string" ? e : (e && e.message ? e.message : "");
      if (text) msgParts.push(text);
    }
    if (msgParts.length > 0) apiResponseMessage = msgParts.join(": ");
  }

  if (httpStatus === null) {
    for (const text of [err.stderr, err.message]) {
      if (!text) continue;
      const match = text.match(/HTTP (\d{3})/i);
      if (match) {
        httpStatus = parseInt(match[1], 10);
        break;
      }
    }
  }

  if (!apiResponseMessage) {
    const parts = [];
    if (err.message) parts.push(`message: ${err.message}`);
    if (err.stdout) parts.push(`stdout: ${err.stdout}`);
    if (err.stderr) parts.push(`stderr: ${err.stderr}`);
    apiResponseMessage = parts.join("\n\n") || "unknown error";
  }

  return { httpStatus, apiResponseMessage, jsonBody };
}

function extractHttpStatus(err) {
  return parseApiError(err).httpStatus;
}

function isRecoverableError(err) {
  const { httpStatus, apiResponseMessage } = parseApiError(err);
  if (httpStatus !== null && (httpStatus >= 500 || httpStatus === 429)) return true;
  const msg = (apiResponseMessage || "").toLowerCase();
  if (msg.includes("econnreset") || msg.includes("etimedout") || msg.includes("econnrefused")) return true;
  if (msg.includes("socket hang up") || msg.includes("network error") || msg.includes("networkerror")) return true;
  return false;
}

function is422LineError(err) {
  const { httpStatus, apiResponseMessage } = parseApiError(err);
  if (httpStatus !== 422) return false;
  return (apiResponseMessage || "").toLowerCase().includes("line could not be resolved");
}

class LineResolutionError extends Error {
  constructor(message) {
    super(message);
    this.name = "LineResolutionError";
  }
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function logApiError(err, context) {
  const info = {
    context,
    message: err.message ?? undefined,
    stdout: err.stdout ?? undefined,
    stderr: err.stderr ?? undefined,
    status: err.status ?? undefined,
  };
  logError(JSON.stringify(info));
}

function postWithRetry(endpoint, payloadFile, _api, _sleep) {
  _api = _api || ghApi;
  _sleep = _sleep || sleep;
  let lastErr;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return _api(endpoint, "POST", payloadFile);
    } catch (err) {
      lastErr = err;
      logApiError(err, `POST ${endpoint} attempt ${attempt + 1}/${MAX_RETRIES}`);

      if (is422LineError(err)) {
        const errOutput = err.stderr || err.stdout || err.message || "";
        throw new LineResolutionError(errOutput);
      }

      if (!isRecoverableError(err)) {
        throw err;
      }

      if (attempt < MAX_RETRIES - 1) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        log(`  Retrying in ${backoff}ms...`);
        _sleep(backoff);
      }
    }
  }
  throw lastErr || new Error("Max retries exceeded");
}

function submitPendingReview(endpoint, response, _api) {
  _api = _api || ghApi;
  let parsed;
  try {
    parsed = JSON.parse(response);
  } catch (_) {
    return response;
  }

  if (parsed.state !== "PENDING" || !parsed.id) {
    return response;
  }

  const submitEndpoint = `${endpoint}/${parsed.id}/events`;
  const tmpFile = path.join(os.tmpdir(), `review_submit_${crypto.randomBytes(6).toString("hex")}.json`);
  try {
    fs.writeFileSync(tmpFile, JSON.stringify({ event: "COMMENT" }));
    return postWithRetry(submitEndpoint, tmpFile, _api);
  } catch (e) {
    logApiError(e, "submit PENDING review");
    logError("Error: failed to submit PENDING review — review may not be visible");
    throw e;
  } finally {
    try { fs.unlinkSync(tmpFile); } catch (_) {}
  }
}

function parseArgs(args) {
  if (args.length < 4 || args.includes("--help") || args.includes("-h")) {
    logError(
      "Usage: node post_review.js <OWNER/REPO> <PR_NUMBER> <diff-file-path> <payload-file-path>\n\n" +
      "Reads review JSON from the payload file, validates comment lines against the diff,\n" +
      "and posts the review via the GitHub API. Rewrites the payload file if needed."
    );
    process.exit(args.includes("--help") || args.includes("-h") ? 0 : 1);
  }

  const ownerRepo = args[0];
  const prNumber = args[1];

  if (!/^[\w.-]+\/[\w.-]+$/.test(ownerRepo)) {
    logError(`Error: invalid OWNER/REPO format: ${ownerRepo}`);
    process.exit(1);
  }

  if (!/^\d+$/.test(prNumber)) {
    logError(`Error: PR_NUMBER must be a positive integer: ${prNumber}`);
    process.exit(1);
  }

  const diffFilePath = path.resolve(args[2]);
  const payloadFilePath = path.resolve(args[3]);

  if (!fs.existsSync(diffFilePath)) {
    logError(`Error: diff file not found: ${diffFilePath}`);
    process.exit(1);
  }

  if (!fs.existsSync(payloadFilePath)) {
    logError(`Error: payload file not found: ${payloadFilePath}`);
    process.exit(1);
  }

  return { ownerRepo, prNumber, diffFilePath, payloadFilePath };
}

function readPayload(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, "utf-8");
  } catch (e) {
    logError(`Error reading payload file: ${e.message}`);
    process.exit(1);
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    logError(`Error parsing payload JSON: ${e.message}`);
    process.exit(1);
  }
}

function postAndSubmit(endpoint, payloadFilePath, adjustedPayload, _api, _sleep) {
  try {
    const response = postWithRetry(endpoint, payloadFilePath, _api, _sleep);
    return submitPendingReview(endpoint, response, _api);
  } catch (err) {
    if (err instanceof LineResolutionError) {
      logError("Got 422 'Line could not be resolved'. Moving all comments to review body and retrying...");
      const fallbackPayload = buildFallbackPayload(adjustedPayload);
      fs.writeFileSync(payloadFilePath, JSON.stringify(fallbackPayload, null, 2));

      try {
        const fallbackResponse = postWithRetry(endpoint, payloadFilePath, _api, _sleep);
        return submitPendingReview(endpoint, fallbackResponse, _api);
      } catch (fallbackErr) {
        const wrappedErr = new Error("Review posting failed after fallback");
        wrappedErr.details = fallbackErr.message;
        throw wrappedErr;
      }
    }

    const wrappedErr = new Error("Review posting failed");
    wrappedErr.details = err.message;
    throw wrappedErr;
  }
}

function main() {
  const { ownerRepo, prNumber, diffFilePath, payloadFilePath } = parseArgs(process.argv.slice(2));
  const payload = readPayload(payloadFilePath);
  let diffText;
  try {
    diffText = fs.readFileSync(diffFilePath, "utf-8");
  } catch (e) {
    logError(`Error reading diff file: ${e.message}`);
    process.exit(1);
  }
  const hunkMap = parseUnifiedDiff(diffText);

  const { validComments, bodyFindings, adjustedCount } = adjustComments(payload, hunkMap);

  const adjustedPayload = {
    ...payload,
    comments: validComments,
    body: formatBodyFindings(payload.body, bodyFindings),
  };

  if (bodyFindings.length > 0) {
    log(`${bodyFindings.length} comment(s) moved to review body (outside diff range)`);
  }
  if (adjustedCount > 0) {
    log(`${adjustedCount} comment(s) had line numbers adjusted to nearest diff line`);
  }

  fs.writeFileSync(payloadFilePath, JSON.stringify(adjustedPayload, null, 2));

  const endpoint = `repos/${ownerRepo}/pulls/${prNumber}/reviews`;
  log(`Posting review with ${validComments.length} inline comment(s)...`);

  try {
    const finalResponse = postAndSubmit(endpoint, payloadFilePath, adjustedPayload);
    log(finalResponse);
    log("Review posted successfully");
    process.exit(0);
  } catch (e) {
    logError(JSON.stringify({ error: e.message, details: String(e.details || e.message) }));
    logError("Review posting failed");
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  redact,
  parseUnifiedDiff,
  isLineInHunk,
  findNearestValidLine,
  adjustComments,
  formatBodyFindings,
  buildFallbackPayload,
  parseApiError,
  is422LineError,
  isRecoverableError,
  extractHttpStatus,
  log,
  logError,
  logApiError,
  LineResolutionError,
  postWithRetry,
  submitPendingReview,
  postAndSubmit,
};
