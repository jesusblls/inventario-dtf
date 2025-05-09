import React, { useState } from 'react';
import { Bell, Settings, CheckCircle, AlertTriangle, History, ChevronDown, RefreshCcw } from 'lucide-react';

interface Alert {
  id: number;
  productName: string;
  type: 'low_stock' | 'out_of_stock' | 'high_demand';
  threshold: number;
  currentValue: number;
  category: string;
  date: string;
  status: 'pending' | 'handled';
}

const alerts: Alert[] = [
  {
    id: 1,
    productName: 'Playera F1 Racing',
    type: 'low_stock',
    threshold: 10,
    currentValue: 5,
    category: 'Deportes',
    date: '2024-03-15T10:30:00',
    status: 'pending'
  },
  {
    id: 2,
    productName: 'Playera Calavera Mexicana',
    type: 'high_demand',
    threshold: 50,
    currentValue: 45,
    category: 'Cultura',
    date: '2024-03-15T09:15:00',
    status: 'pending'
  },
  {
    id: 3,
    productName: 'Playera Dragon Ball',
    type: 'out_of_stock',
    threshold: 0,
    currentValue: 0,
    category: 'Anime',
    date: '2024-03-14T16:45:00',
    status: 'handled'
  },
  {
    id: 4,
    productName: 'Playera Street Art',
    type: 'low_stock',
    threshold: 15,
    currentValue: 3,
    category: 'Urbano',
    date: '2024-03-14T14:20:00',
    status: 'pending'
  },
  {
    id: 5,
    productName: 'Playera Gaming Pro',
    type: 'high_demand',
    threshold: 40,
    currentValue: 35,
    category: 'Gaming',
    date: '2024-03-14T11:45:00',
    status: 'pending'
  }
];

const categories = ['Deportes', 'Cultura', 'Anime', 'Urbano', 'Gaming'];

