import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }
  };

  return (
    <Layout>
      <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
        <div className="blob absolute top-10 left-10 w-80 h-80 opacity-20 pointer-events-none"></div>
        <div className="max-w-md w-full space-y-8 bg-[#13131F] p-8 rounded-2xl border border-[#232236] transition-all duration-300 hover:shadow-[0_20px_40px_rgba(124,92,252,0.08)] relative z-10">
          <div>
            <div className="mx-auto h-12 w-12 rounded-xl bg-gradient-to-br from-[#7C5CFC] to-[#FF5C7A] flex items-center justify-center text-white text-xl font-bold shadow-md">
              P
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-[#F3F1F8]">
              Welcome Back
            </h2>
            <p className="mt-2 text-center text-sm text-[#8A8797]">
              Sign in to access events and live campus crowd maps
            </p>
          </div>

          {error && (
            <div className="bg-[#E74C3C]/10 border-l-4 border-[#E74C3C] text-[#E74C3C] p-4 rounded-xl text-sm font-semibold">
              {error}
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email-address" className="block text-sm font-semibold text-[#8A8797]">
                  Email Address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  required
                  className="mt-1 block w-full px-4 py-3 bg-[#0A0A12] border border-[#232236] text-[#F3F1F8] placeholder-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C5CFC] focus:border-transparent text-sm"
                  placeholder="alice@test.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-[#8A8797]">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="mt-1 block w-full px-4 py-3 bg-[#0A0A12] border border-[#232236] text-[#F3F1F8] placeholder-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7C5CFC] focus:border-transparent text-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-[#7C5CFC] hover:bg-[#6c4beb] transition-all shadow-md active:scale-95 disabled:opacity-75 disabled:pointer-events-none cursor-none"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>

          <div className="text-center text-sm text-[#8A8797] pt-4">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-[#7C5CFC] hover:text-[#C9FF3D]">
              Register here
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Login;
