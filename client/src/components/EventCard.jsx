import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Users, Award } from 'lucide-react';

const EventCard = ({ event, isRegistered, matchScore, recommendationReason, dark = false }) => {
  const isFull = event.registrationCount >= event.capacity;
  const isPast = new Date(event.endTime) < new Date();
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`rounded-2xl border overflow-hidden shadow-sm transition-all flex flex-col h-full group ${
      dark 
        ? 'bg-[#13131F] border-[#232236] text-[#F3F1F8] hover:shadow-[0_20px_40px_rgba(124,92,252,0.12)]' 
        : 'bg-white border-gray-150 hover:shadow-md'
    }`}>
      {/* Cover Image / Placeholder */}
      <div className={`relative h-44 overflow-hidden ${dark ? 'bg-[#0A0A12]/40' : 'bg-[#2C3E50]/10'}`}>
        {event.coverImageUrl ? (
          <img
            src={event.coverImageUrl}
            alt={event.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center font-bold text-xl ${
            dark 
              ? 'bg-gradient-to-br from-[#13131F] to-[#232236] text-[#8A8797]' 
              : 'bg-gradient-to-br from-[#2C3E50] to-[#34495E] text-white'
          }`}>
            {event.category.toUpperCase()}
          </div>
        )}
        
        {/* Badges Left */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm border ${
            dark 
              ? 'bg-[#0A0A12]/95 text-[#F3F1F8] border-[#232236]' 
              : 'bg-white/95 text-[#2C3E50] border-gray-100'
          }`}>
            {event.category}
          </span>
          {matchScore !== undefined && matchScore > 0 && (
            <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm uppercase tracking-wider text-white ${
              dark ? 'bg-[#7C5CFC]' : 'bg-[#3498DB]'
            }`}>
              <Award className="w-3 h-3" />
              Rec Match: {matchScore}
            </span>
          )}
        </div>

        {/* Badges Right */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
          {isRegistered && (
            <span className="bg-[#27AE60] text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
              Registered
            </span>
          )}
          {isFull && !isRegistered && (
            <span className="bg-[#E74C3C] text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
              Full Capacity
            </span>
          )}
          {isPast && (
            <span className="bg-gray-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
              Past Event
            </span>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex flex-col flex-grow">
        <h3 className={`text-base font-bold leading-snug line-clamp-1 transition-all ${
          dark 
            ? 'text-[#F3F1F8] group-hover:text-[#7C5CFC]' 
            : 'text-[#2C3E50] group-hover:text-[#3498DB]'
        }`}>
          {event.title}
        </h3>
        
        {recommendationReason && (
          <p className={`text-[10px] font-semibold mt-1 ${dark ? 'text-[#C9FF3D]' : 'text-[#3498DB]'}`}>
            {recommendationReason}
          </p>
        )}

        <p className={`text-xs mt-2 line-clamp-2 ${dark ? 'text-[#8A8797]' : 'text-gray-500'}`}>
          {event.description}
        </p>

        {/* Schedule & Location */}
        <div className={`mt-4 space-y-2 text-xs ${dark ? 'text-[#8A8797]' : 'text-gray-600'}`}>
          <div className="flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 opacity-70" />
            <span>{formatDate(event.startTime)}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <MapPin className="w-3.5 h-3.5 opacity-70" />
            <span className="truncate">{event.venue}</span>
          </div>
        </div>

        {/* Tags */}
        {event.tags && event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-4">
            {event.tags.slice(0, 3).map((tag, i) => (
              <span 
                key={i} 
                className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                  dark 
                    ? 'bg-[#0A0A12] text-[#8A8797] border-[#232236]' 
                    : 'bg-gray-100 text-gray-600 border-transparent'
                }`}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className={`mt-auto pt-5 border-t flex items-center justify-between ${
          dark ? 'border-[#232236]' : 'border-gray-100'
        }`}>
          <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center ${
            dark ? 'text-[#8A8797]' : 'text-gray-400'
          }`}>
            <Users className="w-3.5 h-3.5 mr-1" />
            {event.capacity} seats
          </span>
          <Link
            to={`/events/${event._id}`}
            className={`text-xs font-bold transition-all hover:translate-x-0.5 inline-flex items-center ${
              dark ? 'text-[#7C5CFC] hover:text-[#C9FF3D]' : 'text-[#3498DB] hover:text-[#2980B9]'
            }`}
          >
            View Details →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
