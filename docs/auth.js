// Seamless CMS Authentication Integration for Docsify
(async function () {
    const CMS_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000'
        : 'https://pages-cms-ten-psi.vercel.app';

    let currentUser = null;

    // ── Auth State ──────────────────────────────────────────────
    async function checkLoginStatus() {
        try {
            const res = await fetch(`${CMS_BASE}/api/auth/me`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                if (data.authenticated) {
                    currentUser = data.user;
                    // Provide the expected avatar URL if not returned natively, or use a default
                    if (!currentUser.avatar) currentUser.avatar = `https://github.com/${currentUser.githubUsername}.png`;
                    return true;
                }
            }
        } catch (e) {
            console.error("Auth check failed:", e);
        }
        return false;
    }

    function isLoggedIn() {
        return currentUser !== null;
    }

    function getUser() {
        return currentUser ? {
            login: currentUser.githubUsername,
            name: currentUser.name,
            avatar: currentUser.avatar,

        } : null;
    }

    // ── Handle Login/Logout Redirects ───────────────────────────
    function redirectToLogin() {
        window.location.href = `${CMS_BASE}/login`;
    }

    async function handleLogout() {
        // Redirect to CMS to destroy the session cookie properly
        window.location.href = `${CMS_BASE}/api/auth/signout`;
    }

    // ── Gate: Redirect to login if not authenticated ────────────
    async function enforceLogin() {
        // Dont redirect if looking at the old standalone login.html (legacy support while cleaning up)
        if (window.location.pathname.includes('login.html')) {
            window.location.replace('/');
            return false;
        }

        const authenticated = await checkLoginStatus();
        if (!authenticated) {
            redirectToLogin();
            return false;
        }
        return true;
    }

    // ── Styles ──────────────────────────────────────────────────
    function injectAuthStyles() {
        if (document.getElementById('auth-styles')) return;
        const style = document.createElement('style');
        style.id = 'auth-styles';
        style.textContent = `
            #gh-auth-container {
                position: fixed;
                top: 14px;
                right: 180px;
                z-index: 9999;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                animation: auth-fade-in 0.3s ease-out;
            }
            @keyframes auth-fade-in {
                from { opacity: 0; transform: translateY(-8px); }
                to   { opacity: 1; transform: translateY(0); }
            }

            /* User Profile */
            #gh-user-profile {
                display: inline-flex;
                align-items: center;
                cursor: pointer;
                transition: transform 0.2s ease;
                position: relative;
            }
            #gh-user-profile:hover {
                transform: translateY(-2px);
            }
            #gh-user-avatar {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                object-fit: cover;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }

            #gh-dropdown {
                display: none;
                position: absolute;
                top: calc(100% + 8px);
                right: 0;
                min-width: 220px;
                max-width: 280px;
                background: #fff;
                border: 1px solid #e5e7eb;
                border-radius: 14px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.12);
                overflow: hidden;
                animation: auth-dropdown-in 0.2s ease-out;
                z-index: 10001;
            }
            #gh-dropdown.open { display: block; }
            @keyframes auth-dropdown-in {
                from { opacity: 0; transform: translateY(-6px) scale(0.96); }
                to   { opacity: 1; transform: translateY(0) scale(1); }
            }

            .gh-dropdown-header {
                padding: 14px 16px;
                border-bottom: 1px solid #f0f0f0;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .gh-dropdown-header img {
                width: 36px; height: 36px; border-radius: 50%;
                border: 2px solid #e5e7eb;
                flex-shrink: 0;
            }
            .gh-dropdown-header-info {
                display: flex; flex-direction: column;
                overflow: hidden; /* Needed for text truncation */
                width: 100%;
            }
            .gh-dropdown-header-name {
                font-size: 14px; font-weight: 700; color: #111;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .gh-dropdown-header-login {
                font-size: 12px; color: #6b7280;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .gh-dropdown-item {
                display: flex;
                align-items: center;
                gap: 10px;
                width: 100%;
                padding: 11px 16px;
                background: none;
                border: none;
                font-size: 13px;
                font-family: inherit;
                color: #374151;
                cursor: pointer;
                text-decoration: none;
                transition: background 0.15s;
            }
            .gh-dropdown-item:hover { background: #f9fafb; }
            .gh-dropdown-item svg {
                width: 16px; height: 16px; flex-shrink: 0;
            }

            .gh-dropdown-divider {
                height: 1px; background: #f0f0f0; margin: 0;
            }

            .gh-dropdown-item.danger { color: #ef4444; }
            .gh-dropdown-item.danger:hover { background: #fef2f2; }
        `;
        document.head.appendChild(style);
    }

    // ── UI Rendering ────────────────────────────────────────────
    function renderAuthUI() {
        // Remove existing
        const existing = document.getElementById('gh-auth-container');
        if (existing) existing.remove();

        // Only render the profile widget if logged in (no login button here — that's on login.html)
        if (!isLoggedIn()) return;

        const user = getUser();
        const container = document.createElement('div');
        container.id = 'gh-auth-container';
        container.innerHTML = `
            <div id="gh-user-profile">
                <img id="gh-user-avatar" src="${user.avatar}" alt="${user.login}" title="${user.name}" />
                <div id="gh-dropdown">
                    <div class="gh-dropdown-header">
                        <img src="${user.avatar}" alt="${user.login}" />
                        <div class="gh-dropdown-header-info">
                            <span class="gh-dropdown-header-name">${user.name}</span>
                            <span class="gh-dropdown-header-login">@${user.login}</span>
                        </div>
                    </div>
                    <a href="https://github.com/${user.login}" target="_blank" class="gh-dropdown-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        Your Profile
                    </a>
                    <a href="https://github.com/settings/profile" target="_blank" class="gh-dropdown-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                        Settings
                    </a>
                    <div class="gh-dropdown-divider"></div>
                    <button id="gh-logout-btn" class="gh-dropdown-item danger">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        Sign Out
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(container);
        bindAuthEvents();
    }

    // ── Event Binding ───────────────────────────────────────────
    function bindAuthEvents() {
        // Profile toggle dropdown
        const profile = document.getElementById('gh-user-profile');
        const dropdown = document.getElementById('gh-dropdown');
        if (profile && dropdown) {
            profile.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('open');
            });

            document.addEventListener('click', (e) => {
                if (!profile.contains(e.target)) {
                    dropdown.classList.remove('open');
                }
            });
        }

        // Logout button — trigger CMS logout
        const logoutBtn = document.getElementById('gh-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
    }

    // ── Initialize ──────────────────────────────────────────────
    async function initAuth() {
        const loggedIn = await enforceLogin();
        if (!loggedIn) return;

        injectAuthStyles();
        renderAuthUI();
    }

    // Boot
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAuth);
    } else {
        initAuth();
    }

    // Expose for other modules
    window.GHAuth = { isLoggedIn, getUser, handleLogout };
})();
