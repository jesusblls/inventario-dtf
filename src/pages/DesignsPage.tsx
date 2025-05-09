import React, { useState } from 'react';
import { Search, Plus, Filter, Download } from 'lucide-react';

interface Design {
  id: number;
  name: string;
  category: string;
  imageUrl: string;
  availableStock: number;
  associatedProducts: number;
  status: 'available' | 'low' | 'out_of_stock';
}

const designs: Design[] = [
  {
    id: 1,
    name: 'F1 Racing Logo 2024',
    category: 'Deportes',
    imageUrl: 'https://images.unsplash.com/photo-1541744573515-478c959628a0',
    availableStock: 45,
    associatedProducts: 3,
    status: 'available'
  },
  {
    id: 2,
    name: 'Calavera Mexicana Tradicional',
    category: 'Cultura',
    imageUrl: 'https://images.unsplash.com/photo-1509644851169-2acc08aa25b5',
    availableStock: 12,
    associatedProducts: 2,
    status: 'low'
  },
  {
    id: 3,
    name: 'Dragon Ball Collection',
    category: 'Anime',
    imageUrl: 'https://images.unsplash.com/photo-1608889825103-eb5ed706fc64',
    availableStock: 78,
    associatedProducts: 5,
    status: 'available'
  },
  {
    id: 4,
    name: 'Urban Street Art',
    category: 'Urbano',
    imageUrl: 'https://images.unsplash.com/photo-1561059531-77147d8de13a',
    availableStock: 8,
    associatedProducts: 1,
    status: 'low'
  },
  {
    id: 5,
    name: 'Gaming Console Pattern',
    category: 'Gaming',
    imageUrl: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf',
    availableStock: 0,
    associatedProducts: 4,
    status: 'out_of_stock'
  },
  {
    id: 6,
    name: 'Retro Wave Sunset',
    category: 'Urbano',
    imageUrl: 'https://images.unsplash.com/photo-1549490349-8643362247b5',
    availableStock: 25,
    associatedProducts: 2,
    status: 'available'
  }
];

const categories = ['Todos', 'Deportes', 'Cultura', 'Anime', 'Urbano', 'Gaming'];

export function DesignsPage() {
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDesigns = designs.filter(design => {
    const matchesCategory = selectedCategory === 'Todos' || design.category === selectedCategory;
    const matchesSearch = design.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getStatusColor = (status: Design['status']) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300';
      case 'low':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300';
      case 'out_of_stock':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300';
    }
  };

  const getStatusText = (status: Design['status']) => {
    switch (status) {
      case 'available':
        return 'Disponible';
      case 'low':
        return 'Stock Bajo';
      case 'out_of_stock':
        return 'Agotado';
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Diseños DTF</h1>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Diseño
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar diseños..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-4">
            <select
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filtros
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDesigns.map((design) => (
            <div key={design.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden">
              <div className="aspect-w-16 aspect-h-9 relative">
                <img
                  src={design.imageUrl}
                  alt={design.name}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(design.status)}`}>
                    {getStatusText(design.status)}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">{design.name}</h3>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{design.category}</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Stock: {design.availableStock} unidades
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {design.associatedProducts} productos asociados
                  </span>
                  <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}