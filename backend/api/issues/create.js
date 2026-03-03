const { App } = require('octokit');

async function getOctokit(owner) {
    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

    if (!appId || !privateKey) {
        throw new Error('Missing GITHUB_APP_ID or GITHUB_APP_PRIVATE_KEY');
    }

    const normalizedKey = privateKey.replace(/\\n/g, '\n').trim();

    const githubApp = new App({
        appId: parseInt(appId, 10),
        privateKey: normalizedKey,
    });

    const { data: installations } = await githubApp.octokit.rest.apps.listInstallations();

    let targetInstallId;
    if (owner) {
        const match = installations.find(i => i.account?.login === owner);
        if (match) targetInstallId = match.id;
    }
    if (!targetInstallId && installations.length > 0) {
        targetInstallId = installations[0].id;
    }
    if (!targetInstallId) {
        throw new Error('No GitHub App installation found');
    }

    return await githubApp.getInstallationOctokit(targetInstallId);
}

// POST /api/issues/create
module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    try {
        const { title, body } = req.body;
        if (!title || !body) {
            return res.status(400).json({ error: 'Missing title or body' });
        }

        const owner = process.env.GITHUB_OWNER;
        const repo = process.env.GITHUB_REPO;
        if (!owner || !repo) {
            return res.status(500).json({ error: 'GITHUB_OWNER or GITHUB_REPO not set' });
        }

        const octokit = await getOctokit(owner);
        const response = await octokit.rest.issues.create({ owner, repo, title, body });

        res.status(200).json({
            success: true,
            url: response.data.html_url,
            number: response.data.number,
        });
    } catch (error) {
        console.error('Create Error:', error.message);
        res.status(500).json({ error: error.message || 'Failed to create issue' });
    }
};
