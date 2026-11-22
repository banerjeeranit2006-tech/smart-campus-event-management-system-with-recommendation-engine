import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';
import { initiateSocketConnection } from '../services/socket';
import { MapPin, Activity, Info } from 'lucide-react';

const ZONE_CAPACITIES = {
  'Entrance': 20,
  'Main Hall': 85,
  'Food Court': 45
};

const HeatmapView = () => {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [zones, setZones] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingCrowd, setLoadingCrowd] = useState(false);
  const [socketStatus, setSocketStatus] = useState('Disconnected');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoadingEvents(true);
        const res = await api.get('/events');
        setEvents(res.data.data);
        if (res.data.data.length > 0) {
          setSelectedEventId(res.data.data[0]._id);
        }
      } catch (err) {
        console.error('Failed to fetch events for heatmap:', err.message);
      } finally {
        setLoadingEvents(false);
      }
    };
    
    fetchEvents();
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;

    const fetchInitialCrowd = async () => {
      try {
        setLoadingCrowd(true);
        const res = await api.get(`/events/${selectedEventId}/crowd`);
        setZones(res.data.data || []);
      } catch (err) {
        console.error('Failed to load initial crowd data:', err.message);
      } finally {
        setLoadingCrowd(false);
      }
    };

    fetchInitialCrowd();

    const socket = initiateSocketConnection();
    setSocketStatus('Connecting...');
    socket.emit('join-event', selectedEventId);

    socket.on('connect', () => {
      setSocketStatus('Connected');
    });

    socket.on('disconnect', () => {
      setSocketStatus('Disconnected');
    });

    socket.on('crowd:update', (data) => {
      if (data.eventId.toString() === selectedEventId.toString()) {
        setZones(data.zones);
      }
    });

    setSocketStatus(socket.connected ? 'Connected' : 'Connecting...');

    return () => {
      socket.emit('leave-event', selectedEventId);
      socket.off('crowd:update');
    };
  }, [selectedEventId]);

  const getZoneDensityDetails = (zoneName, count) => {
    const capacity = ZONE_CAPACITIES[zoneName] || 50;
    const ratio = count / capacity;
    
    let color = 'bg-[#27AE60]/10 border-[#27AE60]/30 text-[#27AE60]';
    let textColor = 'text-[#27AE60]';
    let badgeText = 'Low Density';
    let dotColor = 'bg-[#27AE60]';

    if (ratio >= 0.4 && ratio < 0.8) {
      color = 'bg-[#F39C12]/10 border-[#F39C12]/30 text-[#F39C12]';
      textColor = 'text-[#F39C12]';
      badgeText = 'Amber (Warning)';
      dotColor = 'bg-[#F39C12]';
    } else if (ratio >= 0.8) {
      color = 'bg-[#FF5C7A]/10 border-[#FF5C7A]/30 text-[#FF5C7A]';
      textColor = 'text-[#FF5C7A]';
      badgeText = 'Red (Full/Heavy)';
      dotColor = 'bg-[#FF5C7A]';
    }

    return { color, textColor, badgeText, dotColor, capacity };
  };

  const selectedEvent = events.find(e => e._id === selectedEventId);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-extrabold text-[#F3F1F8]">Live Crowd Density Heatmap</h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                socketStatus === 'Connected' 
                  ? 'bg-green-500/10 border-green-500/25 text-green-400 animate-pulse' 
                  : 'bg-yellow-500/10 border-yellow-500/25 text-yellow-400'
              }`}>
                ● Live Updates {socketStatus}
              </span>
            </div>
            <p className="text-xs text-[#8A8797] mt-1">
              Visualizing occupancy maps for campus venues. Simulated shifts update every 10 seconds.
            </p>
          </div>

          <div className="w-full sm:w-64">
            <label className="block text-[10px] font-extrabold text-[#8A8797] uppercase tracking-wider mb-1.5">
              Select Venue Event
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="block w-full px-3 py-2.5 border border-[#232236] bg-[#13131F] rounded-xl text-[#F3F1F8] focus:outline-none focus:ring-2 focus:ring-[#7C5CFC] text-xs font-semibold cursor-none"
            >
              {events.map((ev) => (
                <option key={ev._id} value={ev._id}>
                  {ev.title} ({ev.venue})
                </option>
              ))}
            </select>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="bg-[#13131F] border border-[#232236] rounded-3xl p-12 text-center shadow-sm">
            <h3 className="text-lg font-bold text-[#F3F1F8]">No Active Events</h3>
            <p className="text-[#8A8797] text-xs mt-2">Create an event to view venue maps.</p>
          </div>
        ) : loadingCrowd ? (
          <div className="bg-[#13131F] border border-[#232236] rounded-3xl p-12 flex justify-center items-center h-80 shadow-sm animate-pulse">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-10 h-10 border-4 border-[#7C5CFC] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-[#8A8797] font-bold">Synchronizing map nodes...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-[#13131F] border border-[#232236] rounded-3xl p-6 shadow-sm flex flex-col justify-center items-center min-h-[350px] relative overflow-hidden">
                <div className="absolute top-4 left-4 flex items-center space-x-1.5 text-xs font-bold text-[#F3F1F8]">
                  <Activity className="w-4 h-4 text-[#7C5CFC] animate-pulse" />
                  <span>Venue: {selectedEvent?.venue || 'Campus Auditorium'}</span>
                </div>

                <div className="w-full max-w-lg grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                  {zones.map((zoneData) => {
                    const { color, textColor, badgeText, dotColor, capacity } = getZoneDensityDetails(zoneData.zone, zoneData.count);
                    return (
                      <div
                        key={zoneData.zone}
                        className={`border-2 rounded-2xl p-6 flex flex-col items-center justify-between min-h-[160px] text-center shadow-sm transition-all hover:scale-102 cursor-none ${color}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          <span className="font-extrabold text-sm">{zoneData.zone}</span>
                        </div>

                        <div className="my-4">
                          <span className="text-4xl font-black">{zoneData.count}</span>
                          <span className="text-xs opacity-70 block mt-1">Occupants</span>
                        </div>

                        <div className="space-y-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-[#0A0A12] border border-[#232236] shadow-sm ${textColor}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotColor}`} />
                            {badgeText}
                          </span>
                          <span className="text-[10px] block opacity-75">
                            Cap: {capacity}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-[#13131F] border border-[#232236] rounded-2xl p-5 shadow-sm">
                <h4 className="text-xs font-bold text-[#F3F1F8] mb-3 uppercase tracking-wider flex items-center gap-1">
                  <Info className="w-4 h-4 text-[#8A8797]" />
                  Density Index Legend
                </h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-[#27AE60]/10 border border-[#27AE60]/30 p-2.5 rounded-xl">
                    <p className="text-xs font-extrabold text-[#27AE60]">Green (Safe)</p>
                    <p className="text-[10px] text-[#8A8797] mt-0.5">&lt; 40% occupancy</p>
                  </div>
                  <div className="bg-[#F39C12]/10 border border-[#F39C12]/30 p-2.5 rounded-xl">
                    <p className="text-xs font-extrabold text-[#F39C12]">Amber (Warning)</p>
                    <p className="text-[10px] text-[#8A8797] mt-0.5">40% - 80% occupancy</p>
                  </div>
                  <div className="bg-[#FF5C7A]/10 border border-[#FF5C7A]/30 p-2.5 rounded-xl">
                    <p className="text-xs font-extrabold text-[#FF5C7A]">Red (Full/Heavy)</p>
                    <p className="text-[10px] text-[#8A8797] mt-0.5">&gt; 80% occupancy</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-[#13131F] border border-[#232236] rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-[#F3F1F8] border-b border-[#232236] pb-3">Occupancy Metrics</h3>
                
                <div className="space-y-4">
                  {zones.map((zone) => {
                    const capacity = ZONE_CAPACITIES[zone.zone] || 50;
                    const percent = Math.min(100, Math.round((zone.count / capacity) * 100));
                    
                    let progressColor = 'bg-[#27AE60]';
                    if (percent >= 40 && percent < 80) progressColor = 'bg-[#F39C12]';
                    if (percent >= 80) progressColor = 'bg-[#FF5C7A]';

                    return (
                      <div key={zone.zone} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold text-[#8A8797]">
                          <span>{zone.zone}</span>
                          <span>{zone.count} / {capacity} ({percent}%)</span>
                        </div>
                        <div className="w-full bg-[#0A0A12] border border-[#232236] h-2.5 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${percent}%` }}
                            className={`${progressColor} h-full transition-all duration-500`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default HeatmapView;
