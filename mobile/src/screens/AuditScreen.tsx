import React from 'react';
import ResourceListScreen from '../components/ResourceListScreen';

export default function AuditScreen() {
  return (
    <ResourceListScreen
      title="Master Audit"
      subtitle="Admin only — institutional audit trail"
      endpoint="/audit"
      listKeys={['logs', 'audit', 'data']}
      keyExtractor={(item) => item._id || `${item.action}-${item.createdAt}`}
      primary={(item) => item.action || item.event || item.type || 'Audit event'}
      secondary={(item) =>
        [
          item.user_name || item.user?.name || item.email,
          item.details || item.message,
          item.ip,
          item.createdAt ? new Date(item.createdAt).toLocaleString() : null,
        ]
          .filter(Boolean)
          .join(' · ')
      }
      status={(item) => item.action || item.type}
    />
  );
}
