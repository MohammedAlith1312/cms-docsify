import { state } from './tb-config.js';
import { injectStyles, createDOMElements, reapplyHighlights } from './tb-ui.js';
import { fetchIssues } from './tb-api.js';
import { bindEvents, setupNavigationObserver } from './tb-events.js';

export function init() {
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

if (window.$docsify) {
    window.$docsify.plugins = [].concat(window.$docsify.plugins || [], function (hook, vm) {
        hook.ready(() => { if (state.issues.length > 0) reapplyHighlights(state.issues); });
        hook.doneEach(() => { setTimeout(() => { if (state.issues.length > 0) reapplyHighlights(state.issues); }, 150); });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
