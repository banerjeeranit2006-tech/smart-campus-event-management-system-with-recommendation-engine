import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import EventCard from '../components/EventCard';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, Sparkles, BookOpen, AlertCircle } from 'lucide-react';

const CATEGORIES = ['all', 'technology', 'music', 'career', 'arts', 'sports'];

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTag, setSelectedTag] = useState('');
  const [registrations, setRegistrations] = useState([]);
  
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [error, setError] = useState('');

  // Timeline Refs
  const timelineSvgRef = useRef(null);
  const timelineProgressRef = useRef(null);

  // Fetch Events
  const fetchData = async () => {
    try {
      setLoadingEvents(true);
      setError('');
      
      let queryParams = [];
      if (searchQuery) queryParams.push(`search=${encodeURIComponent(searchQuery)}`);
      if (selectedCategory && selectedCategory !== 'all') queryParams.push(`category=${encodeURIComponent(selectedCategory)}`);
      if (selectedTag) queryParams.push(`tag=${encodeURIComponent(selectedTag)}`);
      
      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      const eventsRes = await api.get(`/events${queryString}`);
      setEvents(eventsRes.data.data);

      if (user) {
        const myEvents = [];
        for (const ev of eventsRes.data.data) {
          try {
            const statusRes = await api.get(`/events/${ev._id}/registration-status`);
            if (statusRes.data.data.isRegistered) {
              myEvents.push(ev._id);
            }
          } catch (err) {
            // Ignore error
          }
        }
        setRegistrations(myEvents);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch events list. Please try again.');
    } finally {
      setLoadingEvents(false);
    }
  };

  // Fetch Recommendations
  const fetchRecommendations = async () => {
    if (!user || user.role !== 'student') return;
    try {
      setLoadingRecs(true);
      const res = await api.get(`/recommendations/${user.id}`);
      setRecommendations(res.data.data);
    } catch (err) {
      console.error('Error fetching recommendations:', err.message);
    } finally {
      setLoadingRecs(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchQuery, selectedCategory, selectedTag]);

  useEffect(() => {
    fetchRecommendations();
  }, [user]);

  // Magnetic button animation helpers for page specific buttons
  const handleMagneticMove = (e) => {
    const btn = e.currentTarget;
    const r = btn.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    btn.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
  };

  const handleMagneticLeave = (e) => {
    e.currentTarget.style.transform = 'translate(0, 0)';
  };

  // 3D Tilt Card Animation
  const handleTiltMove = (e) => {
    const card = e.currentTarget;
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `perspective(600px) rotateY(${px * 10}deg) rotateX(${-py * 10}deg) translateY(-4px)`;
  };

  const handleTiltLeave = (e) => {
    e.currentTarget.style.transform = 'perspective(600px) rotateY(0) rotateX(0) translateY(0)';
  };

  // Setup page scroll intersection animations
  useEffect(() => {
    // Scroll reveal grid
    const revealEls = document.querySelectorAll('.reveal');
    const revealIo = new IntersectionObserver((entries) => {
      let index = 0;
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const target = entry.target;
          setTimeout(() => {
            target.classList.add('in');
          }, index * 90);
          index++;
          revealIo.unobserve(target);
        }
      });
    }, { threshold: 0.1 });
    revealEls.forEach(el => revealIo.observe(el));

    // Timeline drawing
    const wrap = document.querySelector('.timeline-wrap');
    const svg = timelineSvgRef.current;
    const progress = timelineProgressRef.current;
    const tItems = document.querySelectorAll('.t-item');

    let sizeSvg = () => {};
    let tIo;

    if (wrap && svg && progress && tItems.length > 0) {
      sizeSvg = () => {
        svg.setAttribute('height', wrap.offsetHeight);
      };
      sizeSvg();
      window.addEventListener('resize', sizeSvg);

      tIo = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
          }
        });
        const lastIn = document.querySelectorAll('.t-item.in').length;
        progress.classList.toggle('drawn', lastIn > 0);
        progress.style.strokeDashoffset = 1 - (lastIn / tItems.length);
      }, { threshold: 0.3 });

      tItems.forEach(el => tIo.observe(el));
    }

    // Stat counters
    const stats = document.querySelectorAll('.stat .num');
    const statIo = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.getAttribute('data-target'), 10);
          let cur = 0;
          const step = Math.max(1, Math.ceil(target / 50));
          const t = setInterval(() => {
            cur += step;
            if (cur >= target) {
              cur = target;
              clearInterval(t);
            }
            el.textContent = cur.toLocaleString();
          }, 20);
          statIo.unobserve(el);
        }
      });
    }, { threshold: 0.3 });
    stats.forEach(s => statIo.observe(s));

    return () => {
      revealIo.disconnect();
      if (tIo) tIo.disconnect();
      statIo.disconnect();
      window.removeEventListener('resize', sizeSvg);
    };
  }, [events]);

  const handlePostEventClick = (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login?redirect=/create-event');
    } else if (user.role === 'organizer' || user.role === 'admin') {
      navigate('/create-event');
    } else {
      alert('Only club organizers or administrators can post events.');
    }
  };

  // Date formatter for cards
  const formatCardDate = (category, startTime) => {
    const date = new Date(startTime);
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    const capCat = category.charAt(0).toUpperCase() + category.slice(1);
    return `${capCat} · ${formattedDate}`;
  };

  // Double events for horizontal rail seamless transition loop
  const railEvents = events.slice(0, 5);
  const doubledEvents = [...railEvents, ...railEvents];

  // Dynamic marquee setup
  const defaultMarquee = [
    "★ HACKNIGHT '26 — 62/120 SPOTS",
    "★ RANGMANCH FEST — FREE ENTRY",
    "★ FIGMA WORKSHOP — 18/30 SPOTS",
    "★ FOOTBALL FINALS — SAT"
  ];
  const dynamicMarquee = events.length > 0
    ? events.slice(0, 4).map(e => `★ ${e.title.toUpperCase()} — ${e.registrationCount}/${e.capacity} SPOTS`)
    : defaultMarquee;
  const doubledMarquee = [...dynamicMarquee, ...dynamicMarquee];

  return (
    <Layout>
      {/* Scope extra page-specific animations here */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Hero Section Scoped adjustments since it sits within Layout */
        .pulse-theme .hero {
          min-height: 80vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 3rem 0;
          position: relative;
        }
      ` }} />

      {/* Hero */}
      <section className="hero">
        <div className="blob"></div>
        <div className="hero-inner">
          <span className="eyebrow">
            <span className="dot"></span>
            {loadingEvents ? "Loading active events..." : `${events.length} events happening on campus`}
          </span>
          <h1 className="kinetic" aria-label="Campus events, happening live.">
            <span className="word"><span>Campus</span></span>
            <span className="word"><span>events,</span></span>
            <span className="word"><span>happening</span></span>
            <span className="word"><span>live,</span></span>
            <span className="word"><span>everywhere.</span></span>
          </h1>
          <p>Pulse tracks every club, fest, and workshop the second it's posted — real seat counts, live status, one board that never goes stale.</p>
          <div className="hero-ctas">
            <span className="magnetic-wrap">
              <a 
                href="#live" 
                className="btn magnetic"
                onMouseMove={handleMagneticMove}
                onMouseLeave={handleMagneticLeave}
              >
                See what's live
              </a>
            </span>
            <span className="magnetic-wrap">
              <a 
                href="#how" 
                className="btn ghost magnetic"
                onMouseMove={handleMagneticMove}
                onMouseLeave={handleMagneticLeave}
              >
                How it works
              </a>
            </span>
          </div>
        </div>
      </section>

      {/* Marquee Ribbon */}
      <div className="ribbon-wrap">
        <div className="ribbon">
          <div className="ribbon-track">
            {doubledMarquee.map((txt, index) => (
              <span key={index}>{txt}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Live Board horizontal scroll */}
      <section className="section" id="live">
        <div className="section-head">
          <span className="eyebrow"><span className="dot"></span>On the board right now</span>
          <h2>Live this week</h2>
        </div>
        <div className="rail">
          {loadingEvents ? (
            <div className="flex gap-4 p-4 animate-pulse">
              {[1, 2, 3].map(n => (
                <div key={n} className="w-[280px] h-[190px] bg-[#13131F] rounded-2xl border border-[#232236] shrink-0" />
              ))}
            </div>
          ) : doubledEvents.length > 0 ? (
            <div className="rail-track" id="railTrack">
              {doubledEvents.map((event, index) => (
                <div 
                  key={`${event._id}-${index}`} 
                  className="tilt-card"
                  onMouseMove={handleTiltMove}
                  onMouseLeave={handleTiltLeave}
                  onClick={() => navigate(`/events/${event._id}`)}
                >
                  <span className="eyebrow">{formatCardDate(event.category, event.startTime)}</span>
                  <h3>{event.title}</h3>
                  <p>{event.description}</p>
                  <div className="meta">
                    <span>{event.venue}</span>
                    <span>{event.registrationCount}/{event.capacity}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#13131F] border border-[#232236] rounded-2xl p-8 text-center text-sm text-[#8A8797]">
              No active events found. Click "Post your first event" below to add one!
            </div>
          )}
        </div>
      </section>

      {/* AI Recommendations (Student-only) */}
      {user && user.role === 'student' && (
        <section className="section py-12">
          <div className="section-head">
            <div className="flex items-center space-x-2">
              <div className="bg-[#7C5CFC]/15 p-2 rounded-xl text-[#7C5CFC]">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold text-[#F3F1F8]">Recommended for You</h2>
            </div>
          </div>
          
          {loadingRecs ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-[#13131F] border border-[#232236] h-[360px] rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : recommendations.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.map((event) => (
                <EventCard
                  key={event._id}
                  event={event}
                  isRegistered={registrations.includes(event._id)}
                  matchScore={event.matchScore}
                  recommendationReason={event.recommendationReason}
                  dark={true}
                />
              ))}
            </div>
          ) : (
            <div className="bg-[#13131F] border border-dashed border-[#232236] rounded-2xl p-8 text-center text-xs text-[#8A8797]">
              No tailored recommendations available yet. Start registering for events to customize your feed!
            </div>
          )}
        </section>
      )}

      {/* Explore Events Directory: Search & Filter Grid */}
      <section className="section py-12">
        <div className="section-head">
          <span className="eyebrow"><span className="dot"></span>Find your crowd</span>
          <h2>Explore Events Directory</h2>
        </div>
        
        {/* Search Bar container */}
        <div className="space-y-4 bg-[#13131F] p-5 rounded-2xl border border-[#232236] shadow-sm mb-8">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-grow">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8797] w-4 h-4" />
              <input
                type="text"
                placeholder="Search event title, venue, tags or details..."
                className="w-full pl-10 pr-4 py-3 bg-[#0A0A12] border border-[#232236] text-[#F3F1F8] placeholder-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C5CFC] focus:border-transparent text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => { setSelectedCategory('all'); setSelectedTag(''); setSearchQuery(''); }}
                className="px-4 py-3 border border-[#232236] bg-[#0A0A12] rounded-xl text-xs font-semibold text-[#8A8797] hover:text-[#F3F1F8] hover:bg-[#13131F] transition-all flex items-center gap-1.5"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Clear Filters
              </button>
            </div>
          </div>

          {/* Category Filter list */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-[#232236]">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`py-1.5 px-3 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                  selectedCategory === cat
                    ? 'bg-[#7C5CFC] text-white border-[#7C5CFC]'
                    : 'bg-[#0A0A12] text-[#8A8797] border-[#232236] hover:bg-[#13131F]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Events Grid */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-[#F3F1F8]">All Campus Events</h3>
            <span className="text-[10px] font-bold text-[#8A8797] uppercase tracking-widest bg-[#13131F] border border-[#232236] px-3 py-1 rounded-md">
              {events.length} Events found
            </span>
          </div>

          {error && (
            <div className="bg-[#E74C3C]/10 border-l-4 border-[#E74C3C] text-[#E74C3C] p-4 rounded-xl text-sm flex items-center space-x-2 mb-6">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {loadingEvents ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-[#13131F] border border-[#232236] rounded-2xl h-[360px] animate-pulse" />
              ))}
            </div>
          ) : events.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <EventCard
                  key={event._id}
                  event={event}
                  isRegistered={registrations.includes(event._id)}
                  dark={true}
                />
              ))}
            </div>
          ) : (
            <div className="bg-[#13131F] border border-[#232236] rounded-2xl p-12 text-center">
              <div className="mx-auto w-12 h-12 rounded-xl bg-[#0A0A12] border border-[#232236] flex items-center justify-center text-[#8A8797] mb-4">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#F3F1F8]">No Events Match Your Search</h3>
              <p className="text-[#8A8797] text-xs mt-2 max-w-sm mx-auto">
                Try adjusting your text query or category filter to discover other campus activities.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Why Pulse Section */}
      <section className="section">
        <div className="section-head">
          <span className="eyebrow"><span className="dot"></span>Why Pulse</span>
          <h2>Built to move as fast as campus does</h2>
        </div>
        <div className="reveal-grid">
          <div className="reveal">
            <div className="feature-card">
              <div className="glyph"></div>
              <h3>Real-time capacity</h3>
              <p>Seat counts update the instant someone RSVPs — no more showing up to a full room.</p>
            </div>
          </div>
          <div className="reveal">
            <div className="feature-card">
              <div className="glyph"></div>
              <h3>One-tap posting</h3>
              <p>Clubs go live in under a minute. Title, time, capacity — done.</p>
            </div>
          </div>
          <div className="reveal">
            <div className="feature-card">
              <div className="glyph"></div>
              <h3>QR check-in</h3>
              <p>Organizers scan at the door and the dashboard updates itself, live.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="section" id="how">
        <div className="section-head">
          <span className="eyebrow"><span className="dot"></span>How it works</span>
          <h2>From posted to packed</h2>
        </div>
        <div className="timeline-wrap">
          <svg className="timeline-svg" id="timelineSvg" ref={timelineSvgRef} preserveAspectRatio="none">
            <line x1="1" y1="0" x2="1" y2="100%" vectorEffect="non-scaling-stroke"></line>
            <line 
              className="progress" 
              id="timelineProgress" 
              ref={timelineProgressRef} 
              x1="1" 
              y1="0" 
              x2="1" 
              y2="100%" 
              vectorEffect="non-scaling-stroke"
              pathLength="1"
            ></line>
          </svg>
          <div className="t-item">
            <div className="node">01</div>
            <div>
              <h3>Club posts the event</h3>
              <p>Title, time, venue, and capacity — live on the board in under a minute.</p>
            </div>
          </div>
          <div className="t-item">
            <div className="node">02</div>
            <div>
              <h3>Students discover and RSVP</h3>
              <p>Filter by category, see the real seat count, hold a spot in one tap.</p>
            </div>
          </div>
          <div className="t-item">
            <div className="node">03</div>
            <div>
              <h3>Status updates itself</h3>
              <p>Open → Filling → Full, driven by actual RSVPs, not guesswork.</p>
            </div>
          </div>
          <div className="t-item">
            <div className="node">04</div>
            <div>
              <h3>Check-in closes the loop</h3>
              <p>A QR scan at the door confirms attendance for the organizer's dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Numbers Section */}
      <section className="section" id="stats">
        <div className="stats">
          <div className="stat">
            <div className="num" data-target={loadingEvents ? "19" : String(events.length)}>0</div>
            <div className="lbl">Events live this week</div>
          </div>
          <div className="stat">
            <div className="num" data-target="86">0</div>
            <div className="lbl">Active clubs</div>
          </div>
          <div className="stat">
            <div className="num" data-target="2400">0</div>
            <div className="lbl">Students on Pulse</div>
          </div>
          <div className="stat">
            <div className="num" data-target="94">0</div>
            <div className="lbl">% check-in accuracy</div>
          </div>
        </div>
      </section>

      {/* CTA Footer Block */}
      <section className="cta">
        <div className="cta-rings"><span></span><span></span><span></span></div>
        <h2>Get your club's next event in front of 2,400 students.</h2>
        <span className="magnetic-wrap">
          <a 
            href="#" 
            onClick={handlePostEventClick}
            className="btn magnetic"
            onMouseMove={handleMagneticMove}
            onMouseLeave={handleMagneticLeave}
          >
            Post your first event
          </a>
        </span>
      </section>
    </Layout>
  );
};

export default Home;
