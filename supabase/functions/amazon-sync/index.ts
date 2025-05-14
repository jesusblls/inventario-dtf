// Update the syncOrder function to include order amount
async function syncOrder(accessToken: string, order: any) {
  try {
    console.log('🔄 Sincronizando orden:', order.AmazonOrderId);
    
    // Get order items
    const items = await getOrderItems(accessToken, order.AmazonOrderId);
    console.log(`📦 ${items.length} items encontrados para orden:`, order.AmazonOrderId);
    
    // Calculate total order amount
    const orderAmount = items.reduce((total, item) => {
      const price = parseFloat(item.ItemPrice?.Amount || '0');
      const quantity = parseInt(item.QuantityOrdered || '1', 10);
      return total + (price * quantity);
    }, 0);
    
    // Sync products first
    let productsProcessed = 0;
    for (const item of items) {
      const success = await syncProduct(item);
      if (success) productsProcessed++;
    }

    // Sync order with amount
    const { error } = await supabase.rpc('sync_amazon_order', {
      p_order_id: order.AmazonOrderId,
      p_status: order.OrderStatus,
      p_amount: orderAmount
    });

    if (error) {
      console.error('❌ Error sincronizando orden:', error);
      throw error;
    }
    
    console.log('✅ Orden sincronizada:', order.AmazonOrderId);
    return {
      success: true,
      productsProcessed,
      amount: orderAmount
    };
  } catch (error) {
    console.error('❌ Error sincronizando orden:', order.AmazonOrderId, error);
    return {
      success: false,
      productsProcessed: 0,
      amount: 0
    };
  }
}