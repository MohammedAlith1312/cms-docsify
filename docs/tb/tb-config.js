// Update these to match your Pages CMS configuration
const pagesCmsBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://pages-cms-ten-psi.vercel.app'; // Production CMS URL

// Auto-detect owner and repo from the URL
let owner = 'MohammedAlith1312'; // Fallback for local testing
let repo = 'document-in-docsify'; // Fallback for local testing

if (window.location.hostname.includes('github.io')) {
    owner = window.location.hostname.split('.')[0];
    repo = window.location.pathname.split('/')[1];
}

export const API_BASE = `${pagesCmsBase}/api/repos/${owner}/${repo}/issues`;

export const state = {
    issues: [],
    status: 'idle',           // 'idle' | 'submitting'
    selectedText: '',
    selectionType: 'text',    // 'text' | 'image'
    showInput: false,
    showToolbar: false,
    activeIssue: null,
    showIssueCard: false,
    isEditing: false,
    showCommentInput: false,
    selectionRange: null,
    lastClickedImage: null
};
