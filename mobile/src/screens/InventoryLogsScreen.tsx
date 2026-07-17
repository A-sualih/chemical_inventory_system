import React from 'react';
import ResourceListScreen from '../components/ResourceListScreen';

export default function InventoryLogsScreen() {
  return (
    <ResourceListScreen
      title="Inventory Logs"
      subtitle="Stock movements for this lab"
      endpoint="/inventory/logs"
      listKeys={['logs', 'data']}
      keyExtractor={(item) => item._id || `${item.action}-${item.createdAt}`}
      primary={(item) => item.chemical_name || item.chemical_id || item.action || 'Log'}
      secondary={(item) =>
        [
          item.action || item.type,
          item.quantity != null ? `${item.quantity} ${item.unit || ''}`.trim() : null,
          item.user_name || item.performed_by,
          item.createdAt ? new Date(item.createdAt).toLocaleString() : null,
        ]
          .filter(Boolean)
          .join(' · ')
      }
      status={(item) => item.action || item.type}
    />
  );
}
