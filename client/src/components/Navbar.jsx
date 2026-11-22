import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  // Magnetic button helpers
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

  // Nav link styles matching the original landing page
  const getLinkClass = (path) => 
    `transition-colors duration-200 text-sm font-semibold select-none ${
      isActive(path) 
        ? 'text-[#F3F1F8]' 
        : 'text-[#8A8797] hover:text-[#F3F1F8]'
    }`;

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

  return (
    <nav className="bg-[#0A0A12]/70 backdrop-blur-md border-b border-[#232236] sticky top-0 z-50 px-[5%] py-4 flex items-center justify-between select-none">
      {/* Brand Logo */}
      <Link to="/" className="logo select-none flex items-center gap-2">
        <span className="pulse-icon"></span>Pulse
      </Link>

      {/* Nav links */}
      <div className="nav-links hidden md:flex items-center gap-8">
        <Link to="/" className={getLinkClass('/')}>
          Events
        </Link>
        {user && user.role === 'student' && (
          <Link to="/heatmap/all" className={getLinkClass('/heatmap/all')}>
            Live Heatmap
          </Link>
        )}
        {user && (user.role === 'organizer' || user.role === 'admin') && (
          <>
            <Link to="/scanner" className={getLinkClass('/scanner')}>
              Scanner
            </Link>
            <Link to="/create-event" className={getLinkClass('/create-event')}>
              Create Event
            </Link>
          </>
        )}
      </div>

      {/* Auth Controls */}
      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-[#F3F1F8]">{user.name}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#8A8797] bg-[#13131F] px-1.5 py-0.5 rounded border border-[#232236] inline-block mt-0.5 select-none">
                {user.role}
              </div>
            </div>
            <span className="magnetic-wrap">
              <button
                onClick={handleLogout}
                className="btn ghost magnetic py-1.5 px-4 flex items-center gap-1.5"
                onMouseMove={handleMagneticMove}
                onMouseLeave={handleMagneticLeave}
              >
                <LogOut className="w-3.5 h-3.5" />
                Log Out
              </button>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="text-xs font-semibold text-[#8A8797] hover:text-[#F3F1F8] transition-colors px-3 py-2"
            >
              Log In
            </Link>
            <span className="magnetic-wrap">
              <Link
                to="/register"
                className="btn magnetic py-1.5 px-4"
                onMouseMove={handleMagneticMove}
                onMouseLeave={handleMagneticLeave}
              >
                Register
              </Link>
            </span>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
