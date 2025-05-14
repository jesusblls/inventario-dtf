import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface SyncStats {
  totalProducts: number;
  totalOrders: number;
  lastSync: string | null;
  status: 'connected' | 'error';
}

export function SyncPage() {
  const [stats, setStats] = useState<SyncStats>({
    totalProducts: 0,
    totalOrders: 0,
    lastSync: null,
    status: 'connected'
  });

  const fetchStats = async () => {
    try {
      const { data: products, error: productsError } = await supabase
        .from('amazon_products')
        .select('*');

      if (productsError) throw productsError;

      const { data: orders, error: ordersError } = await supabase
        .from('amazon_orders')
        .select('*')
        .order('last_sync_date', { ascending: false })
        .limit(1);

      if (ordersError) throw ordersError;

      setStats(prev => ({
        ...prev,
        totalProducts: products?.length || 0,
        totalOrders: orders?.length || 0,
        lastSync: orders?.[0]?.last_sync_date || null,
        status: 'connected'
      }));
    } catch (err) {
      console.error('Error fetching stats:', err);
      setStats(prev => ({ ...prev, status: 'error' }));
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Sync Status</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Products</h2>
          <p className="text-3xl font-bold">{stats.totalProducts}</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Orders</h2>
          <p className="text-3xl font-bold">{stats.totalOrders}</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Last Sync</h2>
          <p className="text-3xl font-bold">
            {stats.lastSync 
              ? new Date(stats.lastSync).toLocaleDateString()
              : 'Never'
            }
          </p>
        </div>
      </div>

      <div className="mt-6">
        <div className={`inline-flex items-center px-4 py-2 rounded-full ${
          stats.status === 'connected' 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        }`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${
            stats.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          {stats.status === 'connected' ? 'Connected' : 'Error'}
        </div>
      </div>
    </div>
  );
}