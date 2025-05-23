import React, { useState, useEffect } from 'react';
import { AlertTriangle, Package, DollarSign, Bell, BarChart3 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  recentOrders: {
    id: string;
    orderNumber: string;
    amount: number;
    status: string;
    date: string;
  }[];
  topProducts: {
    name: string;
    sales: number;
    revenue: number;
    growth: number;
  }[];
  lowStockCount: number;
}

export function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    recentOrders: [],
    topProducts: [],
    lowStockCount: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Get total products and low stock count
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, stock');

      if (productsError) throw productsError;
      // Get active alerts count
      const { data: activeAlerts, error: alertsError } = await supabase
        .from('alerts')
        .select('id')
        .eq('status', 'pending');

      if (alertsError) throw alertsError;

      const lowStockCount = activeAlerts?.length || 0;
      const totalProducts = products?.length || 0;

      // Get all-time orders and revenue
      const { data: dashboardStats, error: statsError } = await supabase
        .from('amazon_orders')
        .select('amount');

      if (statsError) throw statsError;

      const totalRevenue = dashboardStats?.reduce((sum, order) => sum + (order.amount || 0), 0) || 0;
      const totalOrders = dashboardStats?.length || 0;

      // Get recent orders with amounts
      const { data: orders, error: ordersError } = await supabase
        .from('amazon_orders')
        .select('*')
        .order('purchase_date', { ascending: false })
        .limit(5);

      if (ordersError) throw ordersError;

      // Get all-time top products with a proper join
      const { data: topProducts, error: topProductsError } = await supabase
        .from('amazon_order_items')
        .select(`
          asin,
          quantity_ordered,
          amazon_products!amazon_order_items_asin_fkey (
            title
          )
        `);

      if (topProductsError) throw topProductsError;

      // Process top products data
      const productSales = new Map();
      const productNames = new Map();
      topProducts?.forEach(item => {
        const asin = item.asin;
        const currentCount = productSales.get(asin) || 0;
        productSales.set(asin, currentCount + item.quantity_ordered);
        productNames.set(asin, item.amazon_products.title);
      });

      const topProductsList = Array.from(productSales.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([asin, sales]) => ({
          name: productNames.get(asin) || asin,
          sales,
          revenue: 0,
          growth: 0
        }));

      const recentOrders = (orders || []).map(order => ({
        id: order.id,
        orderNumber: order.amazon_order_id,
        amount: order.amount || 0,
        status: order.status,
        date: order.purchase_date
      }));

      setStats({
        totalProducts,
        totalOrders,
        totalRevenue,
        recentOrders,
        topProducts: topProductsList,
        lowStockCount
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <main className="flex-1 p-4 md:p-8 bg-gray-100 dark:bg-gray-900 overflow-x-hidden">
      {stats.lowStockCount > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/50 border-l-4 border-yellow-400 p-4 mb-6 md:mb-8 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-yellow-400 flex-shrink-0" />
            <p className="ml-3 text-sm md:text-base text-yellow-700 dark:text-yellow-300">
              ¡Alerta! {stats.lowStockCount} alertas activas
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6">
          <div className="flex items-center">
            <Package className="w-6 h-6 md:w-8 md:h-8 text-blue-600 dark:text-blue-400" />
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Productos</p>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalProducts.toLocaleString()}
              </h3>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6">
          <div className="flex items-center">
            <DollarSign className="w-6 h-6 md:w-8 md:h-8 text-green-600 dark:text-green-400" />
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Ingresos Totales</p>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                ${stats.totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6">
          <div className="flex items-center">
            <Bell className="w-6 h-6 md:w-8 md:h-8 text-red-600 dark:text-red-400" />
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Alertas Activas</p>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {stats.lowStockCount.toLocaleString()}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-800 dark:text-white">
              Productos Más Vendidos
            </h3>
            <BarChart3 className="w-5 h-5 md:w-6 md:h-6 text-gray-400 dark:text-gray-500" />
          </div>
          <div className="space-y-4">
            {stats.topProducts.map((product, index) => (
              <div key={index} className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {product.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-400">
                      {product.sales.toLocaleString()} ventas
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
                  <div
                    style={{ width: `${(product.sales / (stats.topProducts[0]?.sales || 1)) * 100}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 dark:bg-blue-500"
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-800 dark:text-white">
              Órdenes Recientes
            </h3>
            <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-gray-400 dark:text-gray-500" />
          </div>
          <div className="space-y-4">
            <div className="flex flex-col space-y-3">
              {stats.recentOrders.map((order, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <Package className="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm md:text-base font-medium text-gray-900 dark:text-white">
                        Orden #{order.orderNumber}
                      </p>
                      <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                        {new Date(order.date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm md:text-base font-medium text-gray-900 dark:text-white">
                      ${order.amount.toLocaleString()}
                    </p>
                    <p className="text-xs md:text-sm text-green-600 dark:text-green-400">
                      {order.status}
                    </p>
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