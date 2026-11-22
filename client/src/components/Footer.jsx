import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-[#0A0A12] border-t border-[#232236] py-8 px-[5%] mt-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-mono text-[#8A8797]">
      <span>© {new Date().getFullYear()} Pulse · Built for Smart Campus</span>
      <span className="text-center sm:text-right">Live board · updates in real time</span>
    </footer>
  );
};

export default Footer;
