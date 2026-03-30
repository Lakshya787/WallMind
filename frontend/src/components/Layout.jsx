import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-200 selection:bg-indigo-500/30 selection:text-indigo-200 font-sans relative overflow-hidden">
      {/* Subtle global background glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-900/20 blur-[120px] pointer-events-none" />
      
      <Navbar />
      <main className="flex-grow relative z-10 flex flex-col">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
