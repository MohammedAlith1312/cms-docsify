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

// POST /api/issues/close
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
        const { number } = req.body;
        if (!number) {
            return res.status(400).json({ error: 'Missing issue number' });
        }

        const owner = process.env.GITHUB_OWNER;
        const repo = process.env.GITHUB_REPO;

        const octokit = await getOctokit(owner);
        await octokit.rest.issues.update({
            owner, repo,
            issue_number: number,
            state: 'closed',
        });

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Close Error:', error.message);
        res.status(500).json({ error: error.message || 'Failed to close issue' });
    }
};
