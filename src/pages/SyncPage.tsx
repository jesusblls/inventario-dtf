// Update the fetchStats function to include lastSync
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