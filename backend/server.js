const express = require("express");
const cors = require("cors");
const { App, Octokit } = require("octokit");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Shared GitHub App helper
const { getOctokit } = require("./api/github");

// Get a client for the logged-in user, falling back to the generic bot
async function getAuthClient(req, owner) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        return new Octokit({ auth: token });
    }
    // Fallback to bot if not logged in
    return await getOctokit(owner);
}

// Auth routes
const authRouter = require("./api/auth");
app.use("/api/auth", authRouter);



// 1. List Issues (All: Open & Closed)
app.get("/api/issues/list", async (req, res) => {
    try {
        const owner = process.env.GITHUB_OWNER;
        const repo = process.env.GITHUB_REPO;
        const octokit = await getAuthClient(req, owner);

        console.log(`TB: Fetching all issues for ${owner}/${repo}...`);

        const data = await octokit.paginate("GET /repos/{owner}/{repo}/issues", {
            owner,
            repo,
            state: 'all',
            per_page: 100
        });

        const issues = data
            .filter(i => !i.pull_request)
            .map(issue => {
                const body = issue.body || '';
                let extractedText = '';

                const contextMatch = body.match(/\*\*(?:Selected Context|Selected Text|Selected Image):\*\*\n(>\s*|)(.*)/i);
                if (contextMatch) {
                    extractedText = contextMatch[2].trim();
                } else {
                    if (body.includes('**Selected Text:**\n> ')) extractedText = body.split('**Selected Text:**\n> ')[1]?.split('\n')[0]?.trim();
                    else if (body.includes('**Selected Image:**\n')) extractedText = body.split('**Selected Image:**\n')[1]?.split('\n')[0]?.trim();
                }

                const urlMatch = body.match(/(?:\*\*URL:\*\*|URL:)[\s\r\n]*(http[^\s]+)/i);
                const pageUrl = urlMatch ? urlMatch[1].trim() : '';

                return {
                    id: `issue-${issue.id}`,
                    issueNumber: issue.number,
                    title: issue.title,
                    body: body,
                    url: issue.html_url,
                    pageUrl: pageUrl,
                    selectedText: extractedText || 'No direct text reference',
                    state: (issue.state || 'open').toLowerCase()
                };
            });

        res.json({ issues });
    } catch (error) {
        console.error("TB List Error:", error);
        res.status(500).json({ error: error.message || "Failed to list issues" });
    }
});

// 2. Create Issue
app.post("/api/issues/create", async (req, res) => {
    try {
        const { title, body } = req.body;
        const owner = process.env.GITHUB_OWNER;
        const repo = process.env.GITHUB_REPO;
        const octokit = await getAuthClient(req, owner);
        const response = await octokit.rest.issues.create({ owner, repo, title, body });
        res.json({ success: true, url: response.data.html_url, number: response.data.number });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// 3. Comment on Issue
app.post("/api/issues/comment", async (req, res) => {
    try {
        const { number, comment } = req.body;
        const owner = process.env.GITHUB_OWNER;
        const repo = process.env.GITHUB_REPO;
        const octokit = await getAuthClient(req, owner);
        const response = await octokit.rest.issues.createComment({ owner, repo, issue_number: number, body: comment });
        res.json({ success: true, data: response.data });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// 4. Close Issue
app.post("/api/issues/close", async (req, res) => {
    try {
        const { number } = req.body;
        const owner = process.env.GITHUB_OWNER;
        const repo = process.env.GITHUB_REPO;
        const octokit = await getAuthClient(req, owner);
        await octokit.rest.issues.update({ owner, repo, issue_number: number, state: "closed" });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// 5. Update Issue
app.post("/api/issues/update", async (req, res) => {
    try {
        const { number, title, body } = req.body;
        const owner = process.env.GITHUB_OWNER;
        const repo = process.env.GITHUB_REPO;
        const octokit = await getAuthClient(req, owner);
        const response = await octokit.rest.issues.update({ owner, repo, issue_number: number, title, body });
        res.json({ success: true, data: response.data });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
