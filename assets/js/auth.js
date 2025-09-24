// Authentication Management for Recipe Finder
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.initializeAuth();
    }

    initializeAuth() {
        this.loadUserFromStorage();
        this.bindAuthEvents();
        this.updateAuthUI();
    }

    // Event Binding
    bindAuthEvents() {
        // Auth button events
        const loginBtn = document.getElementById('login-btn');
        const signupBtn = document.getElementById('signup-btn');
        const logoutBtn = document.getElementById('logout-btn');

        if (loginBtn) loginBtn.addEventListener('click', () => this.showAuthModal('login'));
        if (signupBtn) signupBtn.addEventListener('click', () => this.showAuthModal('signup'));
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());

        // Modal events
        const authModal = document.getElementById('auth-modal');
        const authModalClose = document.getElementById('auth-modal-close');

        if (authModalClose) authModalClose.addEventListener('click', () => this.hideAuthModal());
        if (authModal) {
            authModal.addEventListener('click', (e) => {
                if (e.target === authModal) {
                    this.hideAuthModal();
                }
            });
        }

        // Form switch events
        const showSignup = document.getElementById('show-signup');
        const showLogin = document.getElementById('show-login');

        if (showSignup) showSignup.addEventListener('click', (e) => {
            e.preventDefault();
            this.showAuthForm('signup');
        });
        if (showLogin) showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            this.showAuthForm('login');
        });

        // Form submission events
        const loginForm = document.getElementById('login-form-element');
        const signupForm = document.getElementById('signup-form-element');

        if (loginForm) loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        if (signupForm) signupForm.addEventListener('submit', (e) => this.handleSignup(e));

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAuthModal();
            }
        });
    }

    // Authentication Methods
    async handleSignup(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const userData = {
            email: document.getElementById('signup-email').value,
            password: document.getElementById('signup-password').value,
            fullName: document.getElementById('signup-name').value
        };

        if (!this.validateSignupData(userData)) {
            return;
        }

        this.showLoading('Creating your account...');

        try {
            const response = await fetch(`${CONFIG.API.BASE_URL}/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const result = await response.json();

            if (result.success) {
                this.setUser(result.data.user, result.data.token);
                this.hideAuthModal();
                this.showSuccess(`Welcome to Recipe Finder, ${result.data.user.full_name || result.data.user.email}!`);
                
                // Redirect to pantry page after successful signup
                setTimeout(() => {
                    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                        window.location.href = 'pantry.html';
                    }
                }, 1500);
            } else {
                this.showError(result.error || 'Signup failed');
            }
        } catch (error) {
            console.error('Signup error:', error);
            this.showError('Network error. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const userData = {
            email: document.getElementById('login-email').value,
            password: document.getElementById('login-password').value
        };

        if (!this.validateLoginData(userData)) {
            return;
        }

        this.showLoading('Signing you in...');

        try {
            const response = await fetch(`${CONFIG.API.BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const result = await response.json();

            if (result.success) {
                this.setUser(result.data.user, result.data.token);
                this.hideAuthModal();
                this.showSuccess(`Welcome back, ${result.data.user.full_name || result.data.user.email}!`);
                
                // Redirect to pantry page after successful login
                setTimeout(() => {
                    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                        window.location.href = 'pantry.html';
                    }
                }, 1500);
            } else {
                this.showError(result.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Network error. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    logout() {
        this.currentUser = null;
        this.token = null;
        this.clearUserFromStorage();
        this.updateAuthUI();
        this.showSuccess('You have been logged out');
    }

    // UI Management
    showAuthModal(formType = 'login') {
        const modal = document.getElementById('auth-modal');
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            this.showAuthForm(formType);
        }
    }

    hideAuthModal() {
        const modal = document.getElementById('auth-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            this.clearAuthForms();
        }
    }

    showAuthForm(formType) {
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');

        if (formType === 'login') {
            if (loginForm) loginForm.style.display = 'block';
            if (signupForm) signupForm.style.display = 'none';
        } else {
            if (loginForm) loginForm.style.display = 'none';
            if (signupForm) signupForm.style.display = 'block';
        }
    }

    clearAuthForms() {
        const loginForm = document.getElementById('login-form-element');
        const signupForm = document.getElementById('signup-form-element');

        if (loginForm) loginForm.reset();
        if (signupForm) signupForm.reset();
    }

    updateAuthUI() {
        const userMenu = document.getElementById('user-menu');
        const authButtons = document.getElementById('auth-buttons');
        const userName = document.getElementById('user-name');

        if (this.currentUser) {
            // User is logged in
            if (userMenu) userMenu.style.display = 'flex';
            if (authButtons) authButtons.style.display = 'none';
            if (userName) userName.textContent = this.currentUser.full_name || this.currentUser.email;
        } else {
            // User is not logged in
            if (userMenu) userMenu.style.display = 'none';
            if (authButtons) authButtons.style.display = 'flex';
        }
    }

    // User Management
    setUser(user, token) {
        this.currentUser = user;
        this.token = token;
        this.saveUserToStorage();
        this.updateAuthUI();
    }

    isLoggedIn() {
        return this.currentUser !== null && this.token !== null;
    }

    getToken() {
        return this.token;
    }

    getUser() {
        return this.currentUser;
    }

    getAuthHeaders() {
        if (this.token) {
            return {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            };
        }
        return {
            'Content-Type': 'application/json'
        };
    }

    // Storage Management
    saveUserToStorage() {
        try {
            const userData = {
                user: this.currentUser,
                token: this.token,
                timestamp: Date.now()
            };
            localStorage.setItem(CONFIG.STORAGE.USER_DATA, JSON.stringify(userData));
        } catch (error) {
            console.warn('Failed to save user data:', error);
        }
    }

    loadUserFromStorage() {
        try {
            const saved = localStorage.getItem(CONFIG.STORAGE.USER_DATA);
            if (saved) {
                const userData = JSON.parse(saved);
                
                // Check if token is still valid (7 days)
                const tokenAge = Date.now() - userData.timestamp;
                const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
                
                if (tokenAge < maxAge) {
                    this.currentUser = userData.user;
                    this.token = userData.token;
                } else {
                    this.clearUserFromStorage();
                }
            }
        } catch (error) {
            console.warn('Failed to load user data:', error);
            this.clearUserFromStorage();
        }
    }

    clearUserFromStorage() {
        try {
            localStorage.removeItem(CONFIG.STORAGE.USER_DATA);
        } catch (error) {
            console.warn('Failed to clear user data:', error);
        }
    }

    // Validation
    validateSignupData(data) {
        if (!data.email || !data.password || !data.fullName) {
            this.showError('All fields are required');
            return false;
        }

        if (data.password.length < 6) {
            this.showError('Password must be at least 6 characters');
            return false;
        }

        if (!this.isValidEmail(data.email)) {
            this.showError('Please enter a valid email address');
            return false;
        }

        return true;
    }

    validateLoginData(data) {
        if (!data.email || !data.password) {
            this.showError('Email and password are required');
            return false;
        }

        return true;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Utility Methods
    showLoading(message) {
        // Use the existing loading system from app.js
        if (window.app && window.app.showLoading) {
            window.app.showLoading(message);
        }
    }

    hideLoading() {
        if (window.app && window.app.hideLoading) {
            window.app.hideLoading();
        }
    }

    showError(message) {
        if (window.app && window.app.showError) {
            window.app.showError(message);
        }
    }

    showSuccess(message) {
        if (window.app && window.app.showSuccess) {
            window.app.showSuccess(message);
        }
    }
}

// Create global auth instance
const authManager = new AuthManager();
window.authManager = authManager;
