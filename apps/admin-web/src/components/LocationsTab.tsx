import React, { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, MapPin, Sparkles, Database, Search, CheckSquare, Square, RefreshCw } from 'lucide-react';
import { City } from '../../../../packages/shared-types';
import { fetchLocations, addLocation, deleteLocation, addLocationsBulk } from '../api';
import { INDIA_STATES_AND_CITIES } from '../../../../packages/shared-utils';

export const LocationsTab: React.FC<{ token: string }> = ({ token }) => {
  const [locations, setLocations] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Form states
  const [manualCity, setManualCity] = useState('');
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState('');

  // Bulk seeding states
  const [selectedState, setSelectedState] = useState('Telangana');
  const [citySearch, setCitySearch] = useState('');
  const [selectedCities, setSelectedCities] = useState<Record<string, boolean>>({});
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkMessage, setBulkMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchLocations();
      setLocations(res.data?.locations || []);
    } catch (err) {
      console.error('Failed to load locations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Update checkbox state list when state selection changes
  useEffect(() => {
    const defaultSelection: Record<string, boolean> = {};
    const citiesForState = INDIA_STATES_AND_CITIES[selectedState] || [];
    citiesForState.forEach(c => {
      const alreadyAdded = locations.some(
        loc => loc.name.toLowerCase() === c.toLowerCase() && loc.state.toLowerCase() === selectedState.toLowerCase()
      );
      defaultSelection[c] = alreadyAdded;
    });
    setSelectedCities(defaultSelection);
    setCitySearch('');
  }, [selectedState, locations]);

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCity.trim()) return;
    setManualSaving(true);
    setManualError('');
    try {
      await addLocation(token, manualCity.trim(), selectedState);
      setManualCity('');
      await load();
    } catch (err: any) {
      setManualError(err.message || 'Failed to add location.');
    } finally {
      setManualSaving(false);
    }
  };

  const handleBulkAdd = async () => {
    const citiesToAdd = Object.entries(selectedCities)
      .filter(([_, checked]) => checked)
      .map(([name]) => name);

    const newCities = citiesToAdd.filter(name => 
      !locations.some(
        loc => loc.name.toLowerCase() === name.toLowerCase() && loc.state.toLowerCase() === selectedState.toLowerCase()
      )
    );

    if (newCities.length === 0) {
      setBulkMessage('All selected cities are already added.');
      setTimeout(() => setBulkMessage(''), 3000);
      return;
    }

    setBulkSaving(true);
    setBulkMessage('');
    try {
      const payload = newCities.map(name => ({ name, state: selectedState }));
      const res = await addLocationsBulk(token, payload);
      setBulkMessage(res.message || `Successfully added ${newCities.length} cities.`);
      await load();
    } catch (err: any) {
      setBulkMessage(`Error: ${err.message || 'Seeding failed.'}`);
    } finally {
      setBulkSaving(false);
      setTimeout(() => setBulkMessage(''), 4000);
    }
  };

  const handleDeleteCity = async (cityId: string) => {
    setBusyId(cityId);
    try {
      await deleteLocation(token, cityId);
      await load();
    } catch (err) {
      console.error('Failed to delete city', err);
    } finally {
      setBusyId(null);
    }
  };

  const citiesInSelectedState = INDIA_STATES_AND_CITIES[selectedState] || [];
  const filteredCitiesForSelection = citiesInSelectedState.filter(c =>
    c.toLowerCase().includes(citySearch.toLowerCase())
  );

  // Custom added cities for this state (in DB but not in master list)
  const customCitiesInState = locations.filter(loc => 
    loc.state.toLowerCase() === selectedState.toLowerCase() &&
    !citiesInSelectedState.some(c => c.toLowerCase() === loc.name.toLowerCase())
  );

  const checkedCount = Object.values(selectedCities).filter(Boolean).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Stats Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <MapPin className="w-6 h-6 text-indigo-400" />
            Serviceable Locations
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Configure geographic coverage for vendors and customer events across India.
          </p>
        </div>

        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs px-3.5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center gap-4 bg-slate-900/40">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Active Cities</span>
            <span className="text-2xl font-extrabold text-white">{locations.length}</span>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center gap-4 bg-slate-900/40">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active States / UTs</span>
            <span className="text-2xl font-extrabold text-white">
              {new Set(locations.map(l => l.state.toLowerCase())).size}
            </span>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center gap-4 bg-slate-900/40">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">India Master Database</span>
            <span className="text-2xl font-extrabold text-white">
              {Object.keys(INDIA_STATES_AND_CITIES).length} States
            </span>
          </div>
        </div>
      </div>

      {/* Main Seeder Section */}
      <div className="space-y-6">

        {/* State-wise City Seeder */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-900/20 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Database className="w-4 h-4 text-indigo-400" />
              State-wise City Seeder & Active Locations
            </h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
              {locations.filter(l => l.state === selectedState).length} Active in {selectedState}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">1. Select State</label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
              >
                {Object.keys(INDIA_STATES_AND_CITIES).map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Search Cities in State</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter cities..."
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Master Cities Checkbox Grid */}
          <div className="border border-slate-800/80 rounded-xl bg-slate-950/60 p-4 max-h-[350px] overflow-y-auto space-y-1">
            <span className="text-[9px] uppercase font-bold text-slate-500 block mb-2">Master Database Cities</span>
            {filteredCitiesForSelection.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">No master database cities match filter.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {filteredCitiesForSelection.map(c => {
                  const dbCity = locations.find(
                    loc => loc.name.toLowerCase() === c.toLowerCase() && loc.state.toLowerCase() === selectedState.toLowerCase()
                  );
                  const inDb = !!dbCity;
                  const checked = !!selectedCities[c];
                  
                  return (
                    <div
                      key={c}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs transition-colors border ${
                        inDb
                          ? 'bg-emerald-950/10 border-emerald-500/20 text-emerald-300'
                          : checked
                          ? 'bg-indigo-900/20 border-indigo-500/40 text-white'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (!inDb) {
                            setSelectedCities(prev => ({ ...prev, [c]: !prev[c] }));
                          }
                        }}
                        disabled={inDb}
                        className="flex items-center gap-2 text-left flex-1 min-w-0 disabled:cursor-default"
                      >
                        {inDb ? (
                          <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : checked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        )}
                        <span className="truncate">{c}</span>
                      </button>

                      {inDb && dbCity && (
                        <button
                          type="button"
                          disabled={busyId === dbCity.id}
                          onClick={() => handleDeleteCity(dbCity.id)}
                          className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors ml-1 shrink-0"
                          title={`Remove ${c}`}
                        >
                          {busyId === dbCity.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Custom Added Cities (if any in DB that aren't in master) */}
          {customCitiesInState.length > 0 && (
            <div className="border border-slate-800/80 rounded-xl bg-slate-950/60 p-4 space-y-2">
              <span className="text-[9px] uppercase font-bold text-slate-500 block">Custom Added Cities (Not in Master List)</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {customCitiesInState.map(city => (
                  <div
                    key={city.id}
                    className="flex items-center justify-between p-2 rounded-lg text-xs bg-slate-900 border border-slate-800 text-slate-300"
                  >
                    <span className="truncate flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                      {city.name}
                    </span>
                    <button
                      type="button"
                      disabled={busyId === city.id}
                      onClick={() => handleDeleteCity(city.id)}
                      className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors shrink-0 ml-1"
                    >
                      {busyId === city.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions & Add Custom Inline Form */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 border-t border-slate-800/60">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const allChecked: Record<string, boolean> = {};
                  citiesInSelectedState.forEach(c => { allChecked[c] = true; });
                  setSelectedCities(allChecked);
                }}
                className="text-[10px] font-bold text-slate-400 hover:text-white uppercase transition-colors"
              >
                Select All
              </button>
              <span className="text-slate-700 text-xs">|</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedCities({});
                }}
                className="text-[10px] font-bold text-slate-400 hover:text-white uppercase transition-colors"
              >
                Clear Selection
              </button>
              <span className="text-slate-700 text-xs">|</span>
              <span className="text-slate-300 text-xs font-semibold">
                {checkedCount} Selected
              </span>
            </div>

            <button
              type="button"
              onClick={handleBulkAdd}
              disabled={bulkSaving || checkedCount === 0}
              className="md:ml-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-colors"
            >
              {bulkSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add Selected ({checkedCount})
            </button>
          </div>

          {bulkSaving && (
            <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 px-3 py-2 rounded-xl border border-amber-500/20">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Processing database write...</span>
            </div>
          )}
          {bulkMessage && (
            <p className="text-xs text-indigo-300 font-bold bg-indigo-500/10 px-3 py-2 rounded-xl border border-indigo-500/20">
              {bulkMessage}
            </p>
          )}

          {/* Custom inline addition input */}
          <form onSubmit={handleManualAdd} className="pt-4 border-t border-slate-800/60 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Add Custom City not in list to {selectedState}
              </label>
              <input
                type="text"
                placeholder="Type custom city name..."
                value={manualCity}
                onChange={(e) => setManualCity(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={manualSaving || !manualCity.trim()}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              {manualSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add Custom
            </button>
            {manualError && <p className="w-full text-xs text-rose-400">{manualError}</p>}
          </form>

        </div>

      </div>
    </div>
  );
};