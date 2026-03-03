const { App } = require("octokit");
const dotenv = require("dotenv");

dotenv.config();

// Helper to authenticate as GitHub App
async function getOctokit(owner) {
    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

    if (!appId || !privateKey) {
        throw new Error("Missing GitHub credentials (GITHUB_APP_ID or GITHUB_APP_PRIVATE_KEY)");
    }

    try {
        const normalizedKey = privateKey.replace(/\\n/g, '\n').trim();
        const githubApp = new App({
            appId: parseInt(appId, 10),
            privateKey: normalizedKey,
        });

        const { data: installations } = await githubApp.octokit.rest.apps.listInstallations();
        let targetInstallId;

        if (owner) {
            const match = installations.find((i) => i.account?.login === owner);
            if (match) targetInstallId = match.id;
        }

        if (!targetInstallId && installations.length > 0) {
            targetInstallId = installations[0].id;
        }

        if (!targetInstallId) {
            throw new Error("No installation found for this GitHub App.");
        }

        return await githubApp.getInstallationOctokit(targetInstallId);
    } catch (e) {
        console.error("Auth Error:", e.message);
        throw e;
    }
}

module.exports = { getOctokit };
