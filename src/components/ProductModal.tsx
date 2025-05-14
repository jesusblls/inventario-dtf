import React, { useState, useEffect } from 'react';
import { X, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Product, AmazonProduct } from '../lib/types';

interface ProductModalProps {
  product?: Product;
  onClose: () => void;
  onSave: () => void;
}

export function ProductModal({ product, onClose, onSave }: ProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(product?.name || '');
  const [stock, setStock] = useState(product?.stock || 0);
  const [size, setSize] = useState(product?.size || '');
  const [color, setColor] = useState(product?.color || '');
  const [type, setType] = useState<'regular' | 'oversize'>(product?.type || 'regular');
  const [amazonProductId, setAmazonProductId] = useState(product?.amazon_product_id || '');
  const [amazonProducts, setAmazonProducts] = useState<AmazonProduct[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAmazonProducts();
  }, []);

  const fetchAmazonProducts = async () => {
    const { data, error } = await supabase
      .from('amazon_products')
      .select('*');
    
    if (error) {
      console.error('Error fetching Amazon products:', error);
      return;
    }

    setAmazonProducts(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (product?.id) {
        // Update existing product
        const { error: updateError } = await supabase
          .from('products')
          .update({
            name,
            stock,
            size,
            color,
            type,
            amazon_product_id: amazonProductId || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', product.id);

        if (updateError) throw updateError;
      } else {
        // Create new product
        const { error: insertError } = await supabase
          .from('products')
          .insert({
            name,
            stock,
            size,
            color,
            type,
            amazon_product_id: amazonProductId || null,
          });

        if (insertError) throw insertError;
      }

      onSave();
      onClose();
    } catch (err) {
      console.error('Error saving product:', err);
      setError('Error al guardar el producto. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            {product ? 'Editar Producto' : 'Agregar Nueva Prenda'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="p-4 mb-4 bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nombre de la Prenda
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Playera Regular"
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tipo
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'regular' | 'oversize')}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="regular">Regular</option>
                <option value="oversize">Oversize</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Talla
              </label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccionar talla</option>
                <option value="XS">XS</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
                <option value="2XL">2XL</option>
                <option value="3XL">3XL</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Color
              </label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Ej: Negro"
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stock
              </label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(parseInt(e.target.value))}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Producto de Amazon
            </label>
            <select
              value={amazonProductId}
              onChange={(e) => setAmazonProductId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Seleccionar producto</option>
              {amazonProducts.map((ap) => (
                <option key={ap.id} value={ap.id}>
                  {ap.title} ({ap.asin})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              {loading && <Loader className="w-4 h-4 mr-2 animate-spin" />}
              {product ? 'Guardar Cambios' : 'Crear Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}