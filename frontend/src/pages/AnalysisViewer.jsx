import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  ArrowLeft, Layers, AlertCircle, CheckCircle2,
  AlertTriangle, ChevronDown, ChevronRight,
  Info, Trash2, Loader2, Box, Home,
} from 'lucide-react';
import api from '../api/axios';

/* ═══════════════════════════════════════════════════════════════════
   CONSTANTS — match parser.py generate_scene_json()
═══════════════════════════════════════════════════════════════════ */
const REAL_WIDTH_M  = 12;   // default building width  (m) — user can override
const REAL_DEPTH_M  = 9;    // default building depth  (m)
const WALL_HEIGHT_M = 3;    // default wall height     (m)

/* ═══════════════════════════════════════════════════════════════════
   THREE.JS SCENE COMPONENTS
═══════════════════════════════════════════════════════════════════ */

/** Single extruded wall — BoxGeometry, coloured by material type */
function Wall3D({ wall, selected, onClick }) {
  const meshRef = useRef();

  // Pulse selected wall
  useFrame(({ clock }) => {
    if (meshRef.current && selected) {
      meshRef.current.material.emissiveIntensity =
        0.25 + 0.2 * Math.sin(clock.elapsedTime * 3);
    } else if (meshRef.current) {
      meshRef.current.material.emissiveIntensity = 0;
    }
  });

  const { geometry, position, rotation_y, material_color_hex } = wall;
  const w = geometry.width  * REAL_WIDTH_M;
  const h = geometry.height * WALL_HEIGHT_M;
  const d = geometry.depth  * REAL_DEPTH_M;

  const px = position[0] * REAL_WIDTH_M;
  const py = position[1] * WALL_HEIGHT_M;
  const pz = position[2] * REAL_DEPTH_M;

  const color = selected ? '#3b82f6' : (material_color_hex || '#8B5E3C');

  return (
    <mesh
      ref={meshRef}
      position={[px, py, pz]}
      rotation={[0, rotation_y, 0]}
      castShadow
      receiveShadow
      onClick={(e) => { e.stopPropagation(); onClick(wall.id); }}
    >
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial
        color={color}
        emissive={selected ? '#3b82f6' : '#000000'}
        emissiveIntensity={0}
        roughness={0.7}
        metalness={0.05}
      />
    </mesh>
  );
}

