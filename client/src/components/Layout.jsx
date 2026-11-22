import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

const Layout = ({ children }) => {
  return (
    <div className="pulse-theme min-h-screen flex flex-col bg-[#0A0A12] text-[#F3F1F8]">
      <Navbar />
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
