import { state } from './tb-config.js';
import { hidePopups, positionPopup } from './tb-ui.js';
import { fetchIssues, submitNewIssue, saveIssueEdit, submitComment, closeCurrentIssue } from './tb-api.js';

export function openSidebar(filterText = '') {
    let sidebar = document.getElementById('tb-sidebar');
    if (!sidebar) {
        sidebar = document.createElement('div');
        sidebar.id = 'tb-sidebar';
        sidebar.className = 'tb-sidebar';
        document.body.appendChild(sidebar);
    }

    const openIssues = state.issues.filter(i => i.state === 'open');
    const closedIssues = state.issues.filter(i => i.state === 'closed');

    const renderIssue = (issue) => `
        <div class="tb-issue-item" data-issue-id="${issue.id}">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="font-size: 11px; font-weight: 800; color: ${issue.state === 'open' ? '#3b82f6' : '#9ca3af'};">#${issue.issueNumber}</span>
                <span style="font-size: 10px; padding: 2px 8px; border-radius: 6px; font-weight: 700; text-transform: uppercase;" class="${issue.state === 'open' ? 'tb-badge-open' : 'tb-badge-closed'}">
                    ${issue.state}
                </span>
            </div>
            <div style="font-size: 14px; font-weight: 700; color: #111; margin-bottom: 6px;">${issue.title || 'No Title'}</div>
            <div style="font-size: 12px; color: #6b7280; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.5; margin-bottom: 12px;">
                ${issue.description || 'No description provided'}
            </div>
            <div style="font-size: 10px; color: #9ca3af; font-style: italic; border-top: 1px solid #f9fafb; padding-top: 8px;">
                Ref: "${(issue.text || '').substring(0, 40)}${(issue.text || '').length > 40 ? '...' : ''}"
            </div>
        </div>
    `;

    sidebar.innerHTML = `
        <div class="tb-sidebar-header">
            <div>
                <div style="font-size: 10px; font-weight: 800; color: #9ca3af; letter-spacing: 0.1em; margin-bottom: 2px;">DASHBOARD</div>
                <div style="font-weight: 800; font-size: 18px; color: #111;">Issues</div>
            </div>
            <div style="display: flex; gap: 12px; align-items: center;">
                <button id="tb-sidebar-refresh" class="tb-icon-btn" title="Sync with GitHub">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                </button>
                <button id="tb-sidebar-close" class="tb-icon-btn" title="Close">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
            </div>
        </div>
        <div class="tb-sidebar-content">
            <div class="tb-column-header">
                <span>Open Issues (${openIssues.length})</span>
            </div>
            <div class="tb-section-content">
                ${openIssues.length === 0 ? '<div style="color: #9ca3af; text-align: center; margin-top: 20px; font-size: 13px;">No active issues.</div>' : openIssues.map(renderIssue).join('')}
            </div>
            
            <div class="tb-column-header" style="border-top: 1px solid #eee; position: sticky; top: -1px;">
                <span>Closed Issues (${closedIssues.length})</span>
            </div>
            <div class="tb-section-content" style="background: white;">
                ${closedIssues.length === 0 ? '<div style="color: #9ca3af; text-align: center; margin-top: 20px; font-size: 13px;">No closed issues yet.</div>' : closedIssues.map(renderIssue).join('')}
            </div>
        </div>
    `;

    sidebar.classList.add('open');
    document.getElementById('tb-sidebar-close').onclick = () => sidebar.classList.remove('open');
    document.getElementById('tb-sidebar-refresh').onclick = () => {
        const btn = document.getElementById('tb-sidebar-refresh');
        btn.style.animation = 'tb-spin 1s linear infinite';
        fetchIssues().finally(() => btn.style.animation = '');
    };

    // Add spin animation
    if (!document.getElementById('tb-anim-styles')) {
        const s = document.createElement('style');
        s.id = 'tb-anim-styles';
        s.textContent = '@keyframes tb-spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(s);
    }

    sidebar.querySelectorAll('.tb-issue-item').forEach(item => {
        item.onclick = (e) => {
            const issueId = item.getAttribute('data-issue-id');
            const issue = state.issues.find(i => i.id === issueId);
            if (issue) {
                sidebar.classList.remove('open');
                const highlight = document.querySelector(`[data-issue-id="${issue.id}"]`);
                if (highlight) {
                    highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(() => openIssueCard(issue, highlight.getBoundingClientRect()), 400);
                } else {
                    openIssueCard(issue, { top: window.innerHeight / 2, left: window.innerWidth / 2, width: 0, height: 0 });
                }
            }
        };
    });
}

