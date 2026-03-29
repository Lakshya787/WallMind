import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Bot, Compass, ShieldCheck } from 'lucide-react';

function Landing() {
  const { user } = useAuth();

  return (
    <div className="bg-gray-50 flex flex-col font-sans">

      {/* Hero Section */}
      <main className="flex-grow">
        <div className="relative overflow-hidden">
          <div className="absolute inset-y-0 h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-50"></div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-32 sm:pb-32 text-center">
            <div className="mx-auto max-w-3xl">
              <h1 className="text-4xl sm:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight">
                Transform Floor Plans into <span className="text-blue-600">3D Reality</span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto">
                WallMind accepts your floor plan images, extracts geometries, applies intelligent material logic, and generates ready-to-use 3D models with ZERO manual effort.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to={user ? "/dashboard" : "/signup"}
                  className="inline-flex items-center justify-center px-8 py-3.5 border border-transparent text-base font-medium rounded-full text-white bg-blue-600 hover:bg-blue-700 shadow-xl hover:shadow-blue-500/30 transition-all duration-300"
                >
                  {user ? "Go to Dashboard" : "Start For Free"}
                  <ArrowRight className="ml-2 -mr-1 h-5 w-5" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center px-8 py-3.5 border-2 border-gray-200 text-base font-medium rounded-full text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-300"
                >
                  Learn More
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Features / Value Prop */}
        <div id="how-it-works" className="bg-white py-24 sm:py-32 border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900">How WallMind Works</h2>
              <p className="mt-4 text-gray-500">A seamless pipeline from a 2D image to a complete 3D structure.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 hover:border-blue-100 transition-colors">
                <div className="bg-blue-100 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                  <Compass className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">1. Upload Plan</h3>
                <p className="text-gray-600">
                  Upload any standard floor plan image. Our secure backend manages the asset and orchestrates the parsing pipeline.
                </p>
              </div>

              <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 hover:border-blue-100 transition-colors">
                <div className="bg-blue-100 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                  <Bot className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">2. Auto-Extract</h3>
                <p className="text-gray-600">
                  Advanced parsing engines analyze the image geometry, detect walls, and categorize inner and outer boundaries.
                </p>
              </div>

              <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 hover:border-blue-100 transition-colors">
                <div className="bg-blue-100 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                  <ShieldCheck className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">3. Apply Logic</h3>
                <p className="text-gray-600">
                  Material rules are intelligently verified and applied. Finally, you get a clean 3D-ready JSON mapping to render.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}

export default Landing;
