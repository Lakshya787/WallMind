import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileImage, X, Loader2, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Info } from 'lucide-react';
import api from '../api/axios';

const PIPELINE_STEPS = [
  { id: 'upload',    label: 'Uploading',              sub: 'Sending image to server' },
  { id: 'parse',     label: 'Parsing Floor Plan',     sub: 'Detecting walls, rooms, openings' },
  { id: 'geometry',  label: 'Geometry Reconstruction',sub: 'Building 3D graph structure' },
  { id: 'materials', label: 'Material Analysis',      sub: 'Scoring strength, durability, cost' },
  { id: 'report',    label: 'Generating Report',      sub: 'Compiling structural insights' },
];

function PipelineStep({ step, status }) {
  // status: 'pending' | 'active' | 'done'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
      <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: status === 'done' ? 'rgba(16,185,129,0.2)' : status === 'active' ? 'rgba(99,102,241,0.2)' : 'rgba(30,41,59,0.8)',
        border: `2px solid ${status === 'done' ? '#10b981' : status === 'active' ? '#6366f1' : '#1e293b'}`,
        transition: 'all .3s',
      }}>
        {status === 'done'
          ? <CheckCircle2 style={{ width: 14, color: '#34d399' }} />
          : status === 'active'
          ? <Loader2 style={{ width: 14, color: '#818cf8', animation: 'spin .8s linear infinite' }} />
          : <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#334155' }} />}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: status === 'pending' ? '#475569' : '#f1f5f9', transition: 'color .3s' }}>
          {step.label}
        </p>
        {status !== 'pending' && (
          <p style={{ margin: 0, fontSize: 11, color: '#64748b', marginTop: 1 }}>{step.sub}</p>
        )}
      </div>
    </div>
  );
}

const TIPS = [
  'Use a clear, high-contrast floor plan image for best detection accuracy.',
  'PNG or JPG formats work best. Avoid PDF conversions if possible.',
  'Ensure walls are clearly distinct from background in the image.',
  'Plans with labeled rooms improve the explainability output.',
  'Higher resolution images (above 800×600) yield better geometry extraction.',
];

