import React, { useState, useEffect } from 'react';
import { X, Loader, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Design, AmazonProduct } from '../lib/types';

interface User {
  id: string;
}

interface DesignModalProps {
  design?: Design;
  onClose: () => void;
  onSave: () => void;
}

export function DesignModal({ design, onClose, onSave }: DesignModalProps) {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState(design?.name || '');
  const [stock, setStock] = useState(design?.stock || 0);
  const [selectedAmazonProducts, setSelectedAmazonProducts] = useState<string[]>([]);
  const [amazonProducts, setAmazonProducts] = useState<AmazonProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUser();
    fetchAmazonProducts();
    if (design) {
      fetchDesignAmazonProducts();
    }
  }, [design]);

  const fetchUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');
      setUser(user);
    } catch (err) {
      console.error('Error fetching user:', err);
      setError('Error al obtener información del usuario');
    }
  };

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

  const fetchDesignAmazonProducts = async () => {
    if (!design?.id) return;

    try {
      const { data, error } = await supabase
        .from('design_amazon_products')
        .select('amazon_product_id')
        .eq('design_id', design.id);

      if (error) throw error;

      setSelectedAmazonProducts(data.map(dap => dap.amazon_product_id));
    } catch (err) {
      console.error('Error fetching design Amazon products:', err);
      setError('Error al cargar productos de Amazon asociados');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const stockValue = parseInt(stock.toString());

    if (isNaN(stockValue)) {
      setError('El stock debe ser un número válido');
      setLoading(false);
      return;
    }

    try {
      // Get the current user's ID
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!user) throw new Error('No user found');

      if (!user) throw new Error('No authenticated user');

      if (design?.id) {
        // Update existing design
        const { error: updateError } = await supabase
          .from('designs')
          .upsert({
            id: design.id,
            name,
            stock: stockValue,
            owner_id: user.id,
            updated_at: new Date().toISOString()
          })

        if (updateError) throw updateError;

        // Update Amazon product associations
        const { error: deleteAmazonError } = await supabase
          .from('design_amazon_products')
          .delete()
          .eq('design_id', design.id);

        if (deleteAmazonError) throw deleteAmazonError;

        if (selectedAmazonProducts.length > 0) {
          const { error: insertAmazonError } = await supabase
            .from('design_amazon_products')
            .insert(
              selectedAmazonProducts.map(amazonProductId => ({
                design_id: design.id,
                amazon_product_id: amazonProductId
              }))
            );

          if (insertAmazonError) throw insertAmazonError;
        }
      } else {
        // Create new design with owner_id
        const { data: designData, error: insertError } = await supabase
          .from('designs')
          .insert({
            name,
            stock: stockValue,
            owner_id: user.id // Set owner_id for new designs
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Create Amazon product associations
        if (designData && selectedAmazonProducts.length > 0) {
          const { error: amazonRelationError } = await supabase
            .from('design_amazon_products')
            .insert(
              selectedAmazonProducts.map(amazonProductId => ({
                design_id: designData.id,
                amazon_product_id: amazonProductId
              }))
            );

          if (amazonRelationError) throw amazonRelationError;
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

  const handleAmazonProductSelect = (amazonProductId: string) => {
    setSelectedAmazonProducts(prev => {
      if (prev.includes(amazonProductId)) {
        return prev.filter(id => id !== amazonProductId);
      }
      return [...prev, amazonProductId];
    });
  };

  const filteredAmazonProducts = amazonProducts.filter(product =>
    product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.asin.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
              onChange={(e) => {
                const value = e.target.value;
                setStock(value === '' ? 0 : parseInt(value));
              }}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Productos de Amazon Asociados
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2">
              {filteredAmazonProducts.map((ap) => (
                <label
                  key={ap.id}
                  className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedAmazonProducts.includes(ap.id)}
                    onChange={() => handleAmazonProductSelect(ap.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{ap.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">ASIN: {ap.asin}</div>
                  </div>
                </label>
              ))}
              {filteredAmazonProducts.length === 0 && (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  No se encontraron productos
                </div>
              )}
            </div>
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