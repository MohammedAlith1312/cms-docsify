/**
 * TextBlock.js - Premium Docsify Integration
 * Comprehensive Issue Feedback System: Create, View, Edit, Comment, Close.
 * Highlights persist across navigations and until the issue is closed.
 */

(function () {
    // --- Configuration & State ---
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000/api/issues'
        : 'https://document-in-docsify.onrender.com/api/issues';

    const state = {
        issues: [],
        status: 'idle',           // 'idle' | 'submitting'
        selectedText: '',
        selectionType: 'text',    // 'text' | 'image'
        showInput: false,
        activeIssue: null,
        showIssueCard: false,
        isEditing: false,
        showCommentInput: false,
        selectionRange: null,
        lastClickedImage: null
    };

    // --- Initialization ---
    function init() {
        injectStyles();
        createDOMElements();

        // Load from cache for instant "No flicker" display
        const cached = localStorage.getItem('tb_issues_cache');
        if (cached) {
            try {
                state.issues = JSON.parse(cached);
                console.log("TB: Loaded from cache", state.issues.length);
            } catch (e) { }
        }

        fetchIssues();
        bindEvents();
        setupNavigationObserver();
    }

    // --- CSS Injection (Premium Design) ---
    function injectStyles() {
        if (document.getElementById('tb-styles')) return;
        const style = document.createElement('style');
        style.id = 'tb-styles';
        style.textContent = `
            .issue-highlight {
                background-color: #a3a7b0ff;                 
                color: black;
                cursor: pointer;
                border-radius: 5px;
                padding: 2px 0;
                box-decoration-break: clone;
                -webkit-box-decoration-break: clone;
                transition: background 0.2s;
            }
            .issue-highlight:hover { background-color: #8a8e98ff; }
            
            .issue-highlight-image {
                outline: 4px solid #3b82f6;
                outline-offset: 2px;
                cursor: pointer;
                filter: brightness(0.9);
                transition: all 0.2s ease;
            }

            .tb-popup {
                position: fixed; z-index: 9999;
                background: white; border-radius: 24px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                border: 1px solid #e5e7eb;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                overflow: hidden;
                animation: tb-fade-in 0.2s ease-out;
            }

            @keyframes tb-fade-in {
                from { opacity: 0; transform: translateY(10px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }

            .tb-textarea {
                width: 100%; box-sizing: border-box;
                border: 1px solid #f3f4f6; border-radius: 16px;
                padding: 12px; font-size: 15px; resize: none;
                color: #1f2937;
            }
            .tb-textarea:focus { outline: none; border-color: #3b82f6; }

            .tb-btn {
                border: none; cursor: pointer; font-weight: 600; font-size: 14px;
                padding: 10px 20px; border-radius: 14px; transition: all 0.2s;
            }
            .tb-btn-primary { background: #111; color: white; }
            .tb-btn-primary:active { transform: translateY(0); }
            
            .tb-btn-secondary { background: #f3f4f6; color: #111; border: 1px solid #e5e7eb; }
            .tb-btn-secondary:hover { background: #e5e7eb; }
            .tb-btn-danger { background: #fff1f2; color: #ef4444; }
            .tb-btn-danger:hover { background: #fee2e2; }
            
            .tb-toast {
                position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%);
                background: #111; color: white; padding: 12px 24px; border-radius: 50px;
                font-size: 14px; font-weight: 500; z-index: 10001;
                box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                display: none; animation: tb-toast-in 0.3s ease-out;
            }
            @keyframes tb-toast-in { from { bottom: 20px; opacity: 0; } to { bottom: 40px; opacity: 1; } }

            .tb-icon-btn {
                background: none; border: none; cursor: pointer; padding: 6px;
                border-radius: 50%; color: #9ca3af; transition: all 0.2s;
                display: flex; align-items: center; justify-content: center;
            }
            .tb-icon-btn:hover { background: #f3f4f6; color: #3b82f6; }

            /* Sidebar Styles - Single Column Dashboard */
            .tb-sidebar {
                position: fixed; top: 0; right: -420px; width: 400px; height: 100%;
                background: #fcfcfc; box-shadow: -20px 0 60px rgba(0,0,0,0.15);
                z-index: 10000; transition: right 0.4s cubic-bezier(0.19, 1, 0.22, 1);
                display: flex; flex-direction: column;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            }
            .tb-sidebar.open { right: 0; }
            .tb-sidebar-header {
                padding: 20px 32px; background: white; border-bottom: 1px solid #eee;
                display: flex; justify-content: space-between; align-items: center;
                flex-shrink: 0;
            }
            .tb-sidebar-content { 
                flex: 1; overflow-y: auto; display: flex; flex-direction: column;
            }
            
            .tb-column-header {
                padding: 16px 24px; font-size: 11px; font-weight: 800; color: #9ca3af;
                letter-spacing: 0.1em; text-transform: uppercase; border-bottom: 1px solid #f0f0f0;
                background: #f9fafb; position: sticky; top: 0; z-index: 10;
                display: flex; justify-content: space-between; align-items: center;
            }
            .tb-section-content {
                padding: 20px;
            }
            
            .tb-issue-item {
                background: white; padding: 16px; border: 1px solid #eef0f2; border-radius: 14px;
                margin-bottom: 12px; cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 2px 4px rgba(0,0,0,0.02);
            }
            .tb-issue-item:hover { 
                border-color: #3b82f6; transform: translateY(-3px) scale(1.01); 
                box-shadow: 0 10px 20px rgba(59, 130, 246, 0.1); 
            }
            
            .tb-badge-open { background: #ecfdf5; color: #10b981; }
            .tb-badge-closed { background: #f3f4f6; color: #6b7280; }


        `;
        document.head.appendChild(style);
    }

    function createDOMElements() {
        if (!document.getElementById('tb-toast-container')) {
            const toast = document.createElement('div');
            toast.id = 'tb-toast-container';
            toast.className = 'tb-toast';
            document.body.appendChild(toast);
        }


    }

    // --- Navigation Support: MutationObserver ---
    function setupNavigationObserver() {
        const targetNode = document.getElementById('app') || document.body;
        const observer = new MutationObserver((mutations) => {
            const hasRealChanges = mutations.some(m => {
                if (m.target && (m.target.classList?.contains('issue-highlight') || m.target.parentElement?.classList?.contains('issue-highlight'))) return false;
                if (m.target?.id === 'docsify-loading-bar' || m.target?.classList?.contains('sidebar')) return false;
                return true;
            });

            if (hasRealChanges && state.issues.length > 0) {
                clearTimeout(window._tb_nav_timer);
                window._tb_nav_timer = setTimeout(() => {
                    reapplyHighlights(state.issues);
                }, 300);
            }
        });
        observer.observe(targetNode, { childList: true, subtree: true });
    }

    // --- Event Binding ---
    function bindEvents() {
        document.addEventListener('mouseup', handleTextSelection);
        document.addEventListener('click', onDocumentClick);
        document.addEventListener('mousedown', handleClickOutside);
    }

    // --- State Handlers ---
    function showToast(message) {
        const container = document.getElementById('tb-toast-container');
        if (!container) return;
        container.innerText = "✓ " + message;
        container.style.display = 'block';
        setTimeout(() => { container.style.display = 'none'; }, 3000);
    }

    function hidePopups() {
        state.showInput = false;
        state.showIssueCard = false;
        state.isEditing = false;
        state.showCommentInput = false;
        const input = document.getElementById('tb-creation-form');
        const card = document.getElementById('tb-issue-card');
        if (input) input.remove();
        if (card) card.remove();
    }

    // --- Core Logic: Fetching ---
    async function fetchIssues() {
        try {
            console.log("TB: Requesting issues from", `${API_BASE}/list`);
            const res = await fetch(`${API_BASE}/list`);

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Server responded with ${res.status}`);
            }

            const data = await res.json();
            if (data.issues) {
                const newIssues = data.issues.map(i => ({
                    id: i.id,
                    text: i.selectedText || '',
                    issueUrl: i.url || '#',
                    issueNumber: i.issueNumber || 0,
                    title: i.title || 'No Title',
                    description: i.body || 'No description provided',
                    state: (i.state || 'open').toLowerCase()
                }));

                state.issues = newIssues;
                localStorage.setItem('tb_issues_cache', JSON.stringify(newIssues));
                reapplyHighlights(state.issues);

                const sidebar = document.getElementById('tb-sidebar');
                if (sidebar && sidebar.classList.contains('open')) openSidebar();
            }
        } catch (e) {
            console.error("TB: Sync Failure Detail:", e);
            showToast(`Sync Error: ${e.message}`);
        }
    }

    // --- Logic: Highlighting ---
    function reapplyHighlights(issuesToHighlight) {
        const existing = document.querySelectorAll('.issue-highlight');
        existing.forEach(el => {
            const parent = el.parentNode;
            if (parent) {
                const textNodes = [];
                el.childNodes.forEach(child => textNodes.push(child));
                textNodes.forEach(tn => parent.insertBefore(tn, el));
                parent.removeChild(el);
                parent.normalize();
            }
        });
        document.querySelectorAll('.issue-highlight-image').forEach(img => {
            img.classList.remove('issue-highlight-image');
            img.removeAttribute('data-issue-id');
        });

        issuesToHighlight.forEach(issue => {
            if (!issue.text || issue.state === 'closed' || issue.text === 'No direct text reference') return;

            if (!issue.text.startsWith('![')) {
                // Text Highlight
                const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
                const nodesToHighlight = [];
                let node;
                while (node = walker.nextNode()) {
                    const val = node.nodeValue;
                    if (val && val.includes(issue.text)) {
                        if (node.parentElement && node.parentElement.classList.contains('issue-highlight')) continue;
                        if (node.parentElement && (node.parentElement.tagName === 'TEXTAREA' || node.parentElement.tagName === 'INPUT')) continue;
                        nodesToHighlight.push({ node, index: val.indexOf(issue.text) });
                    }
                }
                nodesToHighlight.forEach(({ node, index }) => {
                    try {
                        const range = document.createRange();
                        range.setStart(node, index);
                        range.setEnd(node, index + issue.text.length);
                        const span = document.createElement('span');
                        span.className = 'issue-highlight';
                        span.setAttribute('data-issue-id', issue.id);
                        range.surroundContents(span);
                    } catch (e) { }
                });
            } else {
                // Image Highlight
                const match = issue.text.match(/!\[.*\]\((.*)\)/);
                if (match) {
                    const reportedSrc = match[1];
                    document.querySelectorAll('img').forEach(img => {
                        if (img.src === reportedSrc || img.getAttribute('src') === reportedSrc || img.src.includes(reportedSrc)) {
                            img.classList.add('issue-highlight-image');
                            img.setAttribute('data-issue-id', issue.id);
                        }
                    });
                }
            }
        });
    }

    // --- Events: Selection & Interaction ---
    function handleTextSelection() {
        if (state.showInput || state.showIssueCard) return;
        const selection = window.getSelection();
        const text = selection.toString().trim();
        if (!text || selection.rangeCount === 0) return;

        // Ensure selection is inside main content, not inside any sidebars
        const node = selection.anchorNode;
        if (node && node.parentElement) {
            if (node.parentElement.closest('.sidebar') || node.parentElement.closest('.tb-sidebar')) {
                return;
            }
        }

        const range = selection.getRangeAt(0);
        state.selectionRange = range.cloneRange();
        state.selectedText = text;
        state.selectionType = 'text';
        state.lastClickedImage = null;
        openCreationForm(range.getBoundingClientRect());
    }

    function onDocumentClick(e) {
        const target = e.target;

        if (target.id === 'tb-sidebar-btn' || (target.closest && target.closest('#tb-sidebar-btn'))) {
            openSidebar();
            return;
        }

        if (target.classList.contains('issue-highlight') || target.classList.contains('issue-highlight-image')) {
            const issueId = target.getAttribute('data-issue-id');
            const issue = state.issues.find(i => i.id === issueId);
            if (issue) openIssueCard(issue, target.getBoundingClientRect());
            return;
        }

        if (target.tagName === 'IMG' && !target.classList.contains('issue-highlight-image')) {
            if (state.showInput || state.showIssueCard) return;
            const img = target;
            state.selectionType = 'image';
            state.selectedText = `![${img.alt || 'image'}](${img.src})`;
            state.lastClickedImage = img;
            state.selectionRange = null;
            openCreationForm(img.getBoundingClientRect());
        }
    }

    function handleClickOutside(e) {
        const popup = document.querySelector('.tb-popup');
        const sidebar = document.getElementById('tb-sidebar');
        const isSidebarBtn = e.target.closest ? e.target.closest('#tb-sidebar-btn') : null;
        if (popup && !popup.contains(e.target)) hidePopups();
        if (sidebar && sidebar.classList.contains('open') && !sidebar.contains(e.target) && !isSidebarBtn) {
            sidebar.classList.remove('open');
        }
    }

    // --- Popups: Creation Form ---
    function openCreationForm(rect) {
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
                    <!---- <button id="tb-list-btn" class="tb-btn tb-btn-secondary" style="padding: 10px 15px;">List</button> ---->
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
        // document.getElementById('tb-list-btn').onclick = () => openSidebar(state.selectedText);
        document.getElementById('tb-create-close').onclick = hidePopups;
    }

    async function submitNewIssue() {
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

            const res = await fetch(`${API_BASE}/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

    // --- Sidebar Dashboard ---
    function openSidebar(filterText = '') {
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

    // --- Issue Card ---
    function openIssueCard(issue, rect) {
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

    function renderCardContent(container, issue, rect) {
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

    async function saveIssueEdit(issue, container, rect) {
        const title = document.getElementById('tb-edit-title').value.trim();
        const body = document.getElementById('tb-edit-body').value.trim();
        if (!title || !body) return;
        try {
            const res = await fetch(`${API_BASE}/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

    async function submitComment(issue, container, rect) {
        const text = document.getElementById('tb-comment-text').value.trim();
        if (!text) return;
        try {
            const res = await fetch(`${API_BASE}/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ number: issue.issueNumber, comment: text })
            });
            if (!res.ok) throw new Error();
            state.showCommentInput = false;
            showToast("Commented");
            renderCardContent(container, issue, rect);
        } catch (e) { showToast("Failed"); }
    }

    async function closeCurrentIssue(issue) {
        if (!confirm("Close?")) return;
        try {
            const res = await fetch(`${API_BASE}/close`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ number: issue.issueNumber })
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

    function positionPopup(popup, rect) {
        let top = rect.top - popup.offsetHeight - 15;
        let left = rect.left + (rect.width / 2) - (popup.offsetWidth / 2);
        if (top < 10) top = rect.bottom + 15;
        left = Math.max(10, Math.min(left, window.innerWidth - popup.offsetWidth - 10));
        top = Math.max(10, top);
        popup.style.top = top + 'px';
        popup.style.left = left + 'px';
    }

    if (window.$docsify) {
        window.$docsify.plugins = [].concat(window.$docsify.plugins || [], function (hook, vm) {
            hook.ready(() => { if (state.issues.length > 0) reapplyHighlights(state.issues); });
            hook.doneEach(() => { setTimeout(() => { if (state.issues.length > 0) reapplyHighlights(state.issues); }, 150); });
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
