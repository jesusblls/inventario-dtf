import React, { useState } from 'react';
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
  ChevronDown
} from 'lucide-react';

interface SyncStatus {
  id: string;
  platform: 'amazon' | 'tiendanube';
  type: 'products' | 'orders' | 'inventory';
  status: 'success' | 'error' | 'in_progress';
  timestamp: string;
  details: string;
  affectedItems: number;
}

interface PlatformStats {
  platform: string;
  totalProducts: number;
  totalOrders: number;
  lastSync: string;
  status: 'connected' | 'error' | 'disconnected';
}

const syncHistory: SyncStatus[] = [
  {
    id: '1',
    platform: 'amazon',
    type: 'products',
    status: 'success',
    timestamp: '2024-03-15T10:30:00',
    details: 'Sincronización de productos completada',
    affectedItems: 150
  },
  {
    id: '2',
    platform: 'tiendanube',
    type: 'orders',
    status: 'success',
    timestamp: '2024-03-15T10:15:00',
    details: 'Sincronización de órdenes completada',
    affectedItems: 45
  },
  {
    id: '3',
    platform: 'amazon',
    type: 'inventory',
    status: 'error',
    timestamp: '2024-03-15T09:45:00',
    details: 'Error en la actualización de inventario',
    affectedItems: 0
  },
  {
    id: '4',
    platform: 'tiendanube',
    type: 'products',
    status: 'in_progress',
    timestamp: '2024-03-15T09:30:00',
    details: 'Sincronizando productos...',
    affectedItems: 75
  }
];

const platformStats: PlatformStats[] = [
  {
    platform: 'Amazon',
    totalProducts: 248,
    totalOrders: 1567,
    lastSync: '2024-03-15T10:30:00',
    status: 'connected'
  },
  {
    platform: 'Tiendanube',
    totalProducts: 235,
    totalOrders: 892,
    lastSync: '2024-03-15T10:15:00',
    status: 'connected'
  }
];

export function SyncPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'amazon':
        return <Store className="w-6 h-6 text-orange-500" />;
      case 'tiendanube':
        return <Store className="w-6 h-6 text-purple-500" />;
      default:
        return <Store className="w-6 h-6 text-gray-500" />;
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

  const handleSync = () => {
    setSyncInProgress(true);
    // Aquí iría la lógica de sincronización
    setTimeout(() => setSyncInProgress(false), 3000);
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Sincronización</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gestiona la sincronización con tus plataformas de venta</p>
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

      {/* Platform Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {platformStats.map((platform, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {getPlatformIcon(platform.platform)}
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{platform.platform}</h3>
              </div>
              {getStatusBadge(platform.status)}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Productos</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{platform.totalProducts}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Órdenes</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{platform.totalOrders}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Última Sync</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(platform.lastSync).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium flex items-center gap-1">
                Ver detalles
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Sync History */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Historial de Sincronización</h3>
            <div className="flex items-center gap-4">
              <div className="relative">
                <select
                  className="appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                >
                  <option value="all">Todas las plataformas</option>
                  <option value="amazon">Amazon</option>
                  <option value="tiendanube">Tiendanube</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Plataforma
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
              {syncHistory
                .filter(
                  (sync) =>
                    selectedPlatform === 'all' || sync.platform === selectedPlatform
                )
                .map((sync) => (
                  <tr key={sync.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(sync.status)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getPlatformIcon(sync.platform)}
                        <span className="ml-2 text-sm text-gray-900 dark:text-white capitalize">
                          {sync.platform}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white capitalize">{sync.type}</span>
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