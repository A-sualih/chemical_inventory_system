import React from 'react';
import ResourceListScreen from '../components/ResourceListScreen';

export default function ContainersScreen() {
  return (
    <ResourceListScreen
      title="Containers"
      subtitle="Physical vessels in the active lab"
      endpoint="/containers"
      listKeys={['containers', 'data']}
      keyExtractor={(item) => item._id || item.container_id}
      primary={(item) => item.container_id || item.id || 'Container'}
      secondary={(item) =>
        [
          item.chemical_name || item.chemical_id,
          item.quantity != null ? `${item.quantity} ${item.unit || ''}`.trim() : null,
          [item.building, item.room, item.cabinet].filter(Boolean).join(' / ') || item.location,
        ]
          .filter(Boolean)
          .join(' · ')
      }
      status={(item) => item.status}
    />
  );
}
