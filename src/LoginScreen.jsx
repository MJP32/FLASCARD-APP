import React, { useState } from 'react';

function LoginScreen({ authError, handleLogin, handleRegister, handleAnonymousLogin, email, setEmail, password, setPassword }) {
  const [isLoginView, setIsLoginView] = useState(true); // Internal state for toggling between login and register forms

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 font-inter bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-gray-900 dark:to-indigo-950 text-slate-800 dark:text-slate-100 transition-all duration-700 ease-out backdrop-blur-sm"
         style={{
           background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 25%, #e0e7ff 50%, #f0f9ff 75%, #fafafa 100%)',
           backgroundSize: '400% 400%',
           animation: 'gradientShift 15s ease infinite'
         }}>
      <div className="backdrop-blur-xl bg-white/90 dark:bg-slate-800/90 rounded-3xl shadow-2xl border border-white/30 dark:border-slate-600/30 p-8 mb-8"
           style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)' }}>
        <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 text-center">
          FSRS Flashcards
        </h1>
      </div>
      <div className="w-full max-w-md backdrop-blur-xl bg-white/90 dark:bg-slate-800/90 rounded-3xl shadow-2xl border border-white/30 dark:border-slate-600/30 p-8"
           style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)' }}>
        <h2 className="text-3xl font-bold text-slate-700 dark:text-slate-200 mb-8 text-center">
          {isLoginView ? 'Welcome Back' : 'Create Account'}
        </h2>
        {authError && (
          <div className="backdrop-blur-sm bg-rose-50/90 dark:bg-rose-900/90 border border-rose-200 dark:border-rose-700 text-rose-700 dark:text-rose-200 px-6 py-4 rounded-2xl relative mb-6 shadow-lg" role="alert">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <strong className="font-semibold">Authentication Error</strong>
                <p className="text-sm mt-1">{authError}</p>
              </div>
            </div>
          </div>
        )}
        <form onSubmit={isLoginView ? handleLogin : handleRegister} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-slate-600 dark:text-slate-300 text-sm font-medium mb-3">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="backdrop-blur-sm bg-white/80 dark:bg-slate-700/80 border-0 rounded-xl w-full py-4 px-5 text-slate-700 dark:text-slate-200 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 shadow-lg placeholder-slate-400 dark:placeholder-slate-500"
              placeholder="Enter your email address"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-slate-600 dark:text-slate-300 text-sm font-medium mb-3">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="backdrop-blur-sm bg-white/80 dark:bg-slate-700/80 border-0 rounded-xl w-full py-4 px-5 text-slate-700 dark:text-slate-200 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 shadow-lg placeholder-slate-400 dark:placeholder-slate-500"
              placeholder="Enter your password"
            />
          </div>
          <button
            type="submit"
            className="w-full group relative backdrop-blur-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 px-6 rounded-2xl shadow-lg border border-blue-500/20 transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 overflow-hidden"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isLoginView ? (
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
            <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        </form>
        <div className="mt-6 text-center">
          <button
            onClick={handleAnonymousLogin}
            className="w-full group relative backdrop-blur-sm bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 hover:from-slate-200 hover:to-slate-300 dark:hover:from-slate-600 dark:hover:to-slate-500 text-slate-700 dark:text-slate-200 font-semibold py-4 px-6 rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-600/50 transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 mb-6 overflow-hidden"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Continue as Guest
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        </div>
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            {isLoginView ? "Don't have an account?" : "Already have an account?"}
          </p>
          <button
            onClick={() => setIsLoginView(!isLoginView)}
            className="mt-2 font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 focus:outline-none focus:underline transition-colors duration-300 text-sm"
          >
            {isLoginView ? 'Create new account' : 'Sign in instead'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
