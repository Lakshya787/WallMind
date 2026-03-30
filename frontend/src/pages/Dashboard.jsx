import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  PlusCircle,
  LayoutDashboard,
  FileImage,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  Box,
  Home,
} from 'lucide-react';
import api from '../api/axios';

/* ── Status helpers ──────────────────────────────────────────────── */
const STATUS_CFG = {
  completed: { label: 'Completed', Icon: CheckCircle2, cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  processing: { label: 'Processing', Icon: Clock,        cls: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  failed:     { label: 'Failed',     Icon: XCircle,      cls: 'bg-red-500/10 text-red-400 border border-red-500/20' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.processing;
  const { Icon, label, cls } = cfg;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md shadow-sm ${cls}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

/* ── Analysis card ───────────────────────────────────────────────── */
function AnalysisCard({ analysis, onDelete, onOpen }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this analysis? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.delete(`/analysis/${analysis._id}`);
      onDelete(analysis._id);
    } catch {
      alert('Failed to delete. Please try again.');
      setDeleting(false);
    }
  };

  const flagCount = analysis.structuralFlags?.length ?? 0;
  const sceneJson = analysis.report?.sceneJson || analysis.sceneJson || {};
  const wallCount = sceneJson?.walls?.length ?? 0;
  const roomCount = sceneJson?.rooms?.length ?? 0;
  const date = new Date(analysis.createdAt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  return (
    <div
      onClick={() => onOpen(analysis._id)}
      className="group relative glass-card rounded-2xl overflow-hidden hover:shadow-[0_10px_40px_rgba(99,102,241,0.2)] hover:border-indigo-500/50 transition-all duration-500 cursor-pointer flex flex-col transform hover:-translate-y-1"
    >
      {/* Thumbnail */}
      <div className="h-48 bg-slate-900 flex items-center justify-center overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-10 opacity-60"></div>
        {analysis.imageUrl ? (
          <img
            src={`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5010'}${analysis.imageUrl}`}
            alt="Floor plan thumbnail"
            className="w-full h-full object-cover group-hover:scale-110 group-hover:rotate-1 transition-all duration-700 ease-out"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <FileImage className="h-12 w-12 text-slate-700" />
        )}
        {/* Status badge overlay */}
        <div className="absolute top-4 left-4 z-20">
          <StatusBadge status={analysis.status} />
        </div>
        {/* Delete button */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          title="Delete analysis"
          className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-slate-900/60 backdrop-blur-md hover:bg-red-500/20 text-slate-300 hover:text-red-400 transition-all duration-300 opacity-0 group-hover:opacity-100 border border-transparent hover:border-red-500/30"
        >
          {deleting
            ? <span className="block h-4 w-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
            : <Trash2 className="h-4 w-4" />}
        </button>
      </div>

      {/* Card body */}
      <div className="p-5 flex-1 flex flex-col justify-between relative z-20 bg-gradient-to-b from-transparent to-slate-900/50">
        <div>
          <p className="text-xs text-indigo-400 font-medium tracking-wide mb-1 uppercase">{date}</p>
          <h3 className="text-base font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
            Analysis #{analysis._id.slice(-6).toUpperCase()}
          </h3>
        </div>

        {/* Wall/Room counts */}
        {(wallCount > 0 || roomCount > 0) && (
          <div className="flex items-center gap-3 mt-3">
            {wallCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                <Box className="h-3 w-3 text-indigo-400" />{wallCount} walls
              </span>
            )}
            {roomCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                <Home className="h-3 w-3 text-emerald-400" />{roomCount} rooms
              </span>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-700/50">
          {flagCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
              <AlertTriangle className="h-3 w-3" />{flagCount} flag{flagCount !== 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-xs font-medium text-slate-600 bg-slate-800/80 px-2 py-0.5 rounded-md">No flags</span>
          )}
          <span className="inline-flex items-center text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors">
            View <ArrowRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Dashboard page ──────────────────────────────────────────────── */
export default function Dashboard() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [analyses, setAnalyses] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const fetchAnalyses = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get('/analysis');
      if (data.success) setAnalyses(data.analyses ?? []);
    } catch (err) {
      console.error('Fetch analyses error:', err);
      setError('Could not load analyses. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalyses(); }, [fetchAnalyses]);

  const handleDelete = (deletedId) =>
    setAnalyses(prev => prev.filter(a => a._id !== deletedId));

  return (
    <div className="flex-grow w-full relative">
      {/* Decorative Bg */}
      <div className="absolute top-0 right-0 w-[50vw] h-[50vw] rounded-full bg-blue-900/10 mix-blend-screen filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[50vw] h-[50vw] rounded-full bg-indigo-900/10 mix-blend-screen filter blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 relative z-10">
        
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                <LayoutDashboard className="h-6 w-6 text-indigo-400" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                My Analyses
              </h1>
            </div>
            <p className="text-slate-400 font-light ml-2">
              {loading ? 'Loading your projects…' : `${analyses.length} floor plan${analyses.length !== 1 ? 's' : ''} analysed`}
            </p>
          </div>

          <button
            onClick={() => navigate('/upload')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] transition-all transform hover:-translate-y-0.5"
          >
            <PlusCircle className="w-5 h-5" />
            New Analysis
          </button>
        </div>

        {/* ── States ── */}
        {loading && (
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin"></div>
              <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse"></div>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="glass-card rounded-2xl p-8 text-center max-w-2xl mx-auto border-red-500/30 bg-red-900/10">
            <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Oops! Something went wrong</h2>
            <p className="text-red-200 mb-6">{error}</p>
            <button
              onClick={fetchAnalyses}
              className="px-6 py-2.5 rounded-xl bg-red-500/20 text-red-300 font-semibold hover:bg-red-500/30 border border-red-500/30 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && analyses.length === 0 && (
          <div className="glass-card rounded-3xl p-12 text-center border-dashed border-2 border-slate-700 hover:border-indigo-500/50 transition-colors max-w-3xl mx-auto mt-12 bg-slate-900/30">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-500/20 to-blue-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(99,102,241,0.15)] border border-indigo-500/30">
              <FileImage className="w-12 h-12 text-indigo-400" />
            </div>
            <h2 className="text-3xl font-extrabold text-white mb-3 tracking-tight">
              No analyses yet
            </h2>
            <p className="text-slate-400 max-w-md mx-auto mb-10 text-lg font-light">
              Upload a 2D floor plan image to extract walls, rooms, openings, and instantly generate a 3D model.
            </p>
            <button
              onClick={() => navigate('/upload')}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-lg shadow-[0_0_25px_rgba(79,70,229,0.4)] hover:shadow-[0_0_40px_rgba(79,70,229,0.6)] transition-all transform hover:-translate-y-1"
            >
              <PlusCircle className="w-6 h-6" />
              Upload First Plan
            </button>
          </div>
        )}

        {/* ── Grid ── */}
        {!loading && !error && analyses.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {analyses.map(analysis => (
              <AnalysisCard
                key={analysis._id}
                analysis={analysis}
                onDelete={handleDelete}
                onOpen={(id) => navigate(`/analysis/${id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
