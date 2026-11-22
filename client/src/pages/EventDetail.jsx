import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Layout from '../components/Layout';
import { MapPin, Calendar, Users, Award, ShieldAlert, Star, MessageSquare, ArrowLeft } from 'lucide-react';

const EventDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [qrToken, setQrToken] = useState('');
  const [qrCodeBlobUrl, setQrCodeBlobUrl] = useState('');
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInZone, setCheckInZone] = useState('');

  const [feedbacks, setFeedbacks] = useState([]);
  const [userFeedback, setUserFeedback] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState('');

  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [error, setError] = useState('');

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      const res = await api.get(`/events/${id}`);
      setEvent(res.data.data);

      if (user) {
        const regRes = await api.get(`/events/${id}/registration-status`);
        const regData = regRes.data.data;
        setIsRegistered(regData.isRegistered);
        
        if (regData.isRegistered && regData.registration) {
          setQrToken(regData.registration.qrToken);
          fetchQRCodeBlob();
        }

        fetchFeedbackSummary();
      }
    } catch (err) {
      console.error(err);
      setError('Event details could not be found.');
    } finally {
      setLoading(false);
    }
  };

  const fetchQRCodeBlob = async () => {
    try {
      const res = await api.get(`/events/${id}/qr`, { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(res.data);
      setQrCodeBlobUrl(blobUrl);
    } catch (err) {
      console.error('Failed to load QR code image:', err.message);
    }
  };

  const fetchFeedbackSummary = async () => {
    try {
      const fbRes = await api.get(`/events/${id}/summary`); 
      setFeedbacks(fbRes.data.data.comments || []);
      
      const myFeedback = fbRes.data.data.comments.find(f => f.userName === user.name || f.userId === user.id);
      if (myFeedback) {
        setUserFeedback(myFeedback);
      }
    } catch (err) {
      console.error('Feedback fetch error:', err.message);
    }
  };

  useEffect(() => {
    fetchEventDetails();
  }, [id, user]);

  const handleRegister = async () => {
    try {
      setRegistering(true);
      const res = await api.post(`/events/${id}/register`);
      setIsRegistered(true);
      if (res.data.data) {
        setQrToken(res.data.data.qrToken);
        fetchQRCodeBlob();
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  const handleUnregister = async () => {
    if (!window.confirm('Are you sure you want to cancel your registration?')) return;
    try {
      setRegistering(true);
      await api.delete(`/events/${id}/register`);
      setIsRegistered(false);
      setQrToken('');
      setQrCodeBlobUrl('');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Cancellation failed');
    } finally {
      setRegistering(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setFeedbackError('');
    setFeedbackSuccess('');

    if (!comment.trim()) {
      setFeedbackError('Comment is required');
      return;
    }

    try {
      setSubmittingFeedback(true);
      const res = await api.post(`/events/${id}/feedback`, {
        rating,
        comment
      });
      setFeedbackSuccess('Feedback submitted and analyzed successfully!');
      setUserFeedback(res.data.data);
      fetchFeedbackSummary();
    } catch (err) {
      console.error(err);
      setFeedbackError(err.response?.data?.detail || 'Failed to submit feedback.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6 animate-pulse">
          <div className="h-6 bg-[#13131F] border border-[#232236] rounded w-1/6"></div>
          <div className="h-80 bg-[#13131F] border border-[#232236] rounded-3xl"></div>
          <div className="h-8 bg-[#13131F] border border-[#232236] rounded w-3/4"></div>
          <div className="h-4 bg-[#13131F] border border-[#232236] rounded w-1/4"></div>
          <div className="h-20 bg-[#13131F] border border-[#232236] rounded"></div>
        </div>
      </Layout>
    );
  }

  if (error || !event) {
    return (
      <Layout>
        <div className="text-center py-12">
          <ShieldAlert className="w-16 h-16 text-[#FF5C7A] mx-auto mb-4" />
          <h3 className="text-xl font-bold text-[#F3F1F8]">{error || 'Event Not Found'}</h3>
          <Link to="/" className="text-[#7C5CFC] hover:underline mt-4 inline-block">
            ← Back to Events
          </Link>
        </div>
      </Layout>
    );
  }

  const isFull = event.registrationCount >= event.capacity;
  const isPast = new Date(event.endTime) < new Date();
  const isOwnEvent = user && (
    user.role === 'admin' || 
    event.organizerId === user.id || 
    (event.organizerId && (
      event.organizerId.id === user.id || 
      event.organizerId._id === user.id || 
      String(event.organizerId) === String(user.id)
    ))
  );

  return (
    <Layout>
      <div className="space-y-8">
        <Link to="/" className="inline-flex items-center text-sm font-semibold text-[#8A8797] hover:text-[#F3F1F8] transition-all">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Events
        </Link>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {event.coverImageUrl ? (
              <img
                src={event.coverImageUrl}
                alt={event.title}
                className="w-full h-80 object-cover rounded-3xl border border-[#232236] shadow-sm"
              />
            ) : (
              <div className="w-full h-80 flex items-center justify-center bg-gradient-to-br from-[#13131F] to-[#232236] text-[#8A8797] font-bold text-3xl rounded-3xl border border-[#232236] shadow-sm">
                {event.category.toUpperCase()}
              </div>
            )}

            <div>
              <span className="bg-[#7C5CFC]/15 text-[#C9FF3D] border border-[#7C5CFC]/20 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                {event.category}
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-[#F3F1F8] mt-4">{event.title}</h1>
              
              <div className="flex flex-wrap gap-4 mt-4 text-xs text-[#8A8797] font-semibold">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(event.startTime).toLocaleString()}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MapPin className="w-4 h-4" />
                  <span>{event.venue}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>{event.capacity} seats capacity</span>
                </div>
              </div>
            </div>

            <div className="border-t border-[#232236] pt-6">
              <h3 className="text-lg font-bold text-[#F3F1F8]">Event Description</h3>
              <p className="text-sm text-[#8A8797] mt-3 leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </div>

            {event.tags && event.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {event.tags.map((tag, i) => (
                  <span key={i} className="bg-[#13131F] border border-[#232236] text-[#8A8797] text-xs font-medium px-2.5 py-1 rounded-lg">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Registration Card */}
            <div className="bg-[#13131F] border border-[#232236] rounded-3xl p-6 shadow-sm space-y-6">
              <h3 className="text-base font-bold text-[#F3F1F8] border-b border-[#232236] pb-3">
                Event Registration
              </h3>
              
              {user ? (
                user.role === 'student' ? (
                  <div className="space-y-4">
                    {isRegistered ? (
                      <div className="space-y-4 text-center">
                        <div className="bg-[#27AE60]/10 border border-[#27AE60]/20 text-[#27AE60] text-xs font-bold p-3 rounded-xl">
                          You are registered!
                        </div>

                        {qrCodeBlobUrl ? (
                          <div className="bg-[#0A0A12] border border-[#232236] p-4 rounded-2xl flex flex-col items-center">
                            <img src={qrCodeBlobUrl} alt="QR Code Check-in" className="w-48 h-48 rounded-lg" />
                            <p className="text-[10px] text-[#8A8797] font-bold tracking-wider uppercase mt-3">
                              Your Ticket Token
                            </p>
                            <code className="text-xs bg-[#13131F] border border-[#232236] px-2.5 py-1.5 rounded mt-1.5 max-w-full truncate font-mono text-[#C9FF3D]">
                              {qrToken}
                            </code>
                            <p className="text-[10px] text-[#8A8797] text-center mt-3 leading-snug">
                              Present this QR code to the organizer at the venue entrance.
                            </p>
                          </div>
                        ) : (
                          <div className="text-xs text-[#8A8797]">Loading your check-in QR code...</div>
                        )}

                        {!isPast && (
                          <button
                            onClick={handleUnregister}
                            disabled={registering}
                            className="w-full py-2.5 px-4 text-xs font-semibold rounded-xl text-[#FF5C7A] hover:text-white border border-[#FF5C7A] hover:bg-[#FF5C7A] transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-none"
                          >
                            Unregister Event
                          </button>
                        )}
                      </div>
                    ) : (
                      <div>
                        {isPast ? (
                          <div className="bg-[#0A0A12] border border-[#232236] text-[#8A8797] text-xs font-semibold p-4 rounded-xl text-center">
                            This event has ended. Registrations are closed.
                          </div>
                        ) : isFull ? (
                          <div className="bg-[#FF5C7A]/10 border border-[#FF5C7A]/20 text-[#FF5C7A] text-xs font-semibold p-4 rounded-xl text-center">
                            This event is fully booked.
                          </div>
                        ) : (
                          <button
                            onClick={handleRegister}
                            disabled={registering}
                            className="w-full py-3 px-4 text-sm font-semibold text-white bg-[#7C5CFC] hover:bg-[#6c4beb] rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-none"
                          >
                            {registering ? 'Processing...' : 'Register for Event'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-[#8A8797] text-center space-y-4">
                    <p>You are logged in as an <strong>{user.role}</strong>.</p>
                    {isOwnEvent && (
                      <div className="flex flex-col gap-2">
                        <Link
                          to={`/analytics/${event._id}`}
                          className="w-full py-2.5 px-4 text-xs font-bold text-white bg-[#7C5CFC] hover:bg-[#6c4beb] rounded-xl text-center transition-all shadow-sm cursor-none"
                        >
                          View Organizer Dashboard
                        </Link>
                        <Link
                          to={`/heatmap/all`}
                          className="w-full py-2.5 px-4 text-xs font-bold text-[#F3F1F8] bg-[#0A0A12] hover:bg-[#232236] border border-[#232236] rounded-xl text-center transition-all cursor-none"
                        >
                          View Live Heatmap
                        </Link>
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="text-center py-2">
                  <Link
                    to="/login"
                    className="w-full inline-block py-2.5 px-4 text-sm font-semibold text-white bg-[#7C5CFC] rounded-xl hover:bg-[#6c4beb] text-center cursor-none"
                  >
                    Login to Register
                  </Link>
                </div>
              )}
            </div>

            {/* Host info */}
            <div className="bg-[#13131F] border border-[#232236] rounded-3xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-[#F3F1F8] mb-3">Host Information</h3>
              <p className="text-xs text-[#F3F1F8]">
                Organizer: <strong className="text-[#8A8797]">{event.organizerId?.name || 'Prof. Campus'}</strong>
              </p>
              <p className="text-xs text-[#F3F1F8] mt-1">
                Contact: <strong className="text-[#8A8797]">{event.organizerId?.email || 'contact@campus.edu'}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Feedback Section */}
        {user && isRegistered && (
          <div className="border-t border-[#232236] pt-8 space-y-6">
            <h2 className="text-xl font-extrabold text-[#F3F1F8] flex items-center gap-1.5">
              <MessageSquare className="w-5 h-5 text-[#8A8797]" />
              Event Feedback
            </h2>

            {userFeedback ? (
              <div className="bg-[#13131F] border border-[#232236] p-6 rounded-3xl shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#8A8797] uppercase tracking-widest">
                    Your Submitted Review
                  </span>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                    userFeedback.sentimentLabel === 'positive' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                    userFeedback.sentimentLabel === 'negative' ? 'bg-[#FF5C7A]/10 text-[#FF5C7A] border-[#FF5C7A]/20' :
                    'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                  }`}>
                    AI Sentiment: {userFeedback.sentimentLabel}
                  </span>
                </div>
                
                <div className="flex items-center space-x-0.5 text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < userFeedback.rating ? 'fill-current' : 'text-[#232236]'}`} />
                  ))}
                </div>

                <p className="text-sm text-[#8A8797] italic">"{userFeedback.comment}"</p>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="bg-[#13131F] border border-[#232236] p-6 rounded-3xl shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-[#F3F1F8]">Leave a Review</h3>
                <p className="text-[10px] text-[#8A8797] leading-snug">
                  * Note: Feedback is open once you checked in or after the event ends.
                </p>

                {feedbackError && (
                  <div className="bg-[#FF5C7A]/10 border-l-4 border-[#FF5C7A] text-[#FF5C7A] p-3 rounded-lg text-xs">
                    {feedbackError}
                  </div>
                )}
                {feedbackSuccess && (
                  <div className="bg-[#27AE60]/10 border-l-4 border-[#27AE60] text-[#27AE60] p-3 rounded-lg text-xs">
                    {feedbackSuccess}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#8A8797]">Rating *</label>
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="text-yellow-400 hover:scale-110 transition-all focus:outline-none cursor-none"
                      >
                        <Star className={`w-6 h-6 ${star <= rating ? 'fill-current' : 'text-[#232236]'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#8A8797]">Comment *</label>
                  <textarea
                    rows="3"
                    className="w-full px-3 py-2 bg-[#0A0A12] border border-[#232236] text-[#F3F1F8] placeholder-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7C5CFC] focus:border-transparent cursor-none"
                    placeholder="Provide your experience..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingFeedback}
                  className="py-2.5 px-5 text-xs font-bold text-white bg-[#7C5CFC] hover:bg-[#6c4beb] rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-none"
                >
                  {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </form>
            )}

            {/* Other Reviews */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#F3F1F8]">Other Reviews</h3>
              {feedbacks.length > 0 ? (
                <div className="space-y-3">
                  {feedbacks.map((fb, idx) => (
                    <div key={idx} className="bg-[#13131F] border border-[#232236] p-4 rounded-2xl">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-[#F3F1F8]">{fb.userName}</span>
                        <span className="text-[9px] text-[#8A8797]">{new Date(fb.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-0.5 text-yellow-400 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < fb.rating ? 'fill-current' : 'text-[#232236]'}`} />
                        ))}
                      </div>
                      <p className="text-xs text-[#8A8797]">"{fb.comment}"</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#8A8797] italic">No feedback comments from other students yet.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default EventDetail;
