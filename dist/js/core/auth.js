// AUTH - Authentication System
// AWS Cognito-compatible authentication with OAuth providers

class AuthSystem {
    constructor() {
        this.storageKey = 'aegis_auth_session';
        this.apiBaseUrl = this.getApiBaseUrl();
        this.currentUser = null;
        this.session = null;
        this.init();
    }

    init() {
        console.log('[Auth] Initializing authentication system...');
        this.loadSession();
        this.checkAuthState();
    }

    // Local development detection (supports file:// usage on Windows)
    isLocalDev() {
        try {
            const host = (window.location && window.location.hostname) ? window.location.hostname : '';
            const protocol = (window.location && window.location.protocol) ? window.location.protocol : '';
            return (
                protocol === 'file:' ||
                host === '' ||
                host === 'localhost' ||
                host === '127.0.0.1'
            );
        } catch (_) {
            return true;
        }
    }

    getApiBaseUrl() {
        // AWS-ready: Use environment variable or default to relative path
        // In production, this will be your API Gateway URL
        if (typeof process !== 'undefined' && process.env?.API_BASE_URL) {
            return process.env.API_BASE_URL;
        }
        // For local development, use relative paths
        return '/api';
    }

    // Session Management
    loadSession() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.session = JSON.parse(stored);
                this.currentUser = this.session.user || null;
                return this.session;
            }
        } catch (e) {
            console.error('[Auth] Failed to load session:', e);
        }
        return null;
    }

    saveSession(session) {
        try {
            this.session = session;
            this.currentUser = session.user || null;
            localStorage.setItem(this.storageKey, JSON.stringify(session));
            return true;
        } catch (e) {
            console.error('[Auth] Failed to save session:', e);
            return false;
        }
    }

    clearSession() {
        try {
            localStorage.removeItem(this.storageKey);
            this.session = null;
            this.currentUser = null;
            return true;
        } catch (e) {
            console.error('[Auth] Failed to clear session:', e);
            return false;
        }
    }

    // Check if user is authenticated
    isAuthenticated() {
        if (!this.session || !this.session.token) {
            return false;
        }
        
        // Check token expiry
        if (this.session.expiresAt && Date.now() > this.session.expiresAt) {
            console.log('[Auth] Session expired');
            this.clearSession();
            return false;
        }
        
        return true;
    }

    // Check auth state and redirect if needed
    checkAuthState() {
        const isLoginPage = window.location.pathname.includes('login.html');
        const isAuthenticated = this.isAuthenticated();

        if (!isAuthenticated && !isLoginPage) {
            // Redirect to login
            console.log('[Auth] Not authenticated, redirecting to login...');
            window.location.href = 'login.html';
        } else if (isAuthenticated && isLoginPage) {
            // Redirect to desktop
            console.log('[Auth] Already authenticated, redirecting to desktop...');
            window.location.href = 'desktop.html';
        }
    }

    // OAuth Methods
    async signInWithGoogle() {
        try {
            this.showLoading();
            
            // AWS Cognito-compatible OAuth flow
            // In production, this would redirect to Cognito hosted UI
            // For now, simulate OAuth flow
            
            // Simulate OAuth redirect
            const googleAuthUrl = `${this.apiBaseUrl}/auth/google`;
            
            // For local development (including file://), use simulated flow
            if (this.isLocalDev()) {
                // Simulate successful OAuth
                const mockUser = {
                    userId: `google_${Date.now()}`,
                    name: 'Google User',
                    email: 'user@gmail.com',
                    profileImage: 'https://via.placeholder.com/150',
                    provider: 'google'
                };
                
                await this.handleOAuthSuccess(mockUser, 'google');
            } else {
                // Production: Redirect to OAuth provider
                window.location.href = googleAuthUrl;
            }
        } catch (error) {
            console.error('[Auth] Google sign-in error:', error);
            this.hideLoading();
            alert('Failed to sign in with Google. Please try again.');
        }
    }

    async signInWithApple() {
        try {
            this.showLoading();
            
            // AWS Cognito-compatible Apple OAuth flow
            const appleAuthUrl = `${this.apiBaseUrl}/auth/apple`;
            
            if (this.isLocalDev()) {
                // Simulate successful OAuth
                const mockUser = {
                    userId: `apple_${Date.now()}`,
                    name: 'Apple User',
                    email: 'user@icloud.com',
                    profileImage: 'https://via.placeholder.com/150',
                    provider: 'apple'
                };
                
                await this.handleOAuthSuccess(mockUser, 'apple');
            } else {
                window.location.href = appleAuthUrl;
            }
        } catch (error) {
            console.error('[Auth] Apple sign-in error:', error);
            this.hideLoading();
            alert('Failed to sign in with Apple. Please try again.');
        }
    }

    async handleOAuthSuccess(user, provider) {
        try {
            // Generate JWT token (in production, backend would do this)
            const token = this.generateMockToken(user);
            const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days

            const session = {
                token: token,
                user: user,
                provider: provider,
                expiresAt: expiresAt,
                createdAt: Date.now()
            };

            this.saveSession(session);
            this.hideLoading();

            // Redirect to desktop
            window.location.href = 'desktop.html';
        } catch (error) {
            console.error('[Auth] OAuth success handler error:', error);
            this.hideLoading();
            alert('Failed to complete sign-in. Please try again.');
        }
    }

    // Phone OAuth (OTP)
    showPhoneSignIn() {
        const phoneView = document.getElementById('phone-view');
        const signinView = document.getElementById('signin-view');
        
        if (phoneView && signinView) {
            signinView.style.display = 'none';
            phoneView.style.display = 'block';
        }
    }

    showPhoneSignUp() {
        this.showPhoneSignIn(); // Same view for sign up
    }

    async handlePhoneSignIn(event) {
        event.preventDefault();
        
        const phoneInput = document.getElementById('phone-number');
        const otpGroup = document.getElementById('otp-group');
        const otpInput = document.getElementById('otp-code');
        const submitBtn = document.getElementById('phone-submit-btn');
        
        if (!phoneInput || !otpGroup || !otpInput || !submitBtn) return;

        const phoneNumber = phoneInput.value.trim();
        
        if (!otpGroup.style.display || otpGroup.style.display === 'none') {
            // Step 1: Send OTP
            try {
                this.showLoading();
                submitBtn.textContent = 'Sending...';
                
                // Call backend to send OTP
                const response = await fetch(`${this.apiBaseUrl}/auth/phone/send-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: phoneNumber })
                });

                if (response.ok || this.isLocalDev()) {
                    // Show OTP input
                    otpGroup.style.display = 'block';
                    submitBtn.textContent = 'Verify Code';
                    phoneInput.disabled = true;
                    this.hideLoading();
                    
                    // Focus OTP input
                    setTimeout(() => otpInput.focus(), 100);
                } else {
                    throw new Error('Failed to send OTP');
                }
            } catch (error) {
                console.error('[Auth] OTP send error:', error);
                this.hideLoading();
                submitBtn.textContent = 'Send Code';
                
                // For local dev, simulate OTP
                if (this.isLocalDev()) {
                    otpGroup.style.display = 'block';
                    submitBtn.textContent = 'Verify Code';
                    phoneInput.disabled = true;
                    alert('Demo mode: Enter any 6-digit code to continue');
                } else {
                    alert('Failed to send verification code. Please try again.');
                }
            }
        } else {
            // Step 2: Verify OTP
            const otpCode = otpInput.value.trim();
            
            if (otpCode.length !== 6) {
                alert('Please enter a valid 6-digit code');
                return;
            }

            try {
                this.showLoading();
                submitBtn.textContent = 'Verifying...';
                
                // Call backend to verify OTP
                const response = await fetch(`${this.apiBaseUrl}/auth/phone/verify-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: phoneNumber, code: otpCode })
                });

                if (response.ok || this.isLocalDev()) {
                    const data = await (response.ok ? response.json() : Promise.resolve({
                        user: {
                            userId: `phone_${Date.now()}`,
                            name: phoneNumber,
                            email: null,
                            phone: phoneNumber,
                            profileImage: null,
                            provider: 'phone'
                        }
                    }));

                    await this.handleOAuthSuccess(data.user, 'phone');
                } else {
                    throw new Error('Invalid verification code');
                }
            } catch (error) {
                console.error('[Auth] OTP verify error:', error);
                this.hideLoading();
                submitBtn.textContent = 'Verify Code';
                alert('Invalid verification code. Please try again.');
            }
        }
    }

    // Email/Password Auth
    async handleEmailSignIn(event) {
        event.preventDefault();
        
        const emailInput = document.getElementById('signin-email');
        const passwordInput = document.getElementById('signin-password');
        const rememberCheckbox = document.getElementById('signin-remember');
        
        if (!emailInput || !passwordInput) return;

        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const remember = rememberCheckbox?.checked || false;

        try {
            this.showLoading();

            // Local dev (including file://): skip backend and accept any credentials
            if (this.isLocalDev()) {
                const data = {
                    user: {
                        userId: `email_${Date.now()}`,
                        name: email ? email.split('@')[0] : 'Developer',
                        email: email || 'dev@local',
                        profileImage: null,
                        provider: 'email'
                    },
                    token: this.generateMockToken({ email: email || 'dev@local' })
                };

                const expiresAt = remember 
                    ? Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
                    : Date.now() + (24 * 60 * 60 * 1000); // 1 day

                const session = {
                    token: data.token,
                    user: data.user,
                    provider: 'email',
                    expiresAt: expiresAt,
                    createdAt: Date.now()
                };

                this.saveSession(session);
                this.hideLoading();
                window.location.href = 'desktop.html';
                return;
            }

            // Production: Call backend API
            const response = await fetch(`${this.apiBaseUrl}/auth/signin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: 'Sign-in failed' }));
                throw new Error(error.message || 'Invalid email or password');
            }

            const data = await response.json();
            const expiresAt = remember
                ? Date.now() + (30 * 24 * 60 * 60 * 1000)
                : Date.now() + (24 * 60 * 60 * 1000);

            const session = {
                token: data.token,
                user: data.user,
                provider: 'email',
                expiresAt: expiresAt,
                createdAt: Date.now()
            };

            this.saveSession(session);
            this.hideLoading();
            window.location.href = 'desktop.html';
        } catch (error) {
            console.error('[Auth] Email sign-in error:', error);
            this.hideLoading();
            alert(error.message || 'Failed to sign in. Please try again.');
        }
    }

    async handleEmailSignUp(event) {
        event.preventDefault();
        
        const nameInput = document.getElementById('signup-name');
        const emailInput = document.getElementById('signup-email');
        const passwordInput = document.getElementById('signup-password');
        const termsCheckbox = document.getElementById('signup-terms');
        
        if (!nameInput || !emailInput || !passwordInput || !termsCheckbox) return;

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!termsCheckbox.checked) {
            alert('Please agree to the Terms of Service and Privacy Policy');
            return;
        }

        if (password.length < 8) {
            alert('Password must be at least 8 characters long');
            return;
        }

        try {
            this.showLoading();

            // Local dev (including file://): skip backend and create session immediately
            if (this.isLocalDev()) {
                const data = {
                    user: {
                        userId: `email_${Date.now()}`,
                        name: name || 'Developer',
                        email: email || 'dev@local',
                        profileImage: null,
                        provider: 'email'
                    },
                    token: this.generateMockToken({ email: email || 'dev@local' })
                };

                const session = {
                    token: data.token,
                    user: data.user,
                    provider: 'email',
                    expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000),
                    createdAt: Date.now()
                };

                this.saveSession(session);
                this.hideLoading();
                window.location.href = 'desktop.html';
                return;
            }

            // Production: Call backend API
            const response = await fetch(`${this.apiBaseUrl}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: 'Sign-up failed' }));
                throw new Error(error.message || 'Failed to create account');
            }

            const data = await response.json();
            const session = {
                token: data.token,
                user: data.user,
                provider: 'email',
                expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000),
                createdAt: Date.now()
            };

            this.saveSession(session);
            this.hideLoading();
            window.location.href = 'desktop.html';
        } catch (error) {
            console.error('[Auth] Email sign-up error:', error);
            this.hideLoading();
            alert(error.message || 'Failed to create account. Please try again.');
        }
    }

    async handleForgotPassword(event) {
        event.preventDefault();
        
        const emailInput = document.getElementById('forgot-email');
        if (!emailInput) return;

        const email = emailInput.value.trim();

        try {
            this.showLoading();
            
            await fetch(`${this.apiBaseUrl}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            this.hideLoading();
            alert('Password reset link sent to your email!');
            this.showSignIn();
        } catch (error) {
            console.error('[Auth] Forgot password error:', error);
            this.hideLoading();
            alert('Failed to send reset link. Please try again.');
        }
    }

    // UI Helpers
    showSignIn() {
        this.showView('signin-view');
    }

    showSignUp() {
        this.showView('signup-view');
    }

    showForgotPassword() {
        this.showView('forgot-view');
    }

    showView(viewId) {
        const views = ['signin-view', 'signup-view', 'phone-view', 'forgot-view'];
        views.forEach(id => {
            const view = document.getElementById(id);
            if (view) {
                view.style.display = id === viewId ? 'block' : 'none';
            }
        });
    }

    showLoading() {
        const loading = document.getElementById('auth-loading');
        if (loading) {
            loading.style.display = 'flex';
        }
    }

    hideLoading() {
        const loading = document.getElementById('auth-loading');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    // Sign Out
    async signOut() {
        try {
            // Call backend to invalidate token
            if (this.session?.token) {
                await fetch(`${this.apiBaseUrl}/auth/signout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.session.token}`
                    }
                }).catch(() => {
                    // Ignore errors on signout
                });
            }

            this.clearSession();
            window.location.href = 'login.html';
        } catch (error) {
            console.error('[Auth] Sign-out error:', error);
            this.clearSession();
            window.location.href = 'login.html';
        }
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Get auth token
    getAuthToken() {
        return this.session?.token || null;
    }

    // Mock token generator (for local dev)
    generateMockToken(user) {
        // In production, backend generates real JWT
        const payload = {
            sub: user.userId || user.email,
            email: user.email,
            name: user.name,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000)
        };
        
        // Base64 encode (not secure, but works for local dev)
        return btoa(JSON.stringify(payload));
    }
}

// Initialize Auth System
let authSystem;
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            authSystem = new AuthSystem();
            window.authSystem = authSystem;
        });
    } else {
        authSystem = new AuthSystem();
        window.authSystem = authSystem;
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthSystem;
}
