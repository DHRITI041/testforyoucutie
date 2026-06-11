// Auth UI and Logic Controller

const authModalHTML = `
<div id="auth-modal" class="overlay hidden">
    <div class="modal-card auth-card">
        <div class="modal-header">
            <h3 id="auth-title">Welcome Back</h3>
            <button id="btn-close-auth" class="btn-close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
            
            <div class="auth-tabs">
                <button id="tab-signin" class="auth-tab active">Sign In</button>
                <button id="tab-signup" class="auth-tab">Sign Up</button>
            </div>

            <!-- Email Form -->
            <form id="auth-form" onsubmit="event.preventDefault(); handleAuthSubmit();">
                <div class="form-group">
                    <label>Email Address</label>
                    <input type="email" id="auth-email" placeholder="you@example.com" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="auth-password" placeholder="••••••••" class="form-control" required minlength="6">
                </div>
                
                <div id="auth-error" class="alert alert-danger hidden" style="color: #ef4444; font-size: 0.9rem; margin-top: 0.5rem;"></div>
                <div id="auth-success" class="alert alert-success hidden" style="color: #10b981; font-size: 0.9rem; margin-top: 0.5rem;"></div>

                <button type="submit" id="btn-auth-submit" class="btn-primary" style="width: 100%; margin-top: 1rem;">Sign In</button>
            </form>

            <div class="auth-divider">
                <span>OR</span>
            </div>

            <!-- Social Logins -->
            <button id="btn-google-login" class="btn-social" onclick="handleSocialLogin('google')">
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google"> Continue with Google
            </button>
            <button id="btn-apple-login" class="btn-social" onclick="handleSocialLogin('apple')">
                <i class="fa-brands fa-apple" style="font-size: 1.2rem;"></i> Continue with Apple
            </button>

        </div>
    </div>
</div>
`;

// Inject HTML
document.body.insertAdjacentHTML('beforeend', authModalHTML);

// Elements
const authModal = document.getElementById('auth-modal');
const btnCloseAuth = document.getElementById('btn-close-auth');
const tabSignIn = document.getElementById('tab-signin');
const tabSignUp = document.getElementById('tab-signup');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const btnAuthSubmit = document.getElementById('btn-auth-submit');
const authError = document.getElementById('auth-error');
const authSuccess = document.getElementById('auth-success');
const emailInput = document.getElementById('auth-email');
const passwordInput = document.getElementById('auth-password');

let isSignUpMode = false;
let onAuthSuccessCallback = null;

// Tab Switching
tabSignIn.addEventListener('click', () => {
    isSignUpMode = false;
    tabSignIn.classList.add('active');
    tabSignUp.classList.remove('active');
    authTitle.textContent = "Welcome Back";
    btnAuthSubmit.textContent = "Sign In";
    authError.classList.add('hidden');
    authSuccess.classList.add('hidden');
});

tabSignUp.addEventListener('click', () => {
    isSignUpMode = true;
    tabSignUp.classList.add('active');
    tabSignIn.classList.remove('active');
    authTitle.textContent = "Create an Account";
    btnAuthSubmit.textContent = "Sign Up";
    authError.classList.add('hidden');
    authSuccess.classList.add('hidden');
});

btnCloseAuth.addEventListener('click', () => {
    authModal.classList.add('hidden');
    onAuthSuccessCallback = null;
});

// Global open function
window.openAuthModal = function(callback) {
    onAuthSuccessCallback = callback;
    authModal.classList.remove('hidden');
};

// Global require auth function
window.requireAuth = async function(callback) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        callback();
    } else {
        window.openAuthModal(callback);
    }
}

// Global handle auth submit
window.handleAuthSubmit = async function() {
    authError.classList.add('hidden');
    authSuccess.classList.add('hidden');
    btnAuthSubmit.disabled = true;
    btnAuthSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    let result;
    if (isSignUpMode) {
        result = await supabase.auth.signUp({ email, password });
    } else {
        result = await supabase.auth.signInWithPassword({ email, password });
    }

    btnAuthSubmit.disabled = false;
    btnAuthSubmit.textContent = isSignUpMode ? "Sign Up" : "Sign In";

    if (result.error) {
        authError.textContent = result.error.message;
        authError.classList.remove('hidden');
    } else {
        if (isSignUpMode && !result.data.session) {
            authSuccess.textContent = "Please check your email for a confirmation link.";
            authSuccess.classList.remove('hidden');
        } else {
            authModal.classList.add('hidden');
            if (onAuthSuccessCallback) {
                onAuthSuccessCallback();
                onAuthSuccessCallback = null;
            }
        }
    }
};

// Global handle social login
window.handleSocialLogin = async function(provider) {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
            redirectTo: window.location.origin + window.location.pathname
        }
    });
    if (error) {
        authError.textContent = error.message;
        authError.classList.remove('hidden');
    }
};

// Global handle logout
window.handleSignOut = async function() {
    await supabase.auth.signOut();
    window.location.reload();
}

// Update UI based on auth state
supabase.auth.onAuthStateChange((event, session) => {
    const navRight = document.querySelector('.nav-right');
    if (!navRight) return;

    if (session) {
        // Logged in
        btnCloseAuth.style.display = 'block';
        document.body.style.overflow = 'auto';
        
        navRight.innerHTML = `
            <div class="user-profile-nav" style="display: flex; align-items: center; gap: 1rem;">
                <span style="font-size: 0.9rem; color: var(--text);">${session.user.email}</span>
                <button onclick="handleSignOut()" class="btn-dark-outline" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">Sign Out</button>
            </div>
        `;
        if (onAuthSuccessCallback) {
            authModal.classList.add('hidden');
            onAuthSuccessCallback();
            onAuthSuccessCallback = null;
        } else {
            authModal.classList.add('hidden');
        }
    } else {
        // Logged out (FORCED LOGIN)
        btnCloseAuth.style.display = 'none';
        document.body.style.overflow = 'hidden'; // Prevent scrolling background
        
        navRight.innerHTML = `
            <button class="btn-text" onclick="window.openAuthModal()">Log In</button>
            <button class="btn-primary" onclick="tabSignUp.click(); window.openAuthModal();" style="padding: 0.4rem 1rem;">Sign Up</button>
        `;
        
        // Force the modal open if they are not logged in
        window.openAuthModal();
    }
});
