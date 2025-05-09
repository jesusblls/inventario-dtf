import React, { useState } from 'react';
import { Search, Plus, Edit, Trash2, Filter } from 'lucide-react';
import { ProductModal } from '../components/ProductModal';

interface Product {
  id: number;
  name: string;
  category: string;
  stock: number;
  price: number;
  status: string;
}

const products: Product[] = [
  { id: 1, name: 'Playera F1 Racing', category: 'Deportes', stock: 45, price: 399, status: 'Activo' },
  { id: 2, name: 'Playera Calavera Mexicana', category: 'Cultura', stock: 12, price: 349, status: 'Bajo Stock' },
  { id: 3, name: 'Playera Anime Collection', category: 'Anime', stock: 78, price: 449, status: 'Activo' },
  { id: 4, name: 'Playera Street Art', category: 'Urbano', stock: 8, price: 379, status: 'Bajo Stock' },
  { id: 5, name: 'Playera Gaming Pro', category: 'Gaming', stock: 56, price: 399, status: 'Activo' },
];

export function ProductsPage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();
  const [showFilters, setShowFilters] = useState(false);

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setShowModal(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Productos</h1>
        <button
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Agregar Producto
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar productos..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="sm:hidden px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center"
              >
                <Filter className="w-5 h-5 mr-2" />
                Filtros
              </button>
              <div className={`flex flex-col sm:flex-row gap-4 ${showFilters ? 'block' : 'hidden sm:flex'}`}>
                <select className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Categoría</option>
                  <option value="deportes">Deportes</option>
                  <option value="cultura">Cultura</option>
                  <option value="anime">Anime</option>
                  <option value="urbano">Urbano</option>
                  <option value="gaming">Gaming</option>
                </select>
                <select className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Estado</option>
                  <option value="activo">Activo</option>
                  <option value="bajo-stock">Bajo Stock</option>
                  <option value="agotado">Agotado</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Producto
                  </th>
                  <th scope="col" className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th scope="col" className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Stock
                  </th>
                  <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Precio
                  </th>
                  <th scope="col" className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th scope="col" className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</div>
                        <div className="sm:hidden text-sm text-gray-500 dark:text-gray-400">{product.category}</div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">{product.category}</div>
                    </td>
                    <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{product.stock}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">${product.price}</div>
                    </td>
                    <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        product.status === 'Activo' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                      }`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => handleEdit(product)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <ProductModal
          product={selectedProduct}
          onClose={() => {
            setShowModal(false);
            setSelectedProduct(undefined);
          }}
        />
      )}
    </div>
  );
}