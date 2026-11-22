import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';


import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import EventDetail from './pages/EventDetail';
import QRScanner from './pages/QRScanner';
import OrganizerDashboard from './pages/OrganizerDashboard';
import HeatmapView from './pages/HeatmapView';
import CreateEvent from './pages/CreateEvent';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {}
          <Route path="/" element={<Home />} />
          <Route
            path="/events/:id"
            element={
              <ProtectedRoute>
                <EventDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/heatmap/all"
            element={
              <ProtectedRoute>
                <HeatmapView />
              </ProtectedRoute>
            }
          />

          {}
          <Route
            path="/scanner"
            element={
              <ProtectedRoute allowedRoles={['organizer', 'admin']}>
                <QRScanner />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-event"
            element={
              <ProtectedRoute allowedRoles={['organizer', 'admin']}>
                <CreateEvent />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics/:eventId"
            element={
              <ProtectedRoute allowedRoles={['organizer', 'admin']}>
                <OrganizerDashboard />
              </ProtectedRoute>
            }
          />
          
          {}
          <Route path="*" element={<Home />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
