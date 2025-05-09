import React, { useState } from 'react';
import { User, Lock, Save, AlertCircle } from 'lucide-react';

export function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simular actualización
    setTimeout(() => {
      setSuccessMessage('Configuración actualizada correctamente');
      setLoading(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    }, 1000);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">Configuración</h1>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">Administra tu perfil y preferencias</p>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6 mb-4 md:mb-6">
          <h2 className="text-base md:text-lg font-semibold text-gray-800 dark:text-white mb-4 md:mb-6">Información Personal</h2>
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            {successMessage && (
              <div className="bg-green-50 dark:bg-green-900 border-l-4 border-green-500 p-4 mb-4 md:mb-6 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-green-500" />
                  <p className="ml-3 text-sm md:text-base text-green-700 dark:text-green-300">{successMessage}</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nombre Completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  className="pl-10 w-full px-4 py-2 text-sm md:text-base border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Tu nombre"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Correo Electrónico
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  className="pl-10 w-full px-4 py-2 text-sm md:text-base border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contraseña Actual
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  className="pl-10 w-full px-4 py-2 text-sm md:text-base border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nueva Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  className="pl-10 w-full px-4 py-2 text-sm md:text-base border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirmar Nueva Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  className="pl-10 w-full px-4 py-2 text-sm md:text-base border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className={`w-full bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm md:text-base ${
                  loading ? 'opacity-75 cursor-not-allowed' : 'hover:bg-blue-700'
                }`}
              >
                <Save className="w-5 h-5" />
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6">
          <h2 className="text-base md:text-lg font-semibold text-gray-800 dark:text-white mb-4 md:mb-6">Preferencias de Notificaciones</h2>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
              <div>
                <h4 className="text-sm md:text-base font-medium text-gray-700 dark:text-gray-300">Notificaciones por Email</h4>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Recibe alertas en tu correo electrónico</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
              <div>
                <h4 className="text-sm md:text-base font-medium text-gray-700 dark:text-gray-300">Notificaciones Push</h4>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Recibe alertas en tiempo real</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}