export function openIssueCard(issue, rect) {
    hidePopups();
    state.showIssueCard = true;
    state.activeIssue = issue;

    const popup = document.createElement('div');
    popup.id = 'tb-issue-card';
    popup.className = 'tb-popup';
    popup.style.width = '380px';
    renderCardContent(popup, issue, rect);

    document.body.appendChild(popup);
    positionPopup(popup, rect);
}

export function renderCardContent(container, issue, rect) {
    if (state.isEditing) {
        container.innerHTML = `
            <div style="padding: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <div style="font-size: 10px; font-weight: 800; color: #9ca3af; margin-top: 6px;">EDIT ISSUE</div>
                    <button class="tb-card-close tb-icon-btn" style="margin: -8px -8px 0 0;" title="Close">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                </div>
                <input id="tb-edit-title" class="tb-textarea" style="margin-bottom: 8px; font-weight:600;" value="${issue.title}">
                <textarea id="tb-edit-body" class="tb-textarea" rows="4">${issue.description}</textarea>
                <div style="margin-top: 12px; display: flex; justify-content: flex-end; gap: 8px;">
                    <button id="tb-edit-cancel" style="background:none; border:none; cursor:pointer; color:#9ca3af; font-size:12px;">Cancel</button>
                    <button id="tb-edit-save" class="tb-btn tb-btn-primary" style="padding:6px 16px; font-size:12px; border-radius:20px;">Save</button>
                </div>
            </div>
        `;
        container.querySelector('#tb-edit-cancel').onclick = () => { state.isEditing = false; renderCardContent(container, issue, rect); };
        container.querySelector('#tb-edit-save').onclick = () => saveIssueEdit(issue, container, rect);
    } else if (state.showCommentInput) {
        container.innerHTML = `
            <div style="padding: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <div style="font-size: 10px; font-weight: 800; color: #9ca3af; margin-top: 6px;">COMMENT — #${issue.issueNumber}</div>
                    <button class="tb-card-close tb-icon-btn" style="margin: -8px -8px 0 0;" title="Close">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                </div>
                <textarea id="tb-comment-text" class="tb-textarea" rows="3" placeholder="Write..."></textarea>
                <div style="margin-top: 12px; display: flex; justify-content: flex-end;">
                    <button id="tb-comment-submit" class="tb-btn tb-btn-primary" style="padding:7px 18px; font-size:12px;">Post</button>
                </div>
            </div>
        `;
        container.querySelector('#tb-comment-submit').onclick = () => submitComment(issue, container, rect);
    } else {
        const isImg = issue.text.startsWith('![');
        container.innerHTML = `
            <div style="padding: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                    <div>
                        <div style="font-size: 10px; font-weight: 800; color: #9ca3af; margin-bottom: 2px;">#${issue.issueNumber} — ${issue.state.toUpperCase()}</div>
                        <div style="font-size: 15px; font-weight: 600; color: #111;">${issue.title}</div>
                    </div>
                    <div style="display: flex; gap: 4px; margin-top: -6px; margin-right: -6px;">
                        ${issue.state === 'open' ? `
                            <button id="tb-edit-trigger" class="tb-icon-btn" title="Edit">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                            </button>
                            <button id="tb-comment-trigger" class="tb-icon-btn" title="Comment">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.3 8.3 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.3 8.3 0 0 1-3.8-.9L3 21l1.9-5.7a8.3 8.3 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.3 8.3 0 0 1 3.8-.9h.5a8.4 8.4 0 0 1 8 8v.5z"/></svg>
                            </button>
                        ` : ''}
                        <button class="tb-card-close tb-icon-btn" title="Close" style="margin-left: 2px;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                    </div>
                </div>
                <div style="background: #f9fafb; padding: 12px; border-radius: 12px; margin-bottom: 20px;">
                    <div style="font-size: 12px; color: #4b5563; line-height: 1.5;">${isImg ? '🖼️ Image Reference' : `"${issue.text}"`}</div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button id="tb-view-github" class="tb-btn tb-btn-secondary" style="flex:1;">View</button>
                    ${issue.state === 'open' ? `<button id="tb-close-issue" class="tb-btn tb-btn-danger" style="flex:1;">Close</button>` : ''}
                </div>
            </div>
        `;
        if (container.querySelector('#tb-edit-trigger')) container.querySelector('#tb-edit-trigger').onclick = () => { state.isEditing = true; renderCardContent(container, issue, rect); };
        if (container.querySelector('#tb-comment-trigger')) container.querySelector('#tb-comment-trigger').onclick = () => { state.showCommentInput = true; renderCardContent(container, issue, rect); };
        container.querySelector('#tb-view-github').onclick = () => window.open(issue.issueUrl, '_blank');
        if (container.querySelector('#tb-close-issue')) container.querySelector('#tb-close-issue').onclick = () => closeCurrentIssue(issue);
    }

    const closeBtn = container.querySelector('.tb-card-close');
    if (closeBtn) closeBtn.onclick = hidePopups;
}

