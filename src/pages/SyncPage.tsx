import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Store, 
  ShoppingBag, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ArrowRight,
  Settings,
  ChevronDown,
  Loader
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { AmazonProduct } from '../lib/types';

interface SyncStatus {
  id: string;
  platform: 'amazon';
  type: 'products' | 'orders';
  status: 'success' | 'error' | 'in_progress';
  timestamp: string;
  details: string;
  affectedItems: number;
}

interface PlatformStats {
  totalProducts: number;
  totalOrders: number;
  lastSync: string | null;
  status: 'connected' | 'error' | 'disconnected';
}

export function SyncPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [stats, setStats] = useState<PlatformStats>({
    totalProducts: 0,
    totalOrders: 0,
    lastSync: null,
    status: 'connected'
  });
  const [syncHistory, setSyncHistory] = useState<SyncStatus[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: products, error: productsError } = await supabase
        .from('amazon_products')
        .select('*');

      if (productsError) throw productsError;

      setStats(prev => ({
        ...prev,
        totalProducts: products?.length || 0,
        status: 'connected'
      }));
    } catch (err) {
      console.error('Error fetching stats:', err);
      setStats(prev => ({ ...prev, status: 'error' }));
    }
  };

  const syncProducts = async () => {
    try {
      setSyncInProgress(true);
      setError(null);

      const startStatus: SyncStatus = {
        id: crypto.randomUUID(),
        platform: 'amazon',
        type: 'products',
        status: 'in_progress',
        timestamp: new Date().toISOString(),
        details: 'Sincronizando productos de Amazon...',
        affectedItems: 0
      };
      setSyncHistory(prev => [startStatus, ...prev]);

      const response = await fetch('/functions/v1/amazon-products', {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        }
      });

      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (err) {
        console.error('Invalid JSON response:', responseText);
        throw new Error('Respuesta inválida del servidor');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Error sincronizando productos');
      }

      setSyncHistory(prev => [{
        id: crypto.randomUUID(),
        platform: 'amazon',
        type: 'products',
        status: 'success',
        timestamp: new Date().toISOString(),
        details: 'Sincronización de productos completada',
        affectedItems: data.items?.length || 0
      }, ...prev.filter(s => s.id !== startStatus.id)]);

      await fetchStats();
    } catch (err) {
      console.error('Error syncing products:', err);
      setError('Error al sincronizar productos: ' + (err.message || 'Error desconocido'));
      
      setSyncHistory(prev => [{
        id: crypto.randomUUID(),
        platform: 'amazon',
        type: 'products',
        status: 'error',
        timestamp: new Date().toISOString(),
        details: err.message || 'Error en la sincronización de productos',
        affectedItems: 0
      }, ...prev]);
    } finally {
      setSyncInProgress(false);
    }
  };

  const syncOrders = async () => {
    try {
      setSyncInProgress(true);
      setError(null);

      const startStatus: SyncStatus = {
        id: crypto.randomUUID(),
        platform: 'amazon',
        type: 'orders',
        status: 'in_progress',
        timestamp: new Date().toISOString(),
        details: 'Sincronizando órdenes de Amazon...',
        affectedItems: 0
      };
      setSyncHistory(prev => [startStatus, ...prev]);

      const response = await fetch('/functions/v1/amazon-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        })
      });

      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (err) {
        console.error('Invalid JSON response:', responseText);
        throw new Error('Respuesta inválida del servidor');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Error sincronizando órdenes');
      }

      setSyncHistory(prev => [{
        id: crypto.randomUUID(),
        platform: 'amazon',
        type: 'orders',
        status: 'success',
        timestamp: new Date().toISOString(),
        details: 'Sincronización de órdenes completada',
        affectedItems: data.orders?.length || 0
      }, ...prev.filter(s => s.id !== startStatus.id)]);

      await fetchStats();
    } catch (err) {
      console.error('Error syncing orders:', err);
      setError('Error al sincronizar órdenes: ' + (err.message || 'Error desconocido'));
      
      setSyncHistory(prev => [{
        id: crypto.randomUUID(),
        platform: 'amazon',
        type: 'orders',
        status: 'error',
        timestamp: new Date().toISOString(),
        details: err.message || 'Error en la sincronización de órdenes',
        affectedItems: 0
      }, ...prev]);
    } finally {
      setSyncInProgress(false);
    }
  };

  const handleSync = async () => {
    await syncProducts();
    await syncOrders();
  };

  const getStatusIcon = (status: SyncStatus['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'in_progress':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
    }
  };

  const getStatusBadge = (status: PlatformStats['status']) => {
    switch (status) {
      case 'connected':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300">
            Conectado
          </span>
        );
      case 'error':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300">
            Error
          </span>
        );
      case 'disconnected':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-300">
            Desconectado
          </span>
        );
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Sincronización</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gestiona la sincronización con Amazon</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow transition-all duration-200"
          >
            <Settings className="w-5 h-5" />
            Configuración
          </button>
          <button
            onClick={handleSync}
            disabled={syncInProgress}
            className={`bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors duration-200 ${
              syncInProgress ? 'opacity-75 cursor-not-allowed' : 'hover:bg-blue-700'
            }`}
          >
            <RefreshCw className={`w-5 h-5 ${syncInProgress ? 'animate-spin' : ''}`} />
            {syncInProgress ? 'Sincronizando...' : 'Sincronizar Todo'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-700 dark:text-red-300">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Store className="w-6 h-6 text-orange-500" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Amazon</h3>
          </div>
          {getStatusBadge(stats.status)}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Productos</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">{stats.totalProducts}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Órdenes</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">{stats.totalOrders}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Última Sync</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {stats.lastSync ? new Date(stats.lastSync).toLocaleTimeString() : 'Nunca'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Historial de Sincronización</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Elementos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Detalles
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {syncHistory.map((sync) => (
                <tr key={sync.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(sync.status)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 dark:text-white capitalize">
                      {sync.type === 'products' ? 'Productos' : 'Órdenes'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 dark:text-white">{sync.affectedItems}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(sync.timestamp).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{sync.details}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}