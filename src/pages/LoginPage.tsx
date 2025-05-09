import React from 'react';

interface LoginPageProps {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 dark:from-black dark:to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-8">
        <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-8">DTF Manager</h2>
        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); onLogin(); }}>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Usuario</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ingresa tu usuario"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contraseña</label>
            <input
              type="password"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ingresa tu contraseña"
            />
          </div>
          <div className="flex items-center justify-end">
            <a href="#" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">¿Olvidaste tu contraseña?</a>
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Iniciar sesión
          </button>
        </form>
      </div>
    </div>
  );
}