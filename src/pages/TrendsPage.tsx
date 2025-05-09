import React, { useState } from 'react';
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
import { Calendar, TrendingUp, ArrowUpRight, ArrowDownRight, DollarSign, Package, Users, ChevronDown } from 'lucide-react';

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

const salesData: SalesData[] = [
  { date: '2024-03-01', sales: 45, revenue: 17955 },
  { date: '2024-03-02', sales: 52, revenue: 20748 },
  { date: '2024-03-03', sales: 48, revenue: 19152 },
  { date: '2024-03-04', sales: 70, revenue: 27930 },
  { date: '2024-03-05', sales: 61, revenue: 24339 },
  { date: '2024-03-06', sales: 65, revenue: 25935 },
  { date: '2024-03-07', sales: 75, revenue: 29925 },
  { date: '2024-03-08', sales: 68, revenue: 27132 },
  { date: '2024-03-09', sales: 58, revenue: 23142 },
  { date: '2024-03-10', sales: 63, revenue: 25137 },
];

const trendingProducts: ProductTrend[] = [
  {
    name: 'Playera F1 Racing',
    category: 'Deportes',
    growth: 45,
    sales: 156,
    revenue: 62244,
  },
  {
    name: 'Playera Calavera Mexicana',
    category: 'Cultura',
    growth: 32,
    sales: 128,
    revenue: 44672,
  },
  {
    name: 'Playera Dragon Ball',
    category: 'Anime',
    growth: -8,
    sales: 98,
    revenue: 34202,
  },
  {
    name: 'Playera Street Art',
    category: 'Urbano',
    growth: 25,
    sales: 112,
    revenue: 39088,
  },
  {
    name: 'Playera Gaming Pro',
    category: 'Gaming',
    growth: 15,
    sales: 89,
    revenue: 31061,
  },
];

const timeRanges = ['Última Semana', 'Último Mes', 'Último Trimestre', 'Último Año'];
const categories = ['Todas', 'Deportes', 'Cultura', 'Anime', 'Urbano', 'Gaming'];

export function TrendsPage() {
  const [selectedTimeRange, setSelectedTimeRange] = useState('Último Mes');
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  const totalRevenue = salesData.reduce((sum, day) => sum + day.revenue, 0);
  const totalSales = salesData.reduce((sum, day) => sum + day.sales, 0);
  const averageOrderValue = totalRevenue / totalSales;

  const stats = [
    {
      title: 'Ventas Totales',
      value: totalSales,
      change: '+12.5%',
      isPositive: true,
      icon: Package,
    },
    {
      title: 'Ingresos',
      value: `$${totalRevenue.toLocaleString()}`,
      change: '+15.2%',
      isPositive: true,
      icon: DollarSign,
    },
    {
      title: 'Valor Promedio',
      value: `$${averageOrderValue.toFixed(2)}`,
      change: '+2.4%',
      isPositive: true,
      icon: Users,
    },
  ];

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
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
            >
              {timeRanges.map((range) => (
                <option key={range} value={range}>{range}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stat.title}</p>
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</h3>
                  <div className="flex items-center mt-2">
                    {stat.isPositive ? (
                      <ArrowUpRight className="w-4 h-4 text-green-500" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-xs font-medium ${
                      stat.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {stat.change}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-1.5">vs mes anterior</span>
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/50 p-3 rounded-lg">
                  <stat.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
          ))}
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
                {trendingProducts
                  .filter(
                    (product) =>
                      selectedCategory === 'Todas' || product.category === selectedCategory
                  )
                  .map((product, index) => (
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
                          {Math.abs(product.growth)}%
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