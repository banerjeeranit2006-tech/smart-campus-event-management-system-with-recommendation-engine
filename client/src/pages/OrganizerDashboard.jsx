import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Layout from '../components/Layout';
import { Users, CheckSquare, Percent, Star, Download, TrendingUp, HelpCircle, Frown, Smile } from 'lucide-react';
import { Link } from 'react-router-dom';

const OrganizerDashboard = () => {
  const { user } = useAuth();
  const [myEvents, setMyEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const fetchMyEvents = async () => {
    try {
      setLoadingEvents(true);
      const res = await api.get(`/events?organizerId=${user.id}`);
      setMyEvents(res.data.data);
      if (res.data.data.length > 0) {
        setSelectedEventId(res.data.data[0]._id);
      }
    } catch (err) {
      console.error('Error fetching organizer events:', err.message);
      setError('Could not fetch your events.');
    } finally {
      setLoadingEvents(false);
    }
  };

  const fetchAnalyticsData = async () => {
    if (!selectedEventId) return;
    try {
      setLoadingAnalytics(true);
      setError('');
      
      const statsRes = await api.get(`/analytics/${selectedEventId}`);
      setAnalytics(statsRes.data.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load analytics.');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    fetchMyEvents();
  }, [user]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedEventId]);

  const handleCSVExport = async () => {
    if (!selectedEventId) return;
    try {
      setExporting(true);
      const res = await api.get(`/analytics/${selectedEventId}/export`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      
      const eventName = myEvents.find(e => e._id === selectedEventId)?.title || 'event';
      const cleanName = eventName.replace(/[^a-zA-Z0-9]/g, '_');
      
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `attendee_list_${cleanName}.csv`;
      link.click();
    } catch (err) {
      console.error(err);
      alert('CSV Export failed');
    } finally {
      setExporting(false);
    }
  };

  if (loadingEvents) {
    return (
      <Layout>
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-[#13131F] border border-[#232236] rounded w-1/4"></div>
          <div className="h-32 bg-[#13131F] border border-[#232236] rounded-3xl"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-[#F3F1F8]">Organizer Analytics Dashboard</h1>
            <p className="text-xs text-[#8A8797] mt-1">Real-time attendance rates, capacity fill metrics, and sentiment evaluations.</p>
          </div>
          
          <div className="w-full sm:w-64">
            <label className="block text-[10px] font-extrabold text-[#8A8797] uppercase tracking-wider mb-1.5">
              Select Event
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="block w-full px-3 py-2.5 border border-[#232236] bg-[#13131F] rounded-xl text-[#F3F1F8] focus:outline-none focus:ring-2 focus:ring-[#7C5CFC] text-xs font-semibold cursor-none"
            >
              {myEvents.map((ev) => (
                <option key={ev._id} value={ev._id}>
                  {ev.title} ({ev.category})
                </option>
              ))}
            </select>
          </div>
        </div>

        {myEvents.length === 0 ? (
          <div className="bg-[#13131F] border border-[#232236] rounded-3xl p-12 text-center shadow-sm">
            <h3 className="text-lg font-bold text-[#F3F1F8]">No Events Created Yet</h3>
            <p className="text-[#8A8797] text-xs mt-2 max-w-sm mx-auto">
              You haven't created any events. Go to the "Create Event" page to launch your first session.
            </p>
          </div>
        ) : error ? (
          <div className="bg-[#FF5C7A]/10 border-l-4 border-[#FF5C7A] text-[#FF5C7A] p-4 rounded-xl text-xs">
            {error}
          </div>
        ) : loadingAnalytics || !analytics ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="h-28 bg-[#13131F] border border-[#232236] rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Registrations */}
              <div className="bg-[#13131F] p-5 border border-[#232236] rounded-2xl shadow-sm flex items-center space-x-4">
                <div className="bg-[#7C5CFC]/10 text-[#7C5CFC] p-3 rounded-xl border border-[#7C5CFC]/20">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] text-[#8A8797] font-extrabold uppercase tracking-wider">Registrations</p>
                  <p className="text-2xl font-black text-[#F3F1F8] mt-0.5">{analytics.registrations}</p>
                </div>
              </div>

              {/* Total Check-ins */}
              <div className="bg-[#13131F] p-5 border border-[#232236] rounded-2xl shadow-sm flex items-center space-x-4">
                <div className="bg-[#27AE60]/10 text-[#27AE60] p-3 rounded-xl border border-[#27AE60]/20">
                  <CheckSquare className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] text-[#8A8797] font-extrabold uppercase tracking-wider">Checked In</p>
                  <p className="text-2xl font-black text-[#F3F1F8] mt-0.5">{analytics.checkIns}</p>
                </div>
              </div>

              {/* Capacity fill % */}
              <div className="bg-[#13131F] p-5 border border-[#232236] rounded-2xl shadow-sm flex items-center space-x-4">
                <div className="bg-[#F39C12]/10 text-[#F39C12] p-3 rounded-xl border border-[#F39C12]/20">
                  <Percent className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] text-[#8A8797] font-extrabold uppercase tracking-wider">Capacity Filled</p>
                  <p className="text-2xl font-black text-[#F3F1F8] mt-0.5">{analytics.capacityFillPercentage}%</p>
                </div>
              </div>

              {/* Average Rating */}
              <div className="bg-[#13131F] p-5 border border-[#232236] rounded-2xl shadow-sm flex items-center space-x-4">
                <div className="bg-[#FF5C7A]/10 text-[#FF5C7A] p-3 rounded-xl border border-[#FF5C7A]/20">
                  <Star className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] text-[#8A8797] font-extrabold uppercase tracking-wider">Avg Rating</p>
                  <p className="text-2xl font-black text-[#F3F1F8] mt-0.5">
                    {analytics.averageRating} <span className="text-xs text-[#8A8797] font-semibold">/ 5</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Middle Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sentiment Card */}
              <div className="bg-[#13131F] border border-[#232236] rounded-3xl p-6 shadow-sm space-y-4 lg:col-span-2">
                <h3 className="text-sm font-bold text-[#F3F1F8] border-b border-[#232236] pb-3 flex items-center justify-between">
                  <span>AI Feedback Sentiment Breakdown</span>
                  <span className="text-xs font-semibold text-[#8A8797]">{analytics.feedbackCount} Reviews Total</span>
                </h3>

                {analytics.feedbackCount > 0 ? (
                  <div className="space-y-4">
                    <div className="h-6 w-full rounded-full overflow-hidden flex shadow-inner">
                      <div
                        style={{ width: `${(analytics.sentimentBreakdown.positive / analytics.feedbackCount) * 100}%` }}
                        className="bg-[#27AE60] h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-500"
                        title={`Positive: ${analytics.sentimentBreakdown.positive}`}
                      >
                        {analytics.sentimentBreakdown.positive > 0 && `${Math.round((analytics.sentimentBreakdown.positive / analytics.feedbackCount) * 100)}%`}
                      </div>
                      <div
                        style={{ width: `${(analytics.sentimentBreakdown.neutral / analytics.feedbackCount) * 100}%` }}
                        className="bg-[#F39C12] h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-500"
                        title={`Neutral: ${analytics.sentimentBreakdown.neutral}`}
                      >
                        {analytics.sentimentBreakdown.neutral > 0 && `${Math.round((analytics.sentimentBreakdown.neutral / analytics.feedbackCount) * 100)}%`}
                      </div>
                      <div
                        style={{ width: `${(analytics.sentimentBreakdown.negative / analytics.feedbackCount) * 100}%` }}
                        className="bg-[#FF5C7A] h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-500"
                        title={`Negative: ${analytics.sentimentBreakdown.negative}`}
                      >
                        {analytics.sentimentBreakdown.negative > 0 && `${Math.round((analytics.sentimentBreakdown.negative / analytics.feedbackCount) * 100)}%`}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-2">
                      <div className="flex items-center space-x-2 bg-[#27AE60]/10 p-2.5 rounded-xl border border-[#27AE60]/20">
                        <Smile className="w-5 h-5 text-[#27AE60]" />
                        <div>
                          <p className="text-[10px] text-[#8A8797] font-bold">Positive</p>
                          <p className="text-sm font-bold text-[#27AE60]">{analytics.sentimentBreakdown.positive}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 bg-[#F39C12]/10 p-2.5 rounded-xl border border-[#F39C12]/20">
                        <HelpCircle className="w-5 h-5 text-[#F39C12]" />
                        <div>
                          <p className="text-[10px] text-[#8A8797] font-bold">Neutral</p>
                          <p className="text-sm font-bold text-[#F39C12]">{analytics.sentimentBreakdown.neutral}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 bg-[#FF5C7A]/10 p-2.5 rounded-xl border border-[#FF5C7A]/20">
                        <Frown className="w-5 h-5 text-[#FF5C7A]" />
                        <div>
                          <p className="text-[10px] text-[#8A8797] font-bold">Negative</p>
                          <p className="text-sm font-bold text-[#FF5C7A]">{analytics.sentimentBreakdown.negative}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#8A8797] italic text-center py-6">
                    No student feedback reviews submitted yet. Sentiment tracking will generate automatically.
                  </p>
                )}
              </div>

              {/* Actions box */}
              <div className="bg-[#13131F] border border-[#232236] rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-[#F3F1F8] border-b border-[#232236] pb-3">Quick Controls</h3>
                  <p className="text-xs text-[#8A8797]">
                    Use these commands to download rosters or view the live heatmap for this auditorium/hall.
                  </p>
                </div>
                
                <div className="space-y-2.5 mt-4">
                  <button
                    onClick={handleCSVExport}
                    disabled={exporting}
                    className="w-full flex items-center justify-center space-x-1.5 py-3 px-4 text-xs font-bold text-white bg-[#7C5CFC] hover:bg-[#6c4beb] rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-none"
                  >
                    <Download className="w-4 h-4" />
                    <span>{exporting ? 'Compiling Roster...' : 'Export Attendee CSV'}</span>
                  </button>

                  <Link
                    to="/heatmap/all"
                    className="w-full flex items-center justify-center space-x-1.5 py-3 px-4 text-xs font-bold text-[#F3F1F8] bg-[#0A0A12] border border-[#232236] hover:bg-[#13131F] rounded-xl transition-all cursor-none"
                  >
                    <TrendingUp className="w-4 h-4 text-[#8A8797]" />
                    <span>View Crowd Heatmap</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default OrganizerDashboard;