export function AlertsPage() {
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'settings'>('current');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showThresholdModal, setShowThresholdModal] = useState(false);

  const getAlertTypeDetails = (type: Alert['type']) => {
    switch (type) {
      case 'low_stock':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/50',
          borderColor: 'border-yellow-500',
          text: 'Stock Bajo'
        };
      case 'out_of_stock':
        return {
          icon: AlertTriangle,
          color: 'text-red-500',
          bgColor: 'bg-red-50 dark:bg-red-900/50',
          borderColor: 'border-red-500',
          text: 'Sin Stock'
        };
      case 'high_demand':
        return {
          icon: AlertTriangle,
          color: 'text-blue-500',
          bgColor: 'bg-blue-50 dark:bg-blue-900/50',
          borderColor: 'border-blue-500',
          text: 'Alta Demanda'
        };
    }
  };

  const filteredAlerts = alerts.filter(alert => 
    !selectedCategory || alert.category === selectedCategory
  );

  const pendingAlerts = filteredAlerts.filter(alert => alert.status === 'pending');
  const handledAlerts = filteredAlerts.filter(alert => alert.status === 'handled');

  const handleAlertAction = (alertId: number) => {
    // Here you would implement the logic to handle the alert
    console.log('Handling alert:', alertId);
  };

  const handleRefresh = () => {
    // Here you would implement the refresh logic
    console.log('Refreshing alerts');
  };

  const handleSaveSettings = (event: React.FormEvent) => {
    event.preventDefault();
    // Here you would implement the settings save logic
    console.log('Saving settings');
    setShowThresholdModal(false);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 md:p-8 flex-shrink-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">Alertas de Inventario</h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">Gestiona las alertas de stock y demanda de tus productos</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={handleRefresh}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow transition-all duration-200"
            >
              <RefreshCcw className="w-5 h-5" />
              <span className="hidden md:inline">Actualizar</span>
            </button>
            <button 
              onClick={() => setShowThresholdModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition-colors duration-200 shadow-sm"
            >
              <Settings className="w-5 h-5 md:mr-2" />
              <span className="hidden md:inline">Configurar Alertas</span>
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex overflow-x-auto">
              <button
                onClick={() => setActiveTab('current')}
                className={`py-4 px-6 inline-flex items-center gap-2 border-b-2 font-medium whitespace-nowrap transition-colors duration-200 ${
                  activeTab === 'current'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Bell className="w-5 h-5" />
                Alertas Activas
                {pendingAlerts.length > 0 && (
                  <span className="bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    {pendingAlerts.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-4 px-6 inline-flex items-center gap-2 border-b-2 font-medium whitespace-nowrap transition-colors duration-200 ${
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <History className="w-5 h-5" />
                Historial
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-4 px-6 inline-flex items-center gap-2 border-b-2 font-medium whitespace-nowrap transition-colors duration-200 ${
                  activeTab === 'settings'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Settings className="w-5 h-5" />
                Configuración
              </button>
            </nav>
          </div>

          <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div className="relative w-full md:w-auto">
                <select
                  className="w-full md:w-auto appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">Todas las categorías</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {activeTab === 'current' && `${pendingAlerts.length} alertas pendientes`}
                {activeTab === 'history' && `${handledAlerts.length} alertas atendidas`}
              </div>
            </div>

            <div className="overflow-y-auto max-h-[calc(100vh-20rem)]">
              {activeTab === 'current' && (
                <div className="space-y-4">
                  {pendingAlerts.length === 0 ? (
                    <div className="text-center py-12">
                      <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No hay alertas pendientes</h3>
                      <p className="text-gray-500 dark:text-gray-400">Todos los productos están en niveles normales</p>
                    </div>
                  ) : (
                    pendingAlerts.map((alert) => {
                      const typeDetails = getAlertTypeDetails(alert.type);
                      return (
                        <div
                          key={alert.id}
                          className={`${typeDetails.bgColor} border border-l-4 ${typeDetails.borderColor} rounded-lg p-4 transition-all duration-200 hover:shadow-md`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center">
                              <typeDetails.icon className={`w-5 h-5 ${typeDetails.color}`} />
                              <div className="ml-3">
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white">{alert.productName}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {typeDetails.text} - {alert.category}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {new Date(alert.date).toLocaleString()}
                              </span>
                              <button
                                onClick={() => handleAlertAction(alert.id)}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Atender
                              </button>
                            </div>
                          </div>
                          <div className="mt-2">
                            <div className="flex items-center">
                              <div className="flex-1">
                                <div className="bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                  <div
                                    className={`${
                                      alert.type === 'low_stock' 
                                        ? 'bg-yellow-500' 
                                        : alert.type === 'out_of_stock' 
                                        ? 'bg-red-500' 
                                        : 'bg-blue-500'
                                    } h-2 rounded-full transition-all duration-300 ease-in-out`}
                                    style={{ 
                                      width: `${Math.min((alert.currentValue / alert.threshold) * 100, 100)}%` 
                                    }}
                                  ></div>
                                </div>
                              </div>
                              <span className="ml-4 text-sm text-gray-500 dark:text-gray-400">
                                {alert.currentValue} / {alert.threshold} {alert.type === 'high_demand' ? 'ventas' : 'unidades'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-4">
                  {handledAlerts.length === 0 ? (
                    <div className="text-center py-12">
                      <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No hay historial de alertas</h3>
                      <p className="text-gray-500 dark:text-gray-400">Las alertas atendidas aparecerán aquí</p>
                    </div>
                  ) : (
                    handledAlerts.map((alert) => {
                      const typeDetails = getAlertTypeDetails(alert.type);
                      return (
                        <div
                          key={alert.id}
                          className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 opacity-75 hover:opacity-100 transition-all duration-200"
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center">
                              <typeDetails.icon className="w-5 h-5 text-gray-400" />
                              <div className="ml-3">
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white">{alert.productName}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {typeDetails.text} - {alert.category}
                                </p>
                              </div>
                            </div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(alert.date).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Umbrales de Alerta</h3>
                    <form onSubmit={handleSaveSettings} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Stock Bajo</label>
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
                            placeholder="10"
                          />
                          <span className="text-gray-500 dark:text-gray-400">unidades</span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          Se generará una alerta cuando el stock sea menor a este valor
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Alta Demanda</label>
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
                            placeholder="50"
                          />
                          <span className="text-gray-500 dark:text-gray-400">ventas/mes</span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          Se generará una alerta cuando las ventas superen este valor
                        </p>
                      </div>
                      <div className="pt-4">
                        <button 
                          type="submit"
                          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                        >
                          Guardar Configuración
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Notificaciones</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Notificaciones por Email</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Recibe alertas en tu correo electrónico</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Notificaciones Push</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Recibe alertas en tiempo real</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}