import React, { useState, useEffect } from 'react';
import { Search, Plus, Download, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DesignModal } from '../components/DesignModal';
import type { Design } from '../lib/types';

export function DesignsPage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState<Design | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDesigns();
  }, []);

  const fetchDesigns = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: designsData, error: designsError } = await supabase
        .from('designs')
        .select('*')
        .order('created_at', { ascending: false });

      if (designsError) throw designsError;

      const designsWithAmazon = await Promise.all(
        (designsData || []).map(async (design) => {
          const { data: amazonProducts, error: amazonError } = await supabase
            .from('design_amazon_products')
            .select(`
              amazon_products (
                id,
                asin,
                title,
                created_at,
                updated_at
              )
            `)
            .eq('design_id', design.id);

          if (amazonError) throw amazonError;

          return {
            ...design,
            amazon_products: amazonProducts?.map(ap => ap.amazon_products) || []
          };
        })
      );

      setDesigns(designsWithAmazon);
    } catch (err) {
      console.error('Error fetching designs:', err);
      setError('Error al cargar los diseños. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const filteredDesigns = designs.filter(design =>
    design.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    design.amazon_products?.some(ap => 
      ap.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Diseños DTF</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Diseño
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDesigns.map((design) => (
            <div
              key={design.id}
              className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden cursor-pointer"
              onClick={() => {
                setSelectedDesign(design);
                setShowModal(true);
              }}
            >
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">{design.name}</h3>
                <div className="flex flex-col gap-2">
                  <span className={`text-sm font-medium ${
                    design.stock > 10 
                      ? 'text-green-600 dark:text-green-400'
                      : design.stock > 0
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    Stock: {design.stock} unidades
                  </span>
                  {design.amazon_products && design.amazon_products.length > 0 && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {design.amazon_products.map((ap, index) => (
                        <div key={ap.id} className="truncate">
                          Amazon: {ap.title}
                          {index < design.amazon_products!.length - 1 && ', '}
                        </div>
                      ))}
                    </div>
                  )}
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(design.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <DesignModal
          design={selectedDesign}
          onClose={() => {
            setShowModal(false);
            setSelectedDesign(undefined);
          }}
          onSave={fetchDesigns}
        />
      )}
    </div>
  );
}