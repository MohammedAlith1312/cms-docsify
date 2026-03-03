import { API_BASE, state } from './tb-config.js';
import { showToast, hidePopups, reapplyHighlights } from './tb-ui.js';
import { openSidebar, renderCardContent } from './tb-components.js';

export async function fetchIssues() {
    try {
        console.log("TB: Requesting issues from", `${API_BASE}`);

        // Pass credentials: 'include' to smoothly send the Pages CMS secure cookie, if logged in
        const res = await fetch(`${API_BASE}`, { credentials: 'include' });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || `Server responded with ${res.status}`);
        }

        const data = await res.json();
        if (data.issues) {
            const newIssues = data.issues.map(i => ({
                id: i.id,
                text: i.selectedText || '',
                issueUrl: i.url || '#',
                pageUrl: i.pageUrl || '',
                issueNumber: i.issueNumber || 0,
                title: i.title || 'No Title',
                description: i.body || 'No description provided',
                state: (i.state || 'open').toLowerCase()
            }));

            state.issues = newIssues;
            localStorage.setItem('tb_issues_cache', JSON.stringify(state.issues));
            reapplyHighlights(state.issues);

            const sidebar = document.getElementById('tb-sidebar');
            if (sidebar && sidebar.classList.contains('open')) openSidebar();
        }
    } catch (e) {
        console.error("TB: Sync Failure Detail:", e);
        showToast(`Sync Error: ${e.message}`);
    }
}

export async function submitNewIssue() {
    const input = document.getElementById('tb-desc-input');
    const desc = input.value.trim();
    if (!desc || state.status === 'submitting') return;

    state.status = 'submitting';
    const btn = document.getElementById('tb-submit-btn');
    btn.innerText = '...';
    btn.disabled = true;

    try {
        const rawTitle = desc.split('\n')[0].substring(0, 100).trim();
        const bodyContent = `**Description:**\n${desc}\n\n**Selected Context:**\n> ${state.selectedText}\n\n**URL:**\n${window.location.href}`;

        const res = await fetch(`${API_BASE}`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title: rawTitle || "New Issue", body: bodyContent })
        });
        const data = await res.json();
        if (!res.ok) throw new Error();

        const newIssue = {
            id: `issue-${data.number}`,
            text: state.selectedText,
            issueUrl: data.url,
            issueNumber: data.number,
            title: rawTitle,
            description: desc,
            state: 'open'
        };

        state.issues.push(newIssue);
        localStorage.setItem('tb_issues_cache', JSON.stringify(state.issues));
        reapplyHighlights(state.issues);
        showToast("Issue Created");
        hidePopups();
    } catch (e) { showToast("Failed"); }
    finally { state.status = 'idle'; }
}

export async function saveIssueEdit(issue, container, rect) {
    const title = document.getElementById('tb-edit-title').value.trim();
    const body = document.getElementById('tb-edit-body').value.trim();
    if (!title || !body) return;
    try {
        const res = await fetch(`${API_BASE}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ number: issue.issueNumber, title, body })
        });
        if (!res.ok) throw new Error();
        issue.title = title;
        issue.description = body;
        state.isEditing = false;
        localStorage.setItem('tb_issues_cache', JSON.stringify(state.issues));
        showToast("Updated");
        renderCardContent(container, issue, rect);
    } catch (e) { showToast("Failed"); }
}

export async function submitComment(issue, container, rect) {
    const text = document.getElementById('tb-comment-text').value.trim();
    if (!text) return;
    try {
        const res = await fetch(`${API_BASE}`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action: 'comment', number: issue.issueNumber, comment: text })
        });
        if (!res.ok) throw new Error();
        state.showCommentInput = false;
        showToast("Commented");
        renderCardContent(container, issue, rect);
    } catch (e) { showToast("Failed"); }
}

export async function closeCurrentIssue(issue) {
    if (!confirm("Close?")) return;
    try {
        const res = await fetch(`${API_BASE}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ number: issue.issueNumber, state: 'closed' })
        });
        if (!res.ok) throw new Error();
        const target = state.issues.find(i => i.id === issue.id);
        if (target) target.state = 'closed';
        localStorage.setItem('tb_issues_cache', JSON.stringify(state.issues));
        reapplyHighlights(state.issues);
        hidePopups();
        showToast("Closed");
    } catch (e) { showToast("Failed"); }
}
