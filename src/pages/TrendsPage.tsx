import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Calendar, TrendingUp, ArrowUpRight, ArrowDownRight, DollarSign, Package, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SalesData {
  date: string;
  sales: number;
  revenue: number;
}

interface ProductTrend {
  name: string;
  category: string;
  growth: number;
  sales: number;
  revenue: number;
}

interface DashboardStats {
  total_sales: number;
  total_revenue: number;
  average_order_value: number;
}

const timeRanges = [
  { label: 'Última Semana', days: 7 },
  { label: 'Último Mes', days: 30 },
  { label: 'Último Trimestre', days: 90 },
  { label: 'Último Año', days: 365 }
];

export function TrendsPage() {
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRanges[1]);
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<ProductTrend[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total_sales: 0,
    total_revenue: 0,
    average_order_value: 0
  });
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>(['Todas']);

  useEffect(() => {
    fetchData();
  }, [selectedTimeRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - selectedTimeRange.days);

      // Fetch sales data
      const { data: salesData, error: salesError } = await supabase
        .rpc('get_sales_data', {
          start_date: startDate.toISOString(),
          end_date: new Date().toISOString()
        });

      if (salesError) throw salesError;

      // Fetch top products
      const { data: productsData, error: productsError } = await supabase
        .rpc('get_top_products', {
          start_date: startDate.toISOString(),
          end_date: new Date().toISOString()
        });

      if (productsError) throw productsError;

      // Fetch dashboard stats
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_dashboard_stats', {
          start_date: startDate.toISOString(),
          end_date: new Date().toISOString()
        });

      if (statsError) throw statsError;

      // Get unique categories from products
      const uniqueCategories = ['Todas', ...new Set(productsData.map(p => p.category))];

      setSalesData(salesData || []);
      setTrendingProducts(productsData || []);
      setStats(statsData[0] || {
        total_sales: 0,
        total_revenue: 0,
        average_order_value: 0
      });
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching trends data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = trendingProducts.filter(product =>
    selectedCategory === 'Todas' || product.category === selectedCategory
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">Tendencias</h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">Análisis de ventas y comportamiento de productos</p>
          </div>
          <div className="w-full md:w-auto">
            <select
              className="w-full md:w-auto appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={selectedTimeRange.label}
              onChange={(e) => setSelectedTimeRange(timeRanges.find(r => r.label === e.target.value) || timeRanges[1])}
            >
              {timeRanges.map((range) => (
                <option key={range.label} value={range.label}>{range.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Ventas Totales</p>
                <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.total_sales}
                </h3>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/50 p-3 rounded-lg">
                <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Ingresos</p>
                <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mt-1">
                  ${stats.total_revenue.toLocaleString()}
                </h3>
              </div>
              <div className="bg-green-50 dark:bg-green-900/50 p-3 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Valor Promedio</p>
                <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mt-1">
                  ${stats.average_order_value.toLocaleString()}
                </h3>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/50 p-3 rounded-lg">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white">Ventas Diarias</h3>
              <TrendingUp className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer>
                <LineChart data={salesData} margin={{ top: 5, right: 5, bottom: 20, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    stroke="#9CA3AF"
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value: number) => [`${value}`, 'Ventas']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '0.5rem' }}
                    itemStyle={{ color: '#E5E7EB', fontSize: 12 }}
                    labelStyle={{ color: '#E5E7EB', fontSize: 12 }}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white">Ingresos Diarios</h3>
              <DollarSign className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer>
                <BarChart data={salesData} margin={{ top: 5, right: 5, bottom: 20, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    stroke="#9CA3AF"
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Ingresos']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '0.5rem' }}
                    itemStyle={{ color: '#E5E7EB', fontSize: 12 }}
                    labelStyle={{ color: '#E5E7EB', fontSize: 12 }}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="revenue" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Trending Products */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white">Productos Destacados</h3>
            <div className="w-full md:w-auto">
              <select
                className="w-full md:w-auto appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="w-full overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Crecimiento
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ventas
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ingresos
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredProducts.map((product, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">{product.category}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div
                        className={`inline-flex items-center text-sm font-medium ${
                          product.growth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {product.growth >= 0 ? (
                          <ArrowUpRight className="w-4 h-4 mr-1" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 mr-1" />
                        )}
                        {Math.abs(product.growth).toFixed(1)}%
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{product.sales}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        ${product.revenue.toLocaleString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}