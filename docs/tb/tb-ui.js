import { state } from './tb-config.js';

export function injectStyles() {
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
        .tb-section-content { padding: 20px; }
        
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

        #tb-page-issues-btn {
            position: fixed; top: 15px; right: 15px;
            display: flex; gap: 8px; align-items: center;
            background: white; border: 1px solid #e5e7eb;
            color: #111; font-size: 13px; font-weight: 600;
            padding: 8px 16px; border-radius: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            cursor: pointer; z-index: 9998;
            transition: all 0.2s ease;
        }
        #tb-page-issues-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.1); border-color:#d1d5db; }
    `;
    document.head.appendChild(style);
}

export function createDOMElements() {
    if (!document.getElementById('tb-toast-container')) {
        const toast = document.createElement('div');
        toast.id = 'tb-toast-container';
        toast.className = 'tb-toast';
        document.body.appendChild(toast);
    }

    if (!document.getElementById('tb-page-issues-btn')) {
        const btn = document.createElement('button');
        btn.id = 'tb-page-issues-btn';
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> Issues on Page`;
        document.body.appendChild(btn);
    }
}

export function showToast(message) {
    const container = document.getElementById('tb-toast-container');
    if (!container) return;
    container.innerText = "✓ " + message;
    container.style.display = 'block';
    setTimeout(() => { container.style.display = 'none'; }, 3000);
}

export function hidePopups() {
    state.showInput = false;
    state.showToolbar = false;
    state.showIssueCard = false;
    state.isEditing = false;
    state.showCommentInput = false;
    const input = document.getElementById('tb-creation-form');
    const card = document.getElementById('tb-issue-card');
    const toolbar = document.getElementById('tb-floating-toolbar');
    if (input) input.remove();
    if (card) card.remove();
    if (toolbar) toolbar.remove();
}

export function positionPopup(popup, rect) {
    let top = rect.top - popup.offsetHeight - 15;
    let left = rect.left + (rect.width / 2) - (popup.offsetWidth / 2);
    if (top < 10) top = rect.bottom + 15;
    left = Math.max(10, Math.min(left, window.innerWidth - popup.offsetWidth - 10));
    top = Math.max(10, top);
    popup.style.top = top + 'px';
    popup.style.left = left + 'px';
}

export function reapplyHighlights(issuesToHighlight) {
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

    const getPagePath = (urlStr) => {
        try {
            const u = new URL(urlStr);
            let p = u.hash;
            if (!p || p === '#/') p = u.pathname;
            return p.split('?')[0];
        } catch (e) { return urlStr.split('?')[0]; }
    };
    const currentPath = getPagePath(window.location.href);

    issuesToHighlight.forEach(issue => {
        if (!issue.text || issue.state === 'closed' || issue.text === 'No direct text reference') return;

        // Only highlight on the exact page this issue was created on
        if (issue.pageUrl && getPagePath(issue.pageUrl) !== currentPath) return;

        if (!issue.text.startsWith('![')) {
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
            const match = issue.text.match(/!\\[.*\\]\\((.*)\\)/);
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