export default function Upload() {
  const [file, setFile]           = useState(null);
  const [preview, setPreview]     = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [tipsOpen, setTipsOpen]   = useState(false);
  const fileInputRef = useRef(null);
  const navigate     = useNavigate();

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { setError('Please upload a valid image file (PNG, JPG).'); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError('');
  };

  const clearFile = () => {
    setFile(null); setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith('image/')) { setFile(f); setPreview(URL.createObjectURL(f)); setError(''); }
  };

  const simulateStep = (idx) => new Promise(res => {
    setActiveStep(idx);
    setTimeout(res, 800 + Math.random() * 400);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError('');
    setActiveStep(0);

    const formData = new FormData();
    formData.append('floor_plan', file);

    try {
      await simulateStep(0);
      await simulateStep(1);
      await simulateStep(2);
      await simulateStep(3);

      const response = await api.post('/analysis', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await simulateStep(4);
      setActiveStep(5); // all done

      const createdId = response.data.analysis?._id || response.data.analysisId || response.data._id;

      if (response.data.success && createdId) {
        setTimeout(() => navigate(`/analysis/${createdId}`), 500);
      } else if (response.data.success && response.data.report) {
        // Fallback for returning report without a saved ID
        setTimeout(() => navigate(`/analysis/result`, { state: { report: response.data.report } }), 500);
      } else {
        throw new Error('Unexpected response from server.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Analysis failed. Please try again.');
      setActiveStep(-1);
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow py-12 px-4 relative max-w-3xl mx-auto w-full animate-fade-in">
      {/* Decorative */}
      <div className="absolute top-0 left-[-15%] w-[35vw] h-[35vw] rounded-full bg-blue-600/8 filter blur-[130px] pointer-events-none" />
      <div className="absolute bottom-0 right-[-15%] w-[35vw] h-[35vw] rounded-full bg-indigo-600/8 filter blur-[130px] pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Analyze a Floor Plan</h1>
          <p className="text-slate-400 font-light">
            Upload a 2D floor plan image to automatically extract walls, rooms, openings, and generate a 3D model with material recommendations.
          </p>
        </div>

        {/* Tips accordion */}
        <button
          onClick={() => setTipsOpen(o => !o)}
          className="w-full mb-6 flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-300 hover:border-indigo-500/40 transition-all text-sm font-medium"
        >
          <span className="flex items-center gap-2"><Info className="w-4 h-4 text-indigo-400" /> Tips for best results</span>
          {tipsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {tipsOpen && (
          <ul className="mb-6 bg-slate-900/60 border border-indigo-500/20 rounded-xl px-5 py-4 space-y-2">
            {TIPS.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                <span className="text-indigo-400 font-bold mt-0.5">{i + 1}.</span> {tip}
              </li>
            ))}
          </ul>
        )}

        {/* Error */}
        {error && (
          <div className="mb-5 bg-red-900/25 border border-red-800/40 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
            <span className="text-red-200 text-sm">{error}</span>
          </div>
        )}

        {/* Upload zone OR preview */}
        {!file ? (
          <div
            className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-300 px-6 py-20 cursor-pointer ${
              isDragging
                ? 'border-indigo-500 bg-indigo-500/8 scale-[1.01]'
                : 'border-slate-700 bg-slate-900/30 hover:border-indigo-500/50 hover:bg-slate-800/30'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current.click()}
          >
            <div className={`h-20 w-20 rounded-full flex items-center justify-center mb-5 transition-all duration-300 ${
              isDragging ? 'bg-indigo-500/20 text-indigo-400 scale-110' : 'bg-slate-800 text-slate-500'
            }`}>
              <UploadCloud className="h-9 w-9" />
            </div>
            <p className="text-lg font-medium text-slate-300 mb-1">
              <span className="text-indigo-400 hover:text-indigo-300 cursor-pointer">Browse file</span>
              {' '}or drag and drop
            </p>
            <p className="text-sm text-slate-500 font-light">PNG, JPG, JPEG · Max 10 MB</p>
            <input
              name="floor_plan" type="file" className="sr-only"
              accept="image/png,image/jpeg,image/jpg"
              ref={fileInputRef} onChange={handleFileChange}
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 relative">
            <button
              onClick={clearFile} disabled={loading}
              className="absolute top-4 right-4 p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-red-500/70 border border-slate-700 disabled:opacity-40 transition-all z-10"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col items-center">
              <div className="w-full max-w-md rounded-xl overflow-hidden border border-slate-700 shadow-xl mb-4 bg-slate-900">
                <img src={preview} alt="Floor plan preview" className="w-full h-auto object-contain max-h-[320px]" />
              </div>
              <div className="flex items-center text-sm text-slate-400 bg-slate-800/70 px-4 py-2 rounded-full border border-slate-700/50">
                <FileImage className="h-4 w-4 mr-2 text-indigo-400" />
                {file.name} <span className="mx-2 text-slate-600">·</span> {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
          </div>
        )}

        {/* Pipeline progress — shown while loading */}
        {loading && (
          <div className="mt-6 rounded-2xl border border-slate-700/50 bg-slate-900/60 p-6">
            <p className="text-sm font-semibold text-slate-300 mb-4">Processing pipeline…</p>
            <div style={{ borderLeft: '2px solid #1e293b', marginLeft: 13, paddingLeft: 2 }}>
              {PIPELINE_STEPS.map((step, i) => {
                const status = activeStep > i ? 'done' : activeStep === i ? 'active' : 'pending';
                return <PipelineStep key={step.id} step={step} status={status} />;
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            disabled={loading}
            className="text-sm font-semibold text-slate-300 px-6 py-3 hover:bg-slate-800 rounded-xl transition-all border border-transparent hover:border-slate-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file || loading}
            className="inline-flex justify-center items-center rounded-xl px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_35px_rgba(79,70,229,0.5)] disabled:opacity-40 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {loading ? (
              <><Loader2 className="animate-spin mr-2 h-4 w-4" /> Analyzing…</>
            ) : (
              'Analyze Floor Plan'
            )}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
