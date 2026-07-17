import React from 'react';
import ResourceListScreen from '../components/ResourceListScreen';

export default function BatchesScreen() {
  return (
    <ResourceListScreen
      title="Batches"
      subtitle="Lot tracking for the active lab"
      endpoint="/batches"
      listKeys={['batches', 'data']}
      keyExtractor={(item) => item._id || item.batch_number}
      primary={(item) => item.batch_number || item.lot_number || 'Batch'}
      secondary={(item) =>
        [
          item.chemical_name || item.chemical_id,
          item.quantity != null ? `${item.quantity} ${item.unit || ''}`.trim() : null,
          item.expiry_date ? `Exp ${new Date(item.expiry_date).toLocaleDateString()}` : null,
        ]
          .filter(Boolean)
          .join(' · ')
      }
      status={(item) => item.status}
    />
  );
}
