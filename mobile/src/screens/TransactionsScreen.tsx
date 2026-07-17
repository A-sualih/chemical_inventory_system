import React from 'react';
import ResourceListScreen from '../components/ResourceListScreen';

export default function TransactionsScreen() {
  return (
    <ResourceListScreen
      title="Transactions"
      subtitle="Check-in / check-out history"
      endpoint="/transactions/history"
      listKeys={['transactions', 'history', 'data']}
      keyExtractor={(item) => item._id || `${item.type}-${item.createdAt}`}
      primary={(item) => item.chemical_name || item.chemical_id || item.type || 'Transaction'}
      secondary={(item) =>
        [
          item.type,
          item.quantity != null ? `${item.quantity} ${item.unit || ''}`.trim() : null,
          item.user_name || item.performed_by,
          item.createdAt ? new Date(item.createdAt).toLocaleString() : null,
        ]
          .filter(Boolean)
          .join(' · ')
      }
      status={(item) => item.status || item.type}
    />
  );
}
