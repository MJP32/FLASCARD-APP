import React, { useState, useEffect } from 'react';

function LoginScreen({
  authError,
  handleLogin,
  handleRegister,
  handleAnonymousLogin,
  handlePasswordReset,
  email,
  setEmail,
  password,
  setPassword,
  isDarkMode,
  isLoading,
  onToggleDarkMode
}) {
  const [isLoginView, setIsLoginView] = useState(true);
  const [isPasswordResetView, setIsPasswordResetView] = useState(false);
  const [isLocalLoading, setIsLocalLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // Use the more specific loading state for password reset, or fall back to general loading
  const currentLoading = isPasswordResetView ? isLocalLoading : (isLoading || isLocalLoading);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLocalLoading(true);
    try {
      if (isLoginView) {
        await handleLogin(e);
      } else {
        await handleRegister(e);
      }
    } finally {
      setIsLocalLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLocalLoading(true);
    try {
      await handleAnonymousLogin();
    } finally {
      setIsLocalLoading(false);
    }
  };

  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    setIsLocalLoading(true);
    try {
      await handlePasswordReset(resetEmail);
      setResetSuccess(true);
    } finally {
      setIsLocalLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setIsPasswordResetView(false);
    setIsLoginView(true);
    setResetEmail('');
    setResetSuccess(false);
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-8 font-inter login-container transition-all duration-1000 ease-out ${mounted ? 'animate-fadeIn' : 'opacity-0'} ${isDarkMode ? 'dark' : ''} relative`}
      style={{
        background: isDarkMode
          ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)'
          : '#f8fafc'
      }}>
      {/* Dark Mode Toggle */}
      {onToggleDarkMode && (
        <button
          onClick={onToggleDarkMode}
          className={`absolute top-6 right-6 p-3 rounded-full backdrop-blur-xl border transition-all duration-300 hover:scale-110 ${isDarkMode ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-white/20 border-white/30 text-slate-700 hover:bg-white/30'}`}
          style={{ backdropFilter: 'blur(12px)' }}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      )}
      {/* Hero Section */}
      <div className={`${isDarkMode ? 'bg-slate-800/90' : 'bg-white'} rounded-2xl shadow-xl p-8 mb-8 transform hover:scale-105 transition-all duration-500 animate-float border-none`}
        style={{
          animationDelay: '0.2s',
          boxShadow: isDarkMode
            ? '0 20px 40px rgba(0, 0, 0, 0.3)'
            : '0 20px 40px rgba(37, 99, 235, 0.1)'
        }}>
        <div className="text-center space-y-4">
          {/* Logo/Icon */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg"
            style={{
              animationDelay: '0.5s',
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.95) 0%, rgba(79, 70, 229, 0.9) 100%)'
            }}>
            <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className={`text-5xl font-extrabold tracking-tight text-center drop-shadow-lg animate-slideInUp ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
            Smart Flashcards
          </h1>
          <p className={`text-lg font-medium animate-slideInUp ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`} style={{ animationDelay: '0.1s' }}>Master any subject with AI-powered spaced repetition</p>
          <div className="flex justify-center items-center space-x-2 animate-slideInUp" style={{ animationDelay: '0.2s' }}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${isDarkMode ? 'bg-indigo-400' : 'bg-indigo-600'}`}></div>
            <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>FSRS Algorithm</span>
            <div className={`w-2 h-2 rounded-full animate-pulse ${isDarkMode ? 'bg-indigo-400' : 'bg-indigo-600'}`} style={{ animationDelay: '1s' }}></div>
          </div>
        </div>
      </div>
      {/* Login Form */}
      <div className={`w-full max-w-md ${isDarkMode ? 'bg-slate-800/90' : 'bg-white'} rounded-2xl shadow-xl border-none p-8 transform transition-all duration-500`}
        style={{
          boxShadow: isDarkMode
            ? '0 20px 40px rgba(0, 0, 0, 0.3)'
            : '0 20px 40px rgba(37, 99, 235, 0.1)'
        }}>
        <div className="text-center mb-8">
          <h2 className={`text-3xl font-bold mb-2 drop-shadow-lg ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
            {isPasswordResetView ? 'Reset Password' : isLoginView ? 'Welcome Back' : 'Join Us'}
          </h2>
          <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            {isPasswordResetView
              ? 'Enter your email to receive reset instructions'
              : isLoginView
                ? 'Continue your learning journey'
                : 'Start mastering new skills today'
            }
          </p>
        </div>
        {authError && (
          <div className={`backdrop-blur-xl bg-red-500/20 border border-red-400/30 px-6 py-4 rounded-2xl relative mb-6 shadow-xl animate-fadeIn ${isDarkMode ? 'text-white' : 'text-red-800'}`} role="alert"
            style={{ backdropFilter: 'blur(12px)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-500/30 rounded-full flex items-center justify-center">
                <svg className={`w-4 h-4 ${isDarkMode ? 'text-white' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <strong className={`font-semibold ${isDarkMode ? 'text-white' : 'text-red-800'}`}>Authentication Error</strong>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-white/90' : 'text-red-700'}`}>{authError}</p>
              </div>
            </div>
          </div>
        )}
        {isPasswordResetView ? (
          /* Password Reset Form */
          <div className="space-y-6">
            {resetSuccess ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white">Email Sent!</h3>
                <p className="text-white/80">Check your inbox for password reset instructions.</p>
                <button
                  onClick={handleBackToLogin}
                  className="w-full backdrop-blur-xl bg-white/30 hover:bg-white/40 text-white font-semibold py-4 px-6 rounded-2xl shadow-xl border border-white/40 transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50"
                  style={{ backdropFilter: 'blur(12px)' }}
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordResetSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="resetEmail" className="block text-white/90 text-sm font-medium">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                    </div>
                    <input
                      id="resetEmail"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      disabled={currentLoading}
                      className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-xl w-full py-4 pl-12 pr-4 text-black leading-tight focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all duration-300 shadow-xl placeholder-white/60 disabled:opacity-50 input-glow"
                      placeholder="your@email.com"
                      style={{ backdropFilter: 'blur(12px)' }}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={currentLoading}
                  className="w-full group relative backdrop-blur-xl bg-white/30 hover:bg-white/40 text-white font-semibold py-4 px-6 rounded-2xl shadow-xl border border-white/40 transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none btn-primary"
                  style={{ backdropFilter: 'blur(12px)' }}
                >
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    {currentLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Sending Reset Email...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Send Reset Email
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                </button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    disabled={currentLoading}
                    className="text-white/80 hover:text-white text-sm transition-colors duration-200 disabled:opacity-50"
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* Login/Register Form */
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className={`block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={currentLoading}
                  className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-xl w-full py-4 pl-12 pr-4 text-black leading-tight focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all duration-300 shadow-xl placeholder-white/60 disabled:opacity-50 input-glow"
                  placeholder="your@email.com"
                  style={{ backdropFilter: 'blur(12px)' }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="block text-white/90 text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={currentLoading}
                  className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-xl w-full py-4 pl-12 pr-12 text-black leading-tight focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all duration-300 shadow-xl placeholder-white/60 disabled:opacity-50 input-glow"
                  placeholder="••••••••"
                  style={{ backdropFilter: 'blur(12px)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={currentLoading}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/50 hover:text-white/80 transition-colors duration-200 disabled:opacity-50"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            {isLoginView && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setIsPasswordResetView(true)}
                  disabled={currentLoading}
                  className={`text-sm transition-colors duration-200 disabled:opacity-50 ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-indigo-600'}`}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={currentLoading}
              className="w-full group relative backdrop-blur-xl font-semibold py-4 px-6 rounded-2xl shadow-xl border transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none btn-primary text-white focus:ring-indigo-300"
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #0ea5e9 100%)',
                borderColor: '#4f46e5',
                backdropFilter: 'blur(12px)'
              }}
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                {currentLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    {isLoginView ? 'Signing In...' : 'Creating Account...'}
                  </>
                ) : isLoginView ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Sign In
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Create Account
                  </>
                )}
              </span>
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
            </button>
          </form>
        )}

        {/* Guest Login and Toggle - Only show when not in password reset view */}
        {!isPasswordResetView && (
          <>
            <div className="mt-6 text-center">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/30"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white/10 text-white/80 rounded-full backdrop-blur-xl" style={{ backdropFilter: 'blur(8px)' }}>or</span>
                </div>
              </div>

              <button
                onClick={handleGuestLogin}
                disabled={currentLoading}
                className="w-full group relative backdrop-blur-xl bg-white/10 hover:bg-white/20 text-white font-semibold py-4 px-6 rounded-2xl shadow-xl border border-white/30 transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/30 mt-4 mb-6 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                style={{ backdropFilter: 'blur(12px)' }}
              >
                <span className="relative z-10 flex items-center justify-center gap-3">
                  {currentLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Continue as Guest
                      <span className="text-white/60 text-xs">• No account needed</span>
                    </>
                  )}
                </span>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
              </button>
            </div>
            <div className="text-center">
              <p className="text-white/80 text-sm mb-2">
                {isLoginView ? "Don't have an account?" : "Already have an account?"}
              </p>
              <button
                onClick={() => setIsLoginView(!isLoginView)}
                disabled={currentLoading}
                className="font-semibold text-white hover:text-white/80 focus:outline-none transition-all duration-300 text-sm backdrop-blur-xl bg-white/10 px-4 py-2 rounded-xl border border-white/20 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backdropFilter: 'blur(8px)' }}
              >
                {isLoginView ? 'Create new account' : 'Sign in instead'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default LoginScreen;
