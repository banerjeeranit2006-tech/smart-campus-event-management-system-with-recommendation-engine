import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Layout from '../components/Layout';
import { Calendar, Save, AlertCircle } from 'lucide-react';

const CATEGORIES = ['technology', 'music', 'career', 'arts', 'sports'];
const VENUES = ['Auditorium', 'Main Hall', 'Exhibition Hall'];

const CreateEvent = () => {
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('technology');
  const [tagsString, setTagsString] = useState('');
  const [venue, setVenue] = useState('Auditorium');
  const [capacity, setCapacity] = useState(50);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title || !description || !startTime || !endTime || !capacity) {
      setError('Please fill in all required fields');
      return;
    }

    if (new Date(startTime) >= new Date(endTime)) {
      setError('Start time must be before the end time');
      return;
    }

    const tags = tagsString
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0);

    try {
      setSubmitting(true);
      await api.post('/events', {
        title,
        description,
        category,
        tags,
        venue,
        capacity: Number(capacity),
        startTime,
        endTime,
        coverImageUrl
      });
      
      alert('Event created successfully, and live crowd tracking zones initialized!');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create event');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="bg-[#7C5CFC]/10 p-3 rounded-2xl text-[#C9FF3D] border border-[#7C5CFC]/20">
            <Calendar className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#F3F1F8]">Create Campus Event</h1>
          <p className="text-xs text-[#8A8797]">Launch a new session, set constraints, and initialize crowd nodes.</p>
        </div>

        {error && (
          <div className="bg-[#FF5C7A]/10 border-l-4 border-[#FF5C7A] text-[#FF5C7A] p-4 rounded-xl text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-[#13131F] border border-[#232236] rounded-3xl p-6 shadow-sm space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#8A8797] uppercase tracking-wider mb-1">
                Event Title *
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2.5 bg-[#0A0A12] border border-[#232236] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C5CFC] text-sm text-[#F3F1F8]"
                placeholder="e.g. AI Hackathon 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#8A8797] uppercase tracking-wider mb-1">
                Description *
              </label>
              <textarea
                rows="4"
                required
                className="w-full px-3 py-2.5 bg-[#0A0A12] border border-[#232236] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C5CFC] text-sm text-[#F3F1F8]"
                placeholder="Describe details, pre-requisites, speaker details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#8A8797] uppercase tracking-wider mb-1">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0A0A12] border border-[#232236] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C5CFC] text-sm text-[#F3F1F8] cursor-none"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8A8797] uppercase tracking-wider mb-1">
                  Venue *
                </label>
                <select
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0A0A12] border border-[#232236] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C5CFC] text-sm text-[#F3F1F8] cursor-none"
                >
                  {VENUES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#8A8797] uppercase tracking-wider mb-1">
                  Capacity Limit *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  className="w-full px-3 py-2.5 bg-[#0A0A12] border border-[#232236] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C5CFC] text-sm text-[#F3F1F8]"
                  placeholder="e.g. 100"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8A8797] uppercase tracking-wider mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 bg-[#0A0A12] border border-[#232236] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C5CFC] text-sm text-[#F3F1F8]"
                  placeholder="ai, hackathon, programming"
                  value={tagsString}
                  onChange={(e) => setTagsString(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#8A8797] uppercase tracking-wider mb-1">
                  Start Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  className="w-full px-3 py-2.5 bg-[#0A0A12] border border-[#232236] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C5CFC] text-sm text-[#F3F1F8] cursor-none"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8A8797] uppercase tracking-wider mb-1">
                  End Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  className="w-full px-3 py-2.5 bg-[#0A0A12] border border-[#232236] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C5CFC] text-sm text-[#F3F1F8] cursor-none"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#8A8797] uppercase tracking-wider mb-1">
                Cover Image URL
              </label>
              <input
                type="url"
                className="w-full px-3 py-2.5 bg-[#0A0A12] border border-[#232236] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C5CFC] text-sm text-[#F3F1F8]"
                placeholder="https://example.com/banner.jpg"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center space-x-1.5 py-3 px-4 text-sm font-semibold text-white bg-[#7C5CFC] hover:bg-[#6c4beb] rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-none"
            >
              <Save className="w-4 h-4" />
              <span>{submitting ? 'Publishing Event...' : 'Publish Event'}</span>
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default CreateEvent;
