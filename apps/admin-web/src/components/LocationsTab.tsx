import React, { useEffect, useState } from 'react';
import { City } from '../../../../packages/shared-types';
import { fetchLocations, addLocation, deleteLocation } from '../api';
import { CrudListPanel, DeleteButton } from './CrudListPanel';

export const LocationsTab: React.FC<{ token: string }> = ({ token }) => {
  const [locations, setLocations] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetchLocations();
    setLocations(res.data?.locations || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <CrudListPanel
      title="Serviceable Locations"
      subtitle="Cities the marketplace currently operates in."
      items={locations}
      loading={loading}
      rowKey={(c) => c.id}
      columns={[
        { label: 'City', render: (c) => <span className="font-bold text-white">{c.name}</span> },
        { label: 'State', render: (c) => c.state },
      ]}
      addFields={[
        { name: 'name', label: 'City', placeholder: 'e.g. Trichy' },
        { name: 'state', label: 'State', placeholder: 'e.g. Tamil Nadu' },
      ]}
      addLabel="Add Location"
      onAdd={async (v) => { await addLocation(token, v.name, v.state); await load(); }}
      rowAction={(c) => (
        <DeleteButton
          busy={busyId === c.id}
          onClick={async () => { setBusyId(c.id); await deleteLocation(token, c.id); await load(); setBusyId(null); }}
        />
      )}
      emptyText="No locations yet."
    />
  );
};
