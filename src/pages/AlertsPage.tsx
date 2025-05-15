import React, { useState, useEffect } from 'react';
import { Bell, History, ChevronDown, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Alert, AlertSettings, Product } from '../lib/types';

export function AlertsPage() {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchAlerts();
    fetchCategories();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: alertsData, error: alertsError } = await supabase
        .from('alerts')
        .select(`
          id,
          product_id,
          type,
          threshold,
          current_value,
          status,
          created_at,
          updated_at,
          handled_at,
          products (
            id,
            name,
            stock,
            size,
            color,
            type
          )
        `)
        .order('created_at', { ascending: false });

      if (alertsError) throw alertsError;

      // Transform the data to match the expected format
      const transformedAlerts = alertsData?.map(alert => ({
        ...alert,
        product: alert.products
      })) || [];

      setAlerts(transformedAlerts);
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError('Error al cargar las alertas. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('type');

      if (error) throw error;

      const uniqueCategories = Array.from(new Set(products?.map(p => p.type)));
      setCategories(['Todas', ...uniqueCategories]);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const handleAlertAction = async (alertId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('alerts')
        .update({
          status: 'handled',
          handled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (updateError) throw updateError;

      await fetchAlerts();
    } catch (err) {
      console.error('Error handling alert:', err);
      setError('Error al atender la alerta. Por favor, intenta de nuevo.');
    }
  };

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
    !selectedCategory || alert.product?.type === selectedCategory
  );

  const pendingAlerts = filteredAlerts.filter(alert => alert.status === 'pending');
  const handledAlerts = filteredAlerts.filter(alert => alert.status === 'handled');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 md:p-8 flex-shrink-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">Alertas de Inventario</h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">Gestiona las alertas de stock y demanda de tus productos</p>
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
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white">{alert.product?.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {typeDetails.text} - {alert.product?.type}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {new Date(alert.created_at).toLocaleString()}
                              </span>
                              <button
                                onClick={() => handleAlertAction(alert.id)}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                              >
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
                                        : 'bg-blue-500'
                                    } h-2 rounded-full transition-all duration-300 ease-in-out`}
                                    style={{ 
                                      width: `${Math.min((alert.current_value / alert.threshold) * 100, 100)}%` 
                                    }}
                                  ></div>
                                </div>
                              </div>
                              <span className="ml-4 text-sm text-gray-500 dark:text-gray-400">
                                {alert.current_value} / {alert.threshold} {alert.type === 'high_demand' ? 'ventas' : 'unidades'}
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
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white">{alert.product?.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {typeDetails.text} - {alert.product?.type}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                Creada: {new Date(alert.created_at).toLocaleString()}
                              </span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                Atendida: {new Date(alert.handled_at!).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}