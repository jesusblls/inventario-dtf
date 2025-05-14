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
  ChevronLeft,
  ChevronRight,
  Loader
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { AmazonProduct } from '../lib/types';

interface SyncStatus {
  id: string;
  type: 'products' | 'orders';
  start_date: string;
  end_date: string;
  items_processed: number;
  status: 'success' | 'error' | 'in_progress';
  error_message: string | null;
  created_at: string;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchStats();
    fetchSyncHistory();
  }, [currentPage]);

  const fetchStats = async () => {
    try {
      const { data: products, error: productsError } = await supabase
        .from('amazon_products')
        .select('*');

      if (productsError) throw productsError;

      // Get the total items processed from the latest successful sync
      const { data: latestSync, error: syncError } = await supabase
        .from('sync_history')
        .select('*')
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(1);

      if (syncError) throw syncError;

      const { data: orders, error: ordersError } = await supabase
        .from('amazon_orders')
        .select('*')
        .order('last_sync_date', { ascending: false })
        .limit(1);

      if (ordersError) throw ordersError;

      setStats(prev => ({
        ...prev,
        totalProducts: products?.length || 0,
        totalOrders: latestSync?.[0]?.items_processed || 0,
        lastSync: orders?.[0]?.last_sync_date || null,
        status: 'connected'
      }));
    } catch (err) {
      console.error('Error fetching stats:', err);
      setStats(prev => ({ ...prev, status: 'error' }));
    }
  };

  const fetchSyncHistory = async () => {
    try {
      setLoading(true);
      // Get total count
      const { count } = await supabase
        .from('sync_history')
        .select('*', { count: 'exact', head: true });

      setTotalPages(Math.ceil((count || 0) / itemsPerPage));

      // Get paginated data
      const { data, error } = await supabase
        .from('sync_history')
        .select('*')
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (error) throw error;

      setSyncHistory(data || []);
    } catch (err) {
      console.error('Error fetching sync history:', err);
      setError('Error al cargar el historial de sincronización');
    } finally {
      setLoading(false);
    }
  };

  const syncProducts = async () => {
    try {
      setSyncInProgress(true);
      setError(null);

      const startStatus: SyncStatus = {
        id: crypto.randomUUID(),
        type: 'products',
        start_date: new Date().toISOString(),
        end_date: new Date().toISOString(),
        items_processed: 0,
        status: 'in_progress',
        error_message: null,
        created_at: new Date().toISOString()
      };
      setSyncHistory(prev => [startStatus, ...prev]);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/amazon-sync`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error en la respuesta del servidor: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error desconocido al sincronizar');
      }

      await fetchStats();
      await fetchSyncHistory();
    } catch (err) {
      console.error('Error syncing products:', err);
      setError('Error al sincronizar: ' + (err.message || 'Error desconocido'));
    } finally {
      setSyncInProgress(false);
    }
  };

  const handleSync = async () => {
    await syncProducts();
  };

  const getStatusIcon = (status: SyncStatus['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500 dark:text-red-400" />;
      case 'in_progress':
        return <RefreshCw className="w-5 h-5 text-blue-500 dark:text-blue-400 animate-spin" />;
    }
  };

  const getStatusBadge = (status: PlatformStats['status']) => {
    switch (status) {
      case 'connected':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300">
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
              {stats.lastSync ? new Date(stats.lastSync).toLocaleString() : 'Nunca'}
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
                  Inicio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Fin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Detalles
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    <Loader className="w-6 h-6 text-blue-500 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : syncHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No hay registros de sincronización
                  </td>
                </tr>
              ) : (
                syncHistory.map((sync) => (
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
                      <span className="text-sm text-gray-900 dark:text-white">{sync.items_processed}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(sync.start_date).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(sync.end_date).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {sync.error_message || 'Sincronización exitosa'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a{' '}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, (syncHistory.length || 0))}
                </span>{' '}
                de <span className="font-medium">{totalPages * itemsPerPage}</span> resultados
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <span className="sr-only">Anterior</span>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                {/* Page numbers */}
                {[...Array(totalPages)].map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(idx + 1)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      currentPage === idx + 1
                        ? 'z-10 bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <span className="sr-only">Siguiente</span>
                  <ChevronRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}