export function openCreationForm(rect) {
    hidePopups();
    state.showInput = true;
    const popup = document.createElement('div');
    popup.id = 'tb-creation-form';
    popup.className = 'tb-popup';
    popup.style.width = '320px';
    popup.innerHTML = `
        <div style="padding: 24px 24px 0;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                <div style="font-size: 10px; font-weight: 800; color: #9ca3af; letter-spacing: 0.1em; margin-top: 6px;">NEW ISSUE</div>
                <button id="tb-create-close" class="tb-icon-btn" style="margin: -8px -8px 0 0;" title="Close">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
            </div>
            <textarea id="tb-desc-input" class="tb-textarea" rows="4" placeholder="Description"></textarea>
        </div>
        <div style="padding: 12px 24px 24px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; color: #d1d5db;">⌘ + Enter</span>
            <div style="display: flex; gap: 8px;">
                <!-- <button id="tb-list-btn" class="tb-btn tb-btn-secondary" style="padding: 10px 15px;">List</button> -->
                <button id="tb-submit-btn" class="tb-btn tb-btn-primary">Create</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);
    positionPopup(popup, rect);
    const input = document.getElementById('tb-desc-input');
    input.focus();
    input.onkeydown = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submitNewIssue(); };
    document.getElementById('tb-submit-btn').onclick = submitNewIssue;
    document.getElementById('tb-create-close').onclick = hidePopups;
}

export function openFloatingToolbar(rect) {
    hidePopups();
    state.showToolbar = true;
    const popup = document.createElement('div');
    popup.id = 'tb-floating-toolbar';
    popup.className = 'tb-popup';
    popup.style.display = 'flex';
    popup.style.padding = '4px 8px';
    popup.style.gap = '8px';
    popup.style.alignItems = 'center';

    popup.innerHTML = `
        <button id="tb-toolbar-copy" class="tb-icon-btn" title="Copy to clipboard" style="padding: 6px 10px; border-radius: 8px; color: #111; font-weight: 600; font-size: 13px; width: auto; display: flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            Copy
        </button>
        <div style="width: 1px; height: 16px; background: #e5e7eb;"></div>
        <button id="tb-toolbar-bug" class="tb-icon-btn" title="Report Bug" style="padding: 6px 10px; border-radius: 8px; color: #ef4444; font-weight: 600; font-size: 13px; width: auto; display: flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>
            Issues
        </button>
    `;

    document.body.appendChild(popup);
    positionPopup(popup, rect);

    document.getElementById('tb-toolbar-copy').onclick = () => {
        navigator.clipboard.writeText(state.selectedText).then(() => {
            import('./tb-ui.js').then(module => module.showToast('Copied to clipboard!'));
            hidePopups();
            window.getSelection().removeAllRanges();
        });
    };

    document.getElementById('tb-toolbar-bug').onclick = () => {
        hidePopups();
        openCreationForm(rect);
    };
}

export function openPageSidebar() {
    let sidebar = document.getElementById('tb-page-sidebar');
    if (!sidebar) {
        sidebar = document.createElement('div');
        sidebar.id = 'tb-page-sidebar';
        sidebar.className = 'tb-sidebar';
        document.body.appendChild(sidebar);
    }

    // Collect specific issue IDs from DOM
    const visibleIssueIds = new Set();
    document.querySelectorAll('.issue-highlight, .issue-highlight-image').forEach(el => {
        const id = el.getAttribute('data-issue-id');
        if (id) visibleIssueIds.add(String(id));
    });

    // Helper to extract the relative Docsify path (hash or pathname)
    const getPagePath = (urlStr) => {
        try {
            const u = new URL(urlStr);
            let p = u.hash;
            if (!p || p === '#/') p = u.pathname;
            return p.split('?')[0];
        } catch (e) { return urlStr.split('?')[0]; }
    };
    const currentPath = getPagePath(window.location.href);

    const pageIssues = state.issues.filter(i => {
        // Method 1: URL matching (supports open & closed)
        if (i.pageUrl && getPagePath(i.pageUrl) === currentPath) return true;
        // Method 2: DOM highlighting fallback (supports older issues without URLs)
        if (visibleIssueIds.has(String(i.id))) return true;
        return false;
    });

    const openIssues = pageIssues.filter(i => i.state === 'open');
    const closedIssues = pageIssues.filter(i => i.state === 'closed');

    const renderIssue = (issue) => `
        <div class="tb-issue-item" data-issue-id="${issue.id}">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="font-size: 11px; font-weight: 800; color: ${issue.state === 'open' ? '#3b82f6' : '#9ca3af'};">#${issue.issueNumber}</span>
                <span style="font-size: 10px; padding: 2px 8px; border-radius: 6px; font-weight: 700; text-transform: uppercase;" class="${issue.state === 'open' ? 'tb-badge-open' : 'tb-badge-closed'}">
                    ${issue.state}
                </span>
            </div>
            <div style="font-size: 14px; font-weight: 700; color: #111; margin-bottom: 6px;">${issue.title || 'No Title'}</div>
            <div style="font-size: 12px; color: #6b7280; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.5; margin-bottom: 12px;">
                ${issue.description || 'No description provided'}
            </div>
            <div style="font-size: 10px; color: #9ca3af; font-style: italic; border-top: 1px solid #f9fafb; padding-top: 8px;">
                Ref: "${(issue.text || '').substring(0, 40)}${(issue.text || '').length > 40 ? '...' : ''}"
            </div>
        </div>
    `;

    sidebar.innerHTML = `
        <div class="tb-sidebar-header">
            <div>
                <div style="font-size: 10px; font-weight: 800; color: #9ca3af; letter-spacing: 0.1em; margin-bottom: 2px;">CURRENT PAGE</div>
                <div style="font-weight: 800; font-size: 18px; color: #111;">Issues on Page</div>
            </div>
            <div style="display: flex; gap: 12px; align-items: center;">
                <button id="tb-page-sidebar-refresh" class="tb-icon-btn" title="Refresh list">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                </button>
                <button id="tb-page-sidebar-close" class="tb-icon-btn" title="Close">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
            </div>
        </div>
        <div class="tb-sidebar-content">
            <div class="tb-column-header">
                <span>Open Issues (${openIssues.length})</span>
            </div>
            <div class="tb-section-content">
                ${openIssues.length === 0 ? '<div style="color: #9ca3af; text-align: center; margin-top: 20px; font-size: 13px;">No active issues on this page.</div>' : openIssues.map(renderIssue).join('')}
            </div>
            
            <div class="tb-column-header" style="border-top: 1px solid #eee; position: sticky; top: -1px;">
                <span>Closed Issues (${closedIssues.length})</span>
            </div>
            <div class="tb-section-content" style="background: white;">
                ${closedIssues.length === 0 ? '<div style="color: #9ca3af; text-align: center; margin-top: 20px; font-size: 13px;">No closed issues on this page.</div>' : closedIssues.map(renderIssue).join('')}
            </div>
        </div>
    `;

    sidebar.classList.add('open');
    document.getElementById('tb-page-sidebar-close').onclick = () => sidebar.classList.remove('open');
    document.getElementById('tb-page-sidebar-refresh').onclick = () => {
        sidebar.classList.remove('open');
        setTimeout(() => openPageSidebar(), 100);
    };

    sidebar.querySelectorAll('.tb-issue-item').forEach(item => {
        item.onclick = (e) => {
            const issueId = item.getAttribute('data-issue-id');
            const issue = state.issues.find(i => String(i.id) === String(issueId));
            if (issue) {
                sidebar.classList.remove('open');
                const highlight = document.querySelector(`[data-issue-id="${issue.id}"]`);
                if (highlight) {
                    highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(() => openIssueCard(issue, highlight.getBoundingClientRect()), 400);
                } else {
                    openIssueCard(issue, { top: window.innerHeight / 2, left: window.innerWidth / 2, width: 0, height: 0 });
                }
            }
        };
    });
}