/** Room floor slab — ShapeGeometry in the XZ plane */
function Room3D({ room }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    room.geometry.vertices.forEach(([x, , z], i) => {
      const rx = x * REAL_WIDTH_M;
      const rz = z * REAL_DEPTH_M;
      if (i === 0) shape.moveTo(rx, rz);
      else         shape.lineTo(rx, rz);
    });
    shape.closePath();

    const geo = new THREE.ShapeGeometry(shape);
    // ShapeGeometry is in XY plane; rotate into XZ
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [room]);

  return (
    <mesh geometry={geometry} receiveShadow position={[0, 0.01, 0]}>
      <meshStandardMaterial
        color="#f0ebe3"
        roughness={0.9}
        metalness={0}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** Door / window marker — thin coloured slab on the floor */
function Opening3D({ opening }) {
  const isWindow = opening.type === 'window';
  const color    = isWindow ? '#60a5fa' : '#34d399';

  const px = opening.position[0] * REAL_WIDTH_M;
  const pz = opening.position[2] * REAL_DEPTH_M;

  const heightStart = (opening.height_start || 0) * WALL_HEIGHT_M;
  const heightEnd   = (opening.height_end   || 0.7) * WALL_HEIGHT_M;
  const oHeight     = heightEnd - heightStart;
  const py          = heightStart + oHeight / 2;

  const oWidth = Math.max(0.05, (opening.width || 0.05) * REAL_WIDTH_M);

  return (
    <group position={[px, py, pz]}>
      <mesh>
        <boxGeometry args={[oWidth, oHeight, 0.05]} />
        <meshStandardMaterial color={color} transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

/** Full scene: walls + rooms + openings + grid */
function FloorPlanScene({ sceneJson, selectedWall, onWallClick }) {
  const walls    = sceneJson?.walls    || [];
  const rooms    = sceneJson?.rooms    || [];
  const openings = sceneJson?.openings || [];

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[10, 18, 10]} intensity={1.4}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-8, 12, -8]} intensity={0.4} />
      <hemisphereLight skyColor="#dbeafe" groundColor="#78716c" intensity={0.3} />

      {/* Background */}
      <color attach="background" args={['#111827']} />

      {/* Floor grid */}
      <Grid
        position={[REAL_WIDTH_M / 2, -0.01, REAL_DEPTH_M / 2]}
        args={[REAL_WIDTH_M * 1.5, REAL_DEPTH_M * 1.5]}
        cellSize={1}
        cellThickness={0.4}
        cellColor="#374151"
        sectionSize={5}
        sectionThickness={0.8}
        sectionColor="#4b5563"
        fadeDistance={60}
        infiniteGrid
      />

      {/* Room floor slabs */}
      {rooms.map(r => <Room3D key={r.id} room={r} />)}

      {/* Walls */}
      {walls.map(w => (
        <Wall3D
          key={w.id}
          wall={w}
          selected={selectedWall === w.id}
          onClick={onWallClick}
        />
      ))}

      {/* Door / Window markers */}
      {openings.map(o => <Opening3D key={o.id} opening={o} />)}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   UI PANELS
═══════════════════════════════════════════════════════════════════ */

const SEVERITY_STYLE = {
  critical: { bg: '#fef2f2', border: '#fca5a5', text: '#b91c1c', Icon: AlertCircle },
  warning:  { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', Icon: AlertTriangle },
  info:     { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af', Icon: Info },
};

function FlagCard({ flag }) {
  const s = SEVERITY_STYLE[flag.severity] || SEVERITY_STYLE.info;
  const { Icon } = s;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      background: s.bg, border: `1px solid ${s.border}`,
      borderRadius: 8, padding: '10px 12px', marginBottom: 8,
    }}>
      <Icon style={{ width: 15, height: 15, color: s.text, marginTop: 2, flexShrink: 0 }} />
      <div>
        <span style={{ fontSize: 11, fontWeight: 700, color: s.text,
          textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {flag.severity}
        </span>
        <p style={{ margin: 0, fontSize: 12.5, color: '#374151', lineHeight: 1.5, marginTop: 2 }}>
          {flag.message}
        </p>
      </div>
    </div>
  );
}

function WallCard({ wall, material, selected, onClick }) {
  const typeColor = {
    load_bearing_outer: '#78350f',
    load_bearing_spine: '#92400e',
    partition:          '#1e3a5f',
  }[wall.structural_type] || '#374151';

  const typeBg = {
    load_bearing_outer: '#fef3c7',
    load_bearing_spine: '#ffedd5',
    partition:          '#dbeafe',
  }[wall.structural_type] || '#f3f4f6';

  return (
    <div
      onClick={onClick}
      style={{
        border: `1.5px solid ${selected ? '#3b82f6' : '#e5e7eb'}`,
        borderRadius: 10, marginBottom: 8,
        background: selected ? '#eff6ff' : '#fff',
        cursor: 'pointer', overflow: 'hidden',
        boxShadow: selected ? '0 0 0 3px #bfdbfe' : 'none',
        transition: 'all .15s',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '10px 12px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              background: wall.material_color_hex || '#8B5E3C', flexShrink: 0,
              boxShadow: '0 0 0 2px rgba(0,0,0,.1)',
            }} />
            <span style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>
              Wall {wall.id}
            </span>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 600, color: typeColor,
            background: typeBg, borderRadius: 4, padding: '2px 7px',
          }}>
            {wall.structural_type.replace(/_/g, ' ')}
          </span>
        </div>
        {selected
          ? <ChevronDown style={{ width: 16, color: '#3b82f6' }} />
          : <ChevronRight style={{ width: 16, color: '#9ca3af' }} />}
      </div>

      {selected && material && (
        <div style={{ padding: '8px 12px 12px', borderTop: '1px solid #e5e7eb', background: '#f8fafc' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280',
            textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>
            Recommended Materials
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            {material.options.map((opt, i) => (
              <span key={i} style={{
                fontSize: 11, fontWeight: 600, color: '#1e40af',
                background: '#dbeafe', border: '1px solid #bfdbfe',
                borderRadius: 4, padding: '2px 8px',
              }}>
                {i === 0 ? '⭐ ' : ''}{opt}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: '#6b7280' }}>Strength / Durability / Cost</span>
            <span style={{ fontWeight: 700, color: '#111827' }}>
              {material.score.strength} / {material.score.durability} / {material.score.cost}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 2 }}>
            <span style={{ color: '#6b7280' }}>Net suitability score</span>
            <span style={{ fontWeight: 700, color: '#059669' }}>{material.net_score}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════ */
export default function AnalysisViewer() {
  const navigate    = useNavigate();
  const { id }      = useParams();

  const [analysis,     setAnalysis]     = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [selectedWall, setSelectedWall] = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [camTarget,    setCamTarget]    = useState([REAL_WIDTH_M / 2, 0, REAL_DEPTH_M / 2]);

  // ── Fetch analysis from backend ──────────────────────────────────
  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const { data } = await api.get(`/analysis/${id}`);
        if (data.success) {
          setAnalysis(data.analysis);
        } else {
          setError('Analysis not found.');
        }
      } catch {
        setError('Failed to load analysis from server.');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalysis();
  }, [id]);

  // ── Derive data sources ──────────────────────────────────────────
  const report      = analysis?.report      || {};
  const sceneJson   = report?.sceneJson     || {};
  const walls       = sceneJson?.walls      || [];
  const materials   = report?.materials     || [];
  const flags       = analysis?.structuralFlags || report?.structuralFlags || [];
  const imageUrl    = analysis?.imageUrl
    ? `http://localhost:5010${analysis.imageUrl}`
    : null;

  // Camera target: centroid of all walls
  useEffect(() => {
    if (walls.length > 0) {
      let sumX = 0, sumZ = 0;
      walls.forEach(w => { sumX += w.position[0]; sumZ += w.position[2]; });
      setCamTarget([
        (sumX / walls.length) * REAL_WIDTH_M,
        0,
        (sumZ / walls.length) * REAL_DEPTH_M,
      ]);
    }
  }, [walls]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this analysis? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.delete(`/analysis/${id}`);
      navigate('/dashboard');
    } catch {
      alert('Delete failed.');
      setDeleting(false);
    }
  };

  const toggleWall = (wid) => setSelectedWall(prev => prev === wid ? null : wid);

  // ── Loading / error states ───────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#0f172a' }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        border: '3px solid #1e3a5f', borderTopColor: '#3b82f6',
        animation: 'spin .8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform:rotate(360deg) }}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff' }}>
      <AlertCircle style={{ width: 40, height: 40, color: '#ef4444', marginBottom: 12 }} />
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>{error}</h2>
      <button onClick={() => navigate('/dashboard')} style={{
        marginTop: 8, color: '#60a5fa', background: 'none',
        border: 'none', cursor: 'pointer', fontSize: 14,
      }}>← Back to Dashboard</button>
    </div>
  );

  const selectedMat = materials.find(m => m.wallId === selectedWall);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, sans-serif', overflow: 'hidden', background: '#0f172a' }}>

      {/* ── Top Bar ──────────────────────────────────────────────── */}
      <header style={{
        height: 56, background: '#0f172a', borderBottom: '1px solid #1e293b',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/dashboard')} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 13,
          }}>
            <ArrowLeft style={{ width: 16 }} /> Dashboard
          </button>
          <span style={{ color: '#334155', fontSize: 16 }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Layers style={{ width: 15, color: '#3b82f6' }} />
            <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14 }}>
              Analysis #{id?.slice(-8).toUpperCase()}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 10px',
            borderRadius: 20, background: '#022c22', color: '#34d399',
            border: '1px solid #064e3b',
          }}>
            <CheckCircle2 style={{ width: 10, display: 'inline', marginRight: 4 }} />
            Completed
          </span>
          <button onClick={handleDelete} disabled={deleting} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: '#7f1d1d', color: '#fca5a5', border: 'none',
            borderRadius: 6, padding: '5px 10px', fontSize: 12,
            fontWeight: 600, cursor: 'pointer',
          }}>
            {deleting
              ? <Loader2 style={{ width: 13, animation: 'spin .8s linear infinite' }} />
              : <Trash2 style={{ width: 13 }} />}
            Delete
          </button>
        </div>
      </header>

      {/* ── Main Layout ──────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left Panel */}
        <aside style={{
          width: 340, background: '#0f172a', borderRight: '1px solid #1e293b',
          display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0,
        }}>
          <div style={{ padding: '16px 14px', overflowY: 'auto', flex: 1 }}>

            {/* Floor plan thumbnail */}
            {imageUrl && (
              <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 16,
                border: '1px solid #1e293b' }}>
                <img src={imageUrl} alt="Floor plan"
                  style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }}
                  onError={e => e.target.style.display = 'none'}
                />
              </div>
            )}

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
              gap: 8, marginBottom: 16 }}>
              {[
                { label: 'Walls',    value: walls.length,                     icon: Box  },
                { label: 'Rooms',    value: sceneJson?.rooms?.length    || 0,  icon: Home },
                { label: 'Openings', value: sceneJson?.openings?.length || 0,  icon: Layers },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} style={{
                  background: '#1e293b', borderRadius: 8, padding: '10px 8px',
                  textAlign: 'center', border: '1px solid #334155',
                }}>
                  <Icon style={{ width: 14, color: '#60a5fa', marginBottom: 4 }} />
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>{value}</div>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Structural Flags */}
            <div style={{ marginBottom: 16 }}>
              <h3 style={{
                fontSize: 10, fontWeight: 700, color: '#64748b',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <AlertTriangle style={{ width: 12 }} /> Structural Flags
              </h3>
              {flags.length === 0 ? (
                <div style={{
                  background: '#022c22', border: '1px solid #064e3b',
                  borderRadius: 8, padding: '10px 12px',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <CheckCircle2 style={{ width: 14, color: '#34d399' }} />
                  <span style={{ fontSize: 12.5, color: '#6ee7b7', fontWeight: 500 }}>
                    No structural anomalies detected
                  </span>
                </div>
              ) : (
                flags.map((f, i) => <FlagCard key={i} flag={f} />)
              )}
            </div>

            {/* Wall breakdown */}
            <h3 style={{
              fontSize: 10, fontWeight: 700, color: '#64748b',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <Box style={{ width: 12 }} /> Wall Breakdown
            </h3>
            {walls.length === 0 ? (
              <p style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                No walls in this analysis
              </p>
            ) : (
              walls.map(w => {
                const mat = materials.find(m => m.wallId === w.id);
                return (
                  <WallCard
                    key={w.id}
                    wall={w}
                    material={mat}
                    selected={selectedWall === w.id}
                    onClick={() => toggleWall(w.id)}
                  />
                );
              })
            )}
          </div>
        </aside>

        {/* 3D Canvas */}
        <div style={{ flex: 1, position: 'relative' }}>
          {/* Overlay legend */}
          <div style={{
            position: 'absolute', top: 12, left: 12, zIndex: 10,
            background: 'rgba(15,23,42,.75)', backdropFilter: 'blur(8px)',
            border: '1px solid #1e293b', borderRadius: 8,
            padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 5,
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b',
              textTransform: 'uppercase', letterSpacing: '0.06em' }}>Legend</span>
            {[
              { color: '#8B5E3C', label: 'Load-bearing outer' },
              { color: '#A0714F', label: 'Load-bearing spine' },
              { color: '#D4C5A9', label: 'Partition' },
              { color: '#34d399', label: 'Door opening' },
              { color: '#60a5fa', label: 'Window opening' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2,
                  background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Controls hint */}
          <div style={{
            position: 'absolute', bottom: 12, right: 12, zIndex: 10,
            background: 'rgba(15,23,42,.75)', backdropFilter: 'blur(8px)',
            border: '1px solid #1e293b', borderRadius: 6,
            padding: '5px 10px', fontSize: 11, color: '#475569', fontFamily: 'monospace',
          }}>
            Drag: Orbit · Scroll: Zoom · Right-drag: Pan
          </div>

          {walls.length === 0 && !loading && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 5,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              color: '#475569', fontSize: 14, gap: 8,
            }}>
              <Layers style={{ width: 32, color: '#334155' }} />
              <span>No 3D geometry to display</span>
              <span style={{ fontSize: 11, color: '#334155' }}>
                The parser returned no walls for this image
              </span>
            </div>
          )}

          <Canvas
            shadows
            camera={{
              position: [
                camTarget[0],
                WALL_HEIGHT_M * 3,
                camTarget[2] + REAL_DEPTH_M * 0.9,
              ],
              fov: 50,
              near: 0.1,
              far: 500,
            }}
            style={{ width: '100%', height: '100%' }}
          >
            <FloorPlanScene
              sceneJson={sceneJson}
              selectedWall={selectedWall}
              onWallClick={toggleWall}
            />
            <OrbitControls
              target={camTarget}
              makeDefault
              enableDamping
              dampingFactor={0.06}
              minDistance={2}
              maxDistance={80}
            />
          </Canvas>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
