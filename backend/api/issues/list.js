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

// GET /api/issues/list
module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    try {
        const owner = process.env.GITHUB_OWNER;
        const repo = process.env.GITHUB_REPO;

        if (!owner || !repo) {
            return res.status(500).json({ error: 'GITHUB_OWNER or GITHUB_REPO not set' });
        }

        const octokit = await getOctokit(owner);

        const data = await octokit.paginate(octokit.rest.issues.listForRepo, {
            owner, repo,
            state: 'all',
            per_page: 100,
        });

        const issues = data.map(issue => {
            const body = issue.body || '';
            let extractedText = '';
            const textMatch = body.match(/\*\*Selected (?:Text|text):\*\*\n>\s*(.*)/);
            const contextMatch = body.match(/\*\*Selected (?:Context|context):\*\*\n>\s*(.*)/);
            const imageMatch = body.match(/\*\*Selected (?:Image|image):\*\*\n\s*(.*)/);

            const urlMatch = body.match(/(?:\*\*URL:\*\*|URL:)[\s\r\n]*(http[^\s]+)/i);
            const pageUrl = urlMatch ? urlMatch[1].trim() : '';

            if (textMatch) {
                extractedText = textMatch[1].trim();
            } else if (contextMatch) {
                extractedText = contextMatch[1].trim();
            } else if (imageMatch) {
                extractedText = imageMatch[1].trim();
            }

            // Clean up description before sending to UI to avoid displaying metadata
            let cleanBody = body;
            const descMatch = cleanBody.match(/\*\*Description:\*\*\s*\r?\n([\s\S]*?)(?=\n\n\*\*Selected|$)/i);
            if (descMatch) {
                cleanBody = descMatch[1].trim();
            } else {
                let temp = cleanBody.split('**Selected Context:**')[0]
                    .split('**Selected Image:**')[0]
                    .split('**Selected Text:**')[0]
                    .split('**URL:**')[0]
                    .split('URL:')[0].trim();
                cleanBody = temp.replace(/\*\*Description:\*\*\s*/i, '').trim();
            }

            return {
                id: `issue-${issue.id}`,
                issueNumber: issue.number,
                title: issue.title,
                body: cleanBody,
                url: issue.html_url,
                pageUrl: pageUrl,
                selectedText: extractedText || 'No direct text reference',
                state: (issue.state || 'open').toLowerCase(),
                isPullRequest: !!issue.pull_request
            };
        });


        res.status(200).json({ issues });
    } catch (error) {
        console.error('List Error:', error.message);
        res.status(500).json({ error: error.message || 'Failed to list issues' });
    }
};
