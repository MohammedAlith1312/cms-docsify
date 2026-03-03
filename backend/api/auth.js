const express = require("express");
const router = express.Router();

const GITHUB_CLIENT_ID = process.env.GITHUB_APP_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_APP_CLIENT_SECRET;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;

// Determine frontend URL based on environment
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5000";

// Shared GitHub App helper
const { getOctokit } = require("./github");

/**
 * Check if a GitHub user is a collaborator on the configured repo.
 * Uses the GitHub App's installation token (has repo access) to call
 * GET /repos/{owner}/{repo}/collaborators/{username}
 * Returns true (204) if collaborator, false (404) if not.
 */
async function isRepoCollaborator(username) {
    try {
        const octokit = await getOctokit(GITHUB_OWNER);
        const res = await octokit.rest.repos.checkCollaborator({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            username,
        });
        // 204 = is a collaborator
        return res.status === 204;
    } catch (err) {
        // 404 = not a collaborator, anything else = error
        if (err.status === 404) return false;
        console.error("Auth: Collaborator check error:", err.message);
        return false;
    }
}

// 1. Redirect user to GitHub OAuth
router.get("/login", (req, res) => {
    // Detect protocol properly when behind Render's proxy
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const redirectUri = `${protocol}://${req.get("host")}/api/auth/callback`;

    // Request full 'repo' scope so the user can create and comment on issues directly
    const scope = "repo read:user user:email";
    const githubAuthUrl =
        `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;

    console.log(`Auth: Redirecting to GitHub OAuth with URI: ${redirectUri}`);
    res.redirect(githubAuthUrl);
});

// 2. GitHub OAuth callback — exchange code for token, check collaborator, redirect
router.get("/callback", async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.redirect(`${FRONTEND_URL}/login.html?auth_error=no_code`);
    }

    try {
        // Exchange the code for an access token
        const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                code,
            }),
        });

        const tokenData = await tokenRes.json();

        if (tokenData.error) {
            console.error("Auth: Token exchange failed:", tokenData.error_description);
            return res.redirect(`${FRONTEND_URL}/login.html?auth_error=${tokenData.error}`);
        }

        const accessToken = tokenData.access_token;

        // Fetch the user's profile
        const userRes = await fetch("https://api.github.com/user", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/vnd.github.v3+json",
            },
        });

        const user = await userRes.json();

        console.log(`Auth: User attempting login — ${user.login} (${user.name || "No name"})`);

        // ── COLLABORATOR CHECK ──────────────────────────────────
        // Only allow users who are collaborators on the repo
        const isAuthorized = await isRepoCollaborator(user.login);

        if (!isAuthorized) {
            console.warn(`Auth: ACCESS DENIED — ${user.login} is not a collaborator on ${GITHUB_OWNER}/${GITHUB_REPO}`);
            return res.redirect(`${FRONTEND_URL}/login.html?auth_error=unauthorized`);
        }

        console.log(`Auth: ACCESS GRANTED — ${user.login} is a collaborator`);

        // Redirect back to frontend with token and basic user info
        const params = new URLSearchParams({
            access_token: accessToken,
            login: user.login,
            name: user.name || user.login,
            avatar_url: user.avatar_url,
        });

        res.redirect(`${FRONTEND_URL}?${params.toString()}`);
    } catch (error) {
        console.error("Auth: Callback error:", error.message);
        res.redirect(`${FRONTEND_URL}/login.html?auth_error=server_error`);
    }
});

// 3. Get user info from token (frontend can call this to verify/refresh)
router.get("/user", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const userRes = await fetch("https://api.github.com/user", {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3+json",
            },
        });

        if (!userRes.ok) {
            return res.status(401).json({ error: "Invalid token" });
        }

        const user = await userRes.json();
        res.json({
            login: user.login,
            name: user.name || user.login,
            avatar_url: user.avatar_url,
            html_url: user.html_url,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
