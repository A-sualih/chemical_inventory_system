import React from 'react';
import ResourceListScreen from '../components/ResourceListScreen';

export default function SuppliersScreen() {
  return (
    <ResourceListScreen
      title="Suppliers"
      subtitle="Procurement vendors"
      endpoint="/procurement/suppliers"
      listKeys={['suppliers', 'data']}
      keyExtractor={(item) => item._id || item.supplier_id}
      primary={(item) => item.name || item.supplier_id || 'Supplier'}
      secondary={(item) =>
        [item.supplier_id, item.category, item.country, item.contact_person]
          .filter(Boolean)
          .join(' · ')
      }
      status={(item) => item.status}
    />
  );
}
