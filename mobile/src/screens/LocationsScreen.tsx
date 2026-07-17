import React from 'react';
import ResourceListScreen from '../components/ResourceListScreen';

export default function LocationsScreen() {
  return (
    <ResourceListScreen
      title="Locations"
      subtitle="Buildings, rooms, cabinets, shelves"
      endpoint="/locations"
      listKeys={['locations', 'hierarchy', 'data', 'blocks']}
      keyExtractor={(item) => item._id || item.id || item.name || item.code}
      primary={(item) => item.name || item.building || item.block || item.code || 'Location'}
      secondary={(item) =>
        [
          item.type || item.level,
          item.building,
          item.room,
          item.cabinet,
          item.shelf,
          item.path,
        ]
          .filter(Boolean)
          .join(' · ')
      }
      status={(item) => item.type || item.status}
    />
  );
}
