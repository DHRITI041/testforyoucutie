const AuthSystem = {
    user: null,
    pendingCallback: null,

    init: async function() {
        if (!document.getElementById('auth-modal-container')) {
            this.injectHTML();
            this.setupEventListeners();
        }
        
        // Listen to auth state changes
        supabase.auth.onAuthStateChange((event, session) => {
            this.user = session?.user || null;
            this.updateNavbar();
            
            if (event === 'SIGNED_IN' && this.user) {
                this.closeModal();
                if (this.pendingCallback) {
                    this.pendingCallback();
                    this.pendingCallback = null;
                }
            }
        });

        try {
            // Get initial session
            const { data: { session } } = await supabase.auth.getSession();
            this.user = session?.user || null;
            this.updateNavbar();
        } catch (err) {
            console.error("Error fetching session:", err);
            this.updateNavbar();
        }
    },

    injectHTML: function() {
        const container = document.createElement('div');
        container.id = 'auth-modal-container';
        container.innerHTML = `
            <div id="auth-modal" class="overlay hidden" style="z-index: 9999;">
                <div class="modal-card" style="max-width: 400px; padding: 0;">
                    <div class="auth-header" style="padding: 1.5rem; text-align: center; border-bottom: 1px solid var(--border);">
                        <button id="btn-close-auth" class="btn-close" style="position: absolute; top: 1rem; right: 1rem;"><i class="fa-solid fa-xmark"></i></button>
                        <h2 style="margin: 0; font-size: 1.5rem; color: var(--text);" id="auth-title">Sign In</h2>
                        <p style="color: var(--text-muted); margin-top: 0.5rem; font-size: 0.9rem;" id="auth-subtitle">Login to access exams</p>
                    </div>
                    
                    <div class="auth-tabs" style="display: flex; border-bottom: 1px solid var(--border);">
                        <button id="tab-signin" class="auth-tab active" style="flex: 1; padding: 1rem; border: none; background: transparent; cursor: pointer; font-weight: 600; color: var(--primary); border-bottom: 2px solid var(--primary);">Sign In</button>
                        <button id="tab-signup" class="auth-tab" style="flex: 1; padding: 1rem; border: none; background: transparent; cursor: pointer; font-weight: 600; color: var(--text-muted); border-bottom: 2px solid transparent;">Sign Up</button>
                    </div>

                    <div style="padding: 1.5rem;">
                        <div id="auth-error-msg" class="hidden" style="background: #fee2e2; color: #ef4444; padding: 0.75rem; border-radius: 0.5rem; margin-bottom: 1rem; font-size: 0.85rem; border: 1px solid #fca5a5;"></div>
                        
                        <div class="form-group">
                            <label>Email Address</label>
                            <input type="email" id="auth-email" class="form-control" placeholder="you@example.com">
                        </div>
                        <div class="form-group">
                            <label>Password</label>
                            <div style="position: relative;">
                                <input type="password" id="auth-password" class="form-control" placeholder="••••••••" style="padding-right: 2.5rem;">
                                <button id="btn-toggle-password" type="button" style="position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; width: 24px; height: 24px;">
                                    <i class="fa-regular fa-eye"></i>
                                </button>
                            </div>
                        </div>

                        <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; margin-top: 1rem; margin-bottom: 1rem;">
                            <label style="display: flex; align-items: center; gap: 0.5rem; margin: 0; cursor: pointer; font-size: 0.9rem; color: var(--text-muted); font-weight: normal;">
                                <input type="checkbox" id="auth-remember" style="width: auto; margin: 0;">
                                Remember me
                            </label>
                        </div>
                        
                        <button id="btn-submit-auth" class="btn-primary" style="width: 100%; margin-top: 1rem;">Sign In</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(container);
    },

    setupEventListeners: function() {
        document.getElementById('btn-close-auth').addEventListener('click', () => this.closeModal());
        
        document.getElementById('tab-signin').addEventListener('click', () => this.switchTab('signin'));
        document.getElementById('tab-signup').addEventListener('click', () => this.switchTab('signup'));

        document.getElementById('btn-submit-auth').addEventListener('click', () => this.handleSubmit());
        document.getElementById('btn-toggle-password').addEventListener('click', () => this.togglePasswordVisibility());
    },

    togglePasswordVisibility: function() {
        const passwordInput = document.getElementById('auth-password');
        const toggleBtn = document.getElementById('btn-toggle-password');
        const icon = toggleBtn.querySelector('i');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    },

    switchTab: function(mode) {
        const tabSignin = document.getElementById('tab-signin');
        const tabSignup = document.getElementById('tab-signup');
        const title = document.getElementById('auth-title');
        const subtitle = document.getElementById('auth-subtitle');
        const btn = document.getElementById('btn-submit-auth');
        const errorMsg = document.getElementById('auth-error-msg');
        
        errorMsg.classList.add('hidden');

        // Reset password visibility on tab switch
        const passwordInput = document.getElementById('auth-password');
        const toggleBtn = document.getElementById('btn-toggle-password');
        const icon = toggleBtn.querySelector('i');
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');

        if (mode === 'signin') {
            tabSignin.style.color = 'var(--primary)';
            tabSignin.style.borderBottomColor = 'var(--primary)';
            tabSignup.style.color = 'var(--text-muted)';
            tabSignup.style.borderBottomColor = 'transparent';
            title.textContent = 'Sign In';
            subtitle.textContent = 'Login to access exams';
            btn.textContent = 'Sign In';
            btn.dataset.mode = 'signin';
        } else {
            tabSignup.style.color = 'var(--primary)';
            tabSignup.style.borderBottomColor = 'var(--primary)';
            tabSignin.style.color = 'var(--text-muted)';
            tabSignin.style.borderBottomColor = 'transparent';
            title.textContent = 'Create Account';
            subtitle.textContent = 'Sign up to start your journey';
            btn.textContent = 'Sign Up';
            btn.dataset.mode = 'signup';
        }
    },

    handleSubmit: async function() {
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-password').value;
        const btn = document.getElementById('btn-submit-auth');
        const errorMsg = document.getElementById('auth-error-msg');
        const mode = btn.dataset.mode || 'signin';

        if (!email || !password) {
            this.showError("Please enter both email and password.");
            return;
        }

        // Store "Remember me" state before log in
        const rememberCheckbox = document.getElementById('auth-remember');
        if (rememberCheckbox) {
            localStorage.setItem('remember_me', rememberCheckbox.checked ? 'true' : 'false');
        }

        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
        errorMsg.classList.add('hidden');

        try {
            let result;
            if (mode === 'signin') {
                result = await supabase.auth.signInWithPassword({ email, password });
            } else {
                result = await supabase.auth.signUp({ email, password });
                if (result.data?.user && !result.error) {
                    if (!result.data.session) {
                        this.showSuccess("Account created successfully! If your project requires it, please check your email to confirm.");
                        btn.disabled = false;
                        btn.textContent = 'Sign Up';
                        return;
                    }
                }
            }

            btn.disabled = false;
            btn.textContent = mode === 'signin' ? 'Sign In' : 'Sign Up';

            if (result.error) {
                this.showError(result.error.message);
            }
        } catch (err) {
            btn.disabled = false;
            btn.textContent = mode === 'signin' ? 'Sign In' : 'Sign Up';
            this.showError("Network or server error. Please try again.");
            console.error("Auth Exception:", err);
        }
    },

    showError: function(msg) {
        const errorBox = document.getElementById('auth-error-msg');
        errorBox.textContent = msg;
        errorBox.style.background = '#fee2e2';
        errorBox.style.color = '#ef4444';
        errorBox.style.borderColor = '#fca5a5';
        errorBox.classList.remove('hidden');
    },

    showSuccess: function(msg) {
        const errorBox = document.getElementById('auth-error-msg');
        errorBox.textContent = msg;
        errorBox.style.background = '#dcfce7';
        errorBox.style.color = '#16a34a';
        errorBox.style.borderColor = '#86efac';
        errorBox.classList.remove('hidden');
    },

    requireAuth: function(callback) {
        if (this.user) {
            callback();
        } else {
            this.pendingCallback = callback;
            this.openModal();
        }
    },

    openModal: function() {
        document.getElementById('auth-email').value = '';
        document.getElementById('auth-password').value = '';
        const rememberCheckbox = document.getElementById('auth-remember');
        if (rememberCheckbox) {
            rememberCheckbox.checked = localStorage.getItem('remember_me') === 'true';
        }
        document.getElementById('auth-error-msg').classList.add('hidden');
        document.getElementById('auth-modal').classList.remove('hidden');
    },

    closeModal: function() {
        document.getElementById('auth-modal').classList.add('hidden');
        this.pendingCallback = null;
    },

    updateNavbar: function() {
        const navRight = document.querySelector('.nav-right');
        if (!navRight) return;
        
        if (this.user) {
            navRight.innerHTML = `
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <span style="font-size: 0.9rem; color: var(--text-muted); font-weight: 500;"><i class="fa-solid fa-user" style="margin-right: 0.25rem;"></i> ${this.user.email}</span>
                    <button id="btn-logout" class="btn-outline" style="padding: 0.4rem 1rem; font-size: 0.85rem;"><i class="fa-solid fa-right-from-bracket"></i> Logout</button>
                </div>
            `;
            document.getElementById('btn-logout').addEventListener('click', async () => {
                await supabase.auth.signOut();
                window.location.reload();
            });
        } else {
            navRight.innerHTML = `
                <button id="btn-nav-login" class="btn-primary" style="padding: 0.5rem 1.5rem; border-radius: 999px; font-weight: 600;"><i class="fa-regular fa-user"></i> Login / Sign Up</button>
            `;
            document.getElementById('btn-nav-login').addEventListener('click', () => {
                this.requireAuth(() => {
                    // Do nothing on success, they just wanted to log in
                });
            });
        }
    }
};

window.addEventListener('DOMContentLoaded', () => {
    AuthSystem.init();
});

window.requireAuth = (cb) => AuthSystem.requireAuth(cb);
