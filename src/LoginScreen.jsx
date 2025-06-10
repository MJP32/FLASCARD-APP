import React, { useState } from 'react';

function LoginScreen({ authError, handleLogin, handleRegister, handleAnonymousLogin, email, setEmail, password, setPassword }) {
  const [isLoginView, setIsLoginView] = useState(true); // Internal state for toggling between login and register forms

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 font-inter bg-gradient-to-br from-blue-100 to-blue-200 dark:from-gray-800 dark:to-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-500">
      <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-700 shadow-xl p-6 rounded-lg bg-white dark:bg-gray-700 dark:from-blue-400 dark:to-purple-500 mb-8">
        FSRS Flashcards
      </h1>
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8 dark:bg-gray-800">
        <h2 className="text-2xl font-semibold text-gray-700 mb-6 text-center dark:text-gray-200">
          {isLoginView ? 'Login' : 'Register'}
        </h2>
        {authError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4" role="alert">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline ml-2">{authError}</span>
          </div>
        )}
        <form onSubmit={isLoginView ? handleLogin : handleRegister} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
              Email:
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              placeholder="Enter your email"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
              Password:
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              placeholder="Enter your password"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-blue-800 dark:hover:bg-blue-700"
          >
            {isLoginView ? 'Login' : 'Register'}
          </button>
        </form>
        <div className="mt-4 text-center">
          <button
            onClick={handleAnonymousLogin}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 mb-4"
          >
            Continue as Guest
          </button>
        </div>
        <p className="mt-4 text-center text-gray-600 dark:text-gray-300">
          {isLoginView ? "Don't have an account?" : "Already have an account?"}{' '}
          <button
            onClick={() => setIsLoginView(!isLoginView)}
            className="font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 focus:outline-none focus:underline"
          >
            {isLoginView ? 'Register here' : 'Login here'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default LoginScreen;
