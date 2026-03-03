import { state } from './tb-config.js';
import { hidePopups, reapplyHighlights } from './tb-ui.js';
import { openCreationForm, openSidebar, openIssueCard, openFloatingToolbar, openPageSidebar } from './tb-components.js';

export function setupNavigationObserver() {
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

export function handleTextSelection() {
    if (state.showInput || state.showToolbar || state.showIssueCard) return;
    const selection = window.getSelection();
    const text = selection.toString().trim();
    if (!text || selection.rangeCount === 0) return;

    const node = selection.anchorNode;
    const focusNode = selection.focusNode;

    let highlightNode = null;
    if (node && node.parentElement) {
        highlightNode = node.parentElement.closest('.issue-highlight');
    }
    if (!highlightNode && focusNode && focusNode.parentElement) {
        highlightNode = focusNode.parentElement.closest('.issue-highlight');
    }

    if (highlightNode) {
        const issueId = highlightNode.getAttribute('data-issue-id');
        const issue = state.issues.find(i => i.id === issueId);
        if (issue) {
            window.getSelection().removeAllRanges();
            openIssueCard(issue, highlightNode.getBoundingClientRect());
        }
        return;
    }

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
    openFloatingToolbar(range.getBoundingClientRect());
}

export function onDocumentClick(e) {
    const target = e.target;

    if (target.id === 'tb-sidebar-btn' || (target.closest && target.closest('#tb-sidebar-btn'))) {
        openSidebar();
        return;
    }

    if (target.id === 'tb-page-issues-btn' || (target.closest && target.closest('#tb-page-issues-btn'))) {
        openPageSidebar();
        return;
    }

    const highlightEl = target.closest ? (target.closest('.issue-highlight') || target.closest('.issue-highlight-image')) : null;
    if (highlightEl) {
        const issueId = highlightEl.getAttribute('data-issue-id');
        const issue = state.issues.find(i => i.id === issueId);
        if (issue) openIssueCard(issue, highlightEl.getBoundingClientRect());
        return;
    }

    if (target.tagName === 'IMG' && !target.classList.contains('issue-highlight-image')) {
        if (state.showInput || state.showToolbar || state.showIssueCard) return;
        const img = target;
        state.selectionType = 'image';
        state.selectedText = `![${img.alt || 'image'}](${img.src})`;
        state.lastClickedImage = img;
        state.selectionRange = null;
        openFloatingToolbar(img.getBoundingClientRect());
    }
}

export function handleClickOutside(e) {
    const popup = document.querySelector('.tb-popup');
    const sidebar = document.getElementById('tb-sidebar');
    const isSidebarBtn = e.target.closest ? e.target.closest('#tb-sidebar-btn') : null;

    const pageSidebar = document.getElementById('tb-page-sidebar');
    const isPageBtn = e.target.closest ? e.target.closest('#tb-page-issues-btn') : null;

    if (popup && !popup.contains(e.target)) hidePopups();
    if (sidebar && sidebar.classList.contains('open') && !sidebar.contains(e.target) && !isSidebarBtn) {
        sidebar.classList.remove('open');
    }
    if (pageSidebar && pageSidebar.classList.contains('open') && !pageSidebar.contains(e.target) && !isPageBtn) {
        pageSidebar.classList.remove('open');
    }
}

export function bindEvents() {
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('click', onDocumentClick);
    document.addEventListener('mousedown', handleClickOutside);
}
