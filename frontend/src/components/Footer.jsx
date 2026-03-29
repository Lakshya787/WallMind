import React from 'react';
import { Compass, Twitter, Linkedin, Github } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-400 py-12 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand and Mission */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-2 mb-6">
              <Compass className="h-6 w-6 text-blue-400" />
              <span className="text-xl font-bold text-white tracking-tight">WallMind</span>
            </div>
            <p className="max-w-md text-sm leading-relaxed mb-6">
              Empowering architects and engineers with advanced geometric parsing and 3D visualization. Transforming 2D floor plans into structured, intelligent structural models instantly.
            </p>
            <div className="flex space-x-5">
              <span className="hover:text-blue-400 cursor-pointer transition-colors transition-all"><Twitter className="w-5 h-5" /></span>
              <span className="hover:text-blue-400 cursor-pointer transition-colors transition-all"><Linkedin className="w-5 h-5" /></span>
              <span className="hover:text-blue-400 cursor-pointer transition-colors transition-all"><Github className="w-5 h-5" /></span>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-6">Platform</h4>
            <ul className="space-y-4 text-sm">
              <li><Link to="/upload" className="hover:text-blue-400 transition-colors">Analyzer</Link></li>
              <li><Link to="/dashboard" className="hover:text-blue-400 transition-colors">My Projects</Link></li>
              <li><Link to="/signup" className="hover:text-blue-400 transition-colors">Join for Free</Link></li>
              <li><span className="hover:text-blue-400 cursor-pointer transition-colors transition-all">API Access</span></li>
            </ul>
          </div>

          {/* Legal / Company */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-6">Company</h4>
            <ul className="space-y-4 text-sm">
              <li><span className="hover:text-blue-400 cursor-pointer transition-colors transition-all">Privacy Policy</span></li>
              <li><span className="hover:text-blue-400 cursor-pointer transition-colors transition-all">Terms of Service</span></li>
              <li><span className="hover:text-blue-400 cursor-pointer transition-colors transition-all">Contact Us</span></li>
              <li><span className="hover:text-blue-400 cursor-pointer transition-colors transition-all">About WallMind</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center text-xs">
          <p>© {currentYear} WallMind Structural Systems. Prototype MVP v1.0.</p>
          <div className="mt-4 sm:mt-0 flex space-x-6">
            <span>Built by WallMind for Google Promptathon 2026.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
