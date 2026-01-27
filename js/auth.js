// Authentication Helper Functions

const AUTH_TOKEN_KEY = 'session_token';
const AUTH_USER_KEY = 'user_data';
const AUTH_ADMIN_KEY = 'admin_data';

// Store session token
function setSessionToken(token, isAdmin = false) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    if (isAdmin) {
        localStorage.setItem('is_admin', 'true');
    }
}

// Get session token
function getSessionToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

// Check if user is logged in
function isLoggedIn() {
    return !!getSessionToken();
}

// Check if user is admin
function isAdmin() {
    return localStorage.getItem('is_admin') === 'true';
}

// Store user data
function setUserData(userData) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userData));
}

// Get user data
function getUserData() {
    const data = localStorage.getItem(AUTH_USER_KEY);
    return data ? JSON.parse(data) : null;
}

// Store admin data
function setAdminData(adminData) {
    localStorage.setItem(AUTH_ADMIN_KEY, JSON.stringify(adminData));
}

// Get admin data
function getAdminData() {
    const data = localStorage.getItem(AUTH_ADMIN_KEY);
    return data ? JSON.parse(data) : null;
}

// Logout
function logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_ADMIN_KEY);
    localStorage.removeItem('is_admin');
}

// Validate session with server
async function validateSession() {
    const token = getSessionToken();
    if (!token) return null;

    try {
        const response = await fetch('/.netlify/functions/auth-check-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            logout();
            return null;
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Session validation error:', error);
        return null;
    }
}

// Request magic link
async function requestMagicLink(email) {
    try {
        const response = await fetch('/.netlify/functions/auth-send-magic-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();
        return { success: response.ok, ...data };
    } catch (error) {
        console.error('Magic link request error:', error);
        return { success: false, error: 'Network error' };
    }
}

// Verify magic link token
async function verifyMagicLink(token, email) {
    try {
        const response = await fetch('/.netlify/functions/auth-verify-magic-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, email })
        });

        const data = await response.json();

        if (response.ok && data.session_token) {
            setSessionToken(data.session_token, false);
            setUserData(data.user);
            return { success: true, user: data.user };
        }

        return { success: false, error: data.error || 'Verification failed' };
    } catch (error) {
        console.error('Magic link verification error:', error);
        return { success: false, error: 'Network error' };
    }
}

// Admin login
async function adminLogin(email, password) {
    try {
        const response = await fetch('/.netlify/functions/auth-admin-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok && data.session_token) {
            setSessionToken(data.session_token, true);
            setAdminData(data.admin);
            return { success: true, admin: data.admin };
        }

        return { success: false, error: data.error || 'Login failed' };
    } catch (error) {
        console.error('Admin login error:', error);
        return { success: false, error: 'Network error' };
    }
}

// Require authentication - redirect if not logged in
function requireAuth(redirectUrl = '/portal/login.html') {
    if (!isLoggedIn()) {
        window.location.href = redirectUrl;
        return false;
    }
    return true;
}

// Require admin authentication
function requireAdmin(redirectUrl = '/admin/login.html') {
    if (!isLoggedIn() || !isAdmin()) {
        window.location.href = redirectUrl;
        return false;
    }
    return true;
}

// Export functions
window.auth = {
    setSessionToken,
    getSessionToken,
    isLoggedIn,
    isAdmin,
    setUserData,
    getUserData,
    setAdminData,
    getAdminData,
    logout,
    validateSession,
    requestMagicLink,
    verifyMagicLink,
    adminLogin,
    requireAuth,
    requireAdmin
};
