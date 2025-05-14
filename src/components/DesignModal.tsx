import React, { useState, useEffect } from 'react';
import { X, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Design, AmazonProduct } from '../lib/types';

interface DesignModalProps {
  design?: Design;
  onClose: () => void;
  onSave: () => void;
}

export function DesignModal({ design, onClose, onSave }: DesignModalProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(design?.name || '');
  const [stock, setStock] = useState(design?.stock || 0);
  const [amazonProductId, setAmazonProductId] = useState('');
  const [amazonProducts, setAmazonProducts] = useState<AmazonProduct[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAmazonProducts();
  }, []);

  const fetchAmazonProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('amazon_products')
        .select('*')
        .order('title');
      
      if (error) throw error;
      
      setAmazonProducts(data || []);
    } catch (err) {
      console.error('Error fetching Amazon products:', err);
      setError('Error al cargar productos de Amazon');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (design?.id) {
        // Update existing design
        const { error: updateError } = await supabase
          .from('designs')
          .update({
            name,
            stock,
            updated_at: new Date().toISOString(),
          })
          .eq('id', design.id);

        if (updateError) throw updateError;
      } else {
        // Create new design
        const { data: designData, error: insertError } = await supabase
          .from('designs')
          .insert({
            name,
            stock,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // If Amazon product was selected, create product_designs relationship
        if (amazonProductId && designData) {
          const { error: relationError } = await supabase
            .from('product_designs')
            .insert({
              product_id: amazonProductId,
              design_id: designData.id
            });

          if (relationError) throw relationError;
        }
      }

      onSave();
      onClose();
    } catch (err) {
      console.error('Error saving design:', err);
      setError('Error al guardar el diseño. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            {design ? 'Editar Diseño' : 'Nuevo Diseño'}
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
              Nombre del Diseño
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              {design ? 'Guardar Cambios' : 'Crear Diseño'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}