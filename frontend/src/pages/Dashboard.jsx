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
} from 'lucide-react';
import api from '../api/axios';

/* ── Status helpers ──────────────────────────────────────────────── */
const STATUS_CFG = {
  completed: { label: 'Completed', Icon: CheckCircle2, cls: 'bg-emerald-100 text-emerald-700' },
  processing: { label: 'Processing', Icon: Clock,        cls: 'bg-blue-100  text-blue-700'    },
  failed:     { label: 'Failed',     Icon: XCircle,      cls: 'bg-red-100   text-red-700'     },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.processing;
  const { Icon, label, cls } = cfg;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-sm ${cls}`}>
      <Icon className="h-3 w-3" />
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
  const date = new Date(analysis.createdAt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  return (
    <div
      onClick={() => onOpen(analysis._id)}
      className="group relative bg-white border border-gray-200 rounded-2xl overflow-hidden
                 hover:shadow-lg hover:border-blue-300 transition-all duration-300 cursor-pointer flex flex-col"
    >
      {/* Thumbnail */}
      <div className="h-44 bg-gray-100 flex items-center justify-center overflow-hidden relative">
        {analysis.imageUrl ? (
          <img
            src={`http://localhost:5010${analysis.imageUrl}`}
            alt="Floor plan thumbnail"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <FileImage className="h-12 w-12 text-gray-300" />
        )}
        {/* Status badge overlay */}
        <div className="absolute top-3 left-3">
          <StatusBadge status={analysis.status} />
        </div>
        {/* Delete button */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          title="Delete analysis"
          className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/80 hover:bg-red-50
                     text-gray-400 hover:text-red-600 transition-colors opacity-0
                     group-hover:opacity-100 shadow-sm"
        >
          {deleting
            ? <span className="block h-4 w-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
            : <Trash2 className="h-4 w-4" />}
        </button>
      </div>

      {/* Card body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <p className="text-xs text-gray-400 mb-1">{date}</p>
          <h3 className="text-sm font-semibold text-gray-800 truncate font-mono">
            #{analysis._id.slice(-8).toUpperCase()}
          </h3>
        </div>

        <div className="mt-4 flex items-center justify-between">
          {/* Structural flags hint */}
          {flagCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              {flagCount} flag{flagCount !== 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-xs text-gray-400">No flags</span>
          )}

          <span className="inline-flex items-center text-xs font-semibold text-blue-600
                           group-hover:text-blue-700 transition-colors">
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
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2.5rem 1.5rem' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <LayoutDashboard style={{ color: '#2563eb', width: 22, height: 22 }} />
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                My Analyses
              </h1>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
              {loading ? 'Loading…' : `${analyses.length} floor plan${analyses.length !== 1 ? 's' : ''} analysed`}
            </p>
          </div>

          <button
            onClick={() => navigate('/upload')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              background: '#2563eb', color: '#fff', border: 'none',
              borderRadius: '0.625rem', padding: '0.55rem 1.1rem',
              fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,.15)',
            }}
          >
            <PlusCircle style={{ width: 16, height: 16 }} />
            New Analysis
          </button>
        </div>

        {/* ── States ── */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              border: '3px solid #e2e8f0', borderTopColor: '#2563eb',
              animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {!loading && error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '0.75rem',
            padding: '1.5rem', textAlign: 'center', color: '#b91c1c',
          }}>
            <AlertTriangle style={{ width: 24, height: 24, margin: '0 auto 0.5rem' }} />
            <p style={{ margin: 0, fontWeight: 500 }}>{error}</p>
            <button
              onClick={fetchAnalyses}
              style={{
                marginTop: '1rem', padding: '0.4rem 1rem', borderRadius: '0.5rem',
                background: '#b91c1c', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.875rem',
              }}
            >Retry</button>
          </div>
        )}

        {!loading && !error && analyses.length === 0 && (
          <div style={{
            border: '2px dashed #cbd5e1', borderRadius: '1rem',
            padding: '4rem 2rem', textAlign: 'center', background: '#fff',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', background: '#eff6ff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem',
            }}>
              <FileImage style={{ width: 28, height: 28, color: '#3b82f6' }} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
              No analyses yet
            </h2>
            <p style={{ color: '#64748b', maxWidth: 360, margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
              Upload a 2D floor plan image to extract walls, rooms, openings, and generate a 3D model.
            </p>
            <button
              onClick={() => navigate('/upload')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                background: '#2563eb', color: '#fff', border: 'none',
                borderRadius: '0.625rem', padding: '0.65rem 1.4rem',
                fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
              }}
            >
              <PlusCircle style={{ width: 18, height: 18 }} />
              Upload First Plan
            </button>
          </div>
        )}

        {/* ── Grid ── */}
        {!loading && !error && analyses.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.25rem',
          }}>
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
