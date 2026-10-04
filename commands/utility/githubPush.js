/**
 * utils/githubPush.js
 * NEXUS BOT V1 — Push files to GitHub via API
 * © 2026
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const GITHUB_API = "https://api.github.com";

/* ═══ Get config from env ═══ */
function getConfig() {
  return {
    token: process.env.GITHUB_TOKEN,
    repo: process.env.GITHUB_REPO,
    branch: process.env.GITHUB_BRANCH || "main"
  };
}

/* ═══ Check if configured ═══ */
function isConfigured() {
  const { token, repo } = getConfig();
  return !!(token && repo);
}

/* ═══ Get file SHA (for update) ═══ */
async function getFileSHA(filePath) {
  const { token, repo, branch } = getConfig();
  if (!token || !repo) return null;

  try {
    const r = await axios.get(
      `${GITHUB_API}/repos/${repo}/contents/${filePath}`,
      {
        params: { ref: branch },
        headers: {
          "Authorization": `token ${token}`,
          "User-Agent": "Nexus-Bot",
          "Accept": "application/vnd.github.v3+json"
        },
        timeout: 15000
      }
    );
    return r.data.sha;
  } catch (e) {
    if (e.response && e.response.status === 404) return null;
    throw e;
  }
}

/* ═══ Push a single file to GitHub ═══ */
async function pushFile(filePath, content, commitMsg) {
  const { token, repo, branch } = getConfig();

  if (!token || !repo) {
    return { success: false, reason: "GitHub not configured" };
  }

  /* Normalize path (remove leading slash, backslash) */
  const cleanPath = filePath.replace(/\\/g, "/").replace(/^\/+/, "");

  const apiUrl = `${GITHUB_API}/repos/${repo}/contents/${cleanPath}`;

  try {
    /* Check if file exists (for SHA) */
    const sha = await getFileSHA(cleanPath);

    /* Prepare body */
    const body = {
      message: commitMsg || `[bot] Update ${cleanPath}`,
      content: Buffer.from(content).toString("base64"),
      branch: branch
    };
    if (sha) body.sha = sha;

    /* Push */
    const r = await axios.put(apiUrl, body, {
      headers: {
        "Authorization": `token ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "Nexus-Bot",
        "Accept": "application/vnd.github.v3+json"
      },
      timeout: 30000
    });

    return {
      success: true,
      action: sha ? "updated" : "created",
      sha: r.data.commit.sha,
      url: r.data.content.html_url
    };

  } catch (e) {
    const errMsg = e.response?.data?.message || e.message;
    console.error(`[githubPush] ${cleanPath} failed: ${errMsg}`);
    return { success: false, reason: errMsg };
  }
}

/* ═══ Delete a file from GitHub ═══ */
async function deleteFile(filePath, commitMsg) {
  const { token, repo, branch } = getConfig();

  if (!token || !repo) {
    return { success: false, reason: "GitHub not configured" };
  }

  const cleanPath = filePath.replace(/\\/g, "/").replace(/^\/+/, "");

  try {
    const sha = await getFileSHA(cleanPath);
    if (!sha) return { success: false, reason: "File not found on GitHub" };

    const r = await axios.delete(
      `${GITHUB_API}/repos/${repo}/contents/${cleanPath}`,
      {
        data: {
          message: commitMsg || `[bot] Delete ${cleanPath}`,
          sha: sha,
          branch: branch
        },
        headers: {
          "Authorization": `token ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "Nexus-Bot",
          "Accept": "application/vnd.github.v3+json"
        },
        timeout: 30000
      }
    );

    return { success: true, sha: r.data.commit.sha };

  } catch (e) {
    const errMsg = e.response?.data?.message || e.message;
    console.error(`[githubPush] delete ${cleanPath} failed: ${errMsg}`);
    return { success: false, reason: errMsg };
  }
}

/* ═══ Push multiple files at once ═══ */
async function pushMultiple(files, commitMsg) {
  /* files: [{ path, content }, ...] */
  const results = [];

  for (const file of files) {
    const r = await pushFile(file.path, file.content, commitMsg);
    results.push({ path: file.path, ...r });
  }

  return results;
}

/* ═══ Test connection ═══ */
async function testConnection() {
  const { token, repo } = getConfig();
  if (!token || !repo) return { success: false, reason: "Not configured" };

  try {
    const r = await axios.get(`${GITHUB_API}/repos/${repo}`, {
      headers: {
        "Authorization": `token ${token}`,
        "User-Agent": "Nexus-Bot"
      },
      timeout: 10000
    });

    return {
      success: true,
      repo: r.data.full_name,
      private: r.data.private,
      default_branch: r.data.default_branch
    };
  } catch (e) {
    return { success: false, reason: e.response?.data?.message || e.message };
  }
}

module.exports = {
  isConfigured,
  pushFile,
  deleteFile,
  pushMultiple,
  testConnection,
  getFileSHA
};

// © 2026 NEXUS BOT V1
