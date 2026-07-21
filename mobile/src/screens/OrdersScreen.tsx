import React from 'react';
import ResourceListScreen from '../components/ResourceListScreen';

export default function OrdersScreen() {
  return (
    <ResourceListScreen
      title="Purchase Orders"
      subtitle="Procurement orders"
      endpoint="/procurement/orders"
      listKeys={['orders', 'purchase_orders', 'data']}
      keyExtractor={(item) => item._id || item.po_number}
      primary={(item) => item.po_number || item._id || 'PO'}
      secondary={(item) =>
        [
          item.supplier_name || item.supplier?.name,
          item.total != null ? `$${item.total}` : null,
          item.createdAt ? new Date(item.createdAt).toLocaleDateString() : null,
        ]
          .filter(Boolean)
          .join(' · ')
      }
      status={(item) => item.status}
    />
  );
}
