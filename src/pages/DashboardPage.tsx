import React from 'react';
import { AlertTriangle, Package, DollarSign, Bell, BarChart3 } from 'lucide-react';

export function DashboardPage() {
  return (
    <main className="flex-1 p-4 md:p-8 bg-gray-100 dark:bg-gray-900 overflow-x-hidden">
      {/* Alert Banner */}
      <div className="bg-yellow-50 dark:bg-yellow-900/50 border-l-4 border-yellow-400 p-4 mb-6 md:mb-8 rounded-lg">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-yellow-400 flex-shrink-0" />
          <p className="ml-3 text-sm md:text-base text-yellow-700 dark:text-yellow-300">
            ¡Alerta! 5 productos tienen stock bajo
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6">
          <div className="flex items-center">
            <Package className="w-6 h-6 md:w-8 md:h-8 text-blue-600 dark:text-blue-400" />
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Productos</p>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">248</h3>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6">
          <div className="flex items-center">
            <DollarSign className="w-6 h-6 md:w-8 md:h-8 text-green-600 dark:text-green-400" />
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Ventas del Mes</p>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">$45,289</h3>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6">
          <div className="flex items-center">
            <Bell className="w-6 h-6 md:w-8 md:h-8 text-red-600 dark:text-red-400" />
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Alertas Activas</p>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">8</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-800 dark:text-white">Productos Más Vendidos</h3>
            <BarChart3 className="w-5 h-5 md:w-6 md:h-6 text-gray-400 dark:text-gray-500" />
          </div>
          <div className="space-y-4">
            {[
              { name: 'Playera F1 Racing', sales: 80 },
              { name: 'Playera Calavera Mexicana', sales: 65 },
              { name: 'Playera Anime Collection', sales: 55 },
              { name: 'Playera Street Art', sales: 45 },
              { name: 'Playera Gaming Pro', sales: 35 },
            ].map((product, index) => (
              <div key={index} className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {product.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-400">
                      {product.sales} ventas
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
                  <div
                    style={{ width: `${(product.sales / 80) * 100}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 dark:bg-blue-500"
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-800 dark:text-white">Ventas Recientes</h3>
            <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-gray-400 dark:text-gray-500" />
          </div>
          <div className="space-y-4">
            <div className="flex flex-col space-y-3">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <Package className="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm md:text-base font-medium text-gray-900 dark:text-white">Orden #23{index + 1}</p>
                      <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Hace {index + 1} horas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm md:text-base font-medium text-gray-900 dark:text-white">$299.00</p>
                    <p className="text-xs md:text-sm text-green-600 dark:text-green-400">Completada</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}