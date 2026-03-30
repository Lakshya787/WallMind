import React from 'react';
import { Compass, Twitter, Linkedin, Github } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800/50 backdrop-blur-md relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-2">
            <Compass className="h-5 w-5 text-indigo-400" />
            <span className="font-bold text-slate-200 tracking-tight">WallMind</span>
          </div>
          
          <div className="text-center text-slate-500 text-xs font-medium">
            Intelligent Floor Plan Analysis MVP. Built for Google Promptathon 2026.
          </div>

          <div className="flex items-center space-x-4">
            <a href="https://github.com/Lakshya787/WallMind" target="_blank" rel="noreferrer" className="text-slate-500 hover:text-indigo-400 transition-colors" title="GitHub Repository">
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
