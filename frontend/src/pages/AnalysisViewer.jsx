import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls, Grid, Html, Edges, ContactShadows,
} from '@react-three/drei';
import * as THREE from 'three';
import {
  ArrowLeft, Layers, AlertCircle, CheckCircle2,
  AlertTriangle, ChevronDown, ChevronRight,
  Info, Trash2, Loader2, Box, Home, Eye, EyeOff,
  SquareStack, Maximize2, Download, Building2, DoorOpen,
  BarChart3, Lightbulb, Ruler,
} from 'lucide-react';
import api from '../api/axios';

/* ═══════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════ */
const REAL_WIDTH_M  = 12;
const REAL_DEPTH_M  = 9;
const WALL_HEIGHT_M = 3;
const WALL_THICK_M  = 0.15;  // 15 cm physical wall thickness

/* ═══════════════════════════════════════════════════════════════════
   AREA COMPUTATION — Shoelace formula on normalized vertices
═══════════════════════════════════════════════════════════════════ */
function computeRoomAreaM2(vertices) {
  if (!vertices || vertices.length < 3) return 0;
  const pts = vertices.map(([x, , z]) => [x * REAL_WIDTH_M, z * REAL_DEPTH_M]);
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i][0] * pts[j][1];
    area -= pts[j][0] * pts[i][1];
  }
  return Math.abs(area / 2);
}

function computeCentroid(vertices) {
  if (!vertices || vertices.length === 0) return [REAL_WIDTH_M / 2, 0, REAL_DEPTH_M / 2];
  const n = vertices.length;
  const sumX = vertices.reduce((s, [x]) => s + x * REAL_WIDTH_M, 0);
  const sumZ = vertices.reduce((s, [, , z]) => s + z * REAL_DEPTH_M, 0);
  return [sumX / n, 0, sumZ / n];
}

/* ═══════════════════════════════════════════════════════════════════
   THREE.JS SCENE COMPONENTS
═══════════════════════════════════════════════════════════════════ */
function Wall3D({ wall, selected, onClick }) {
  const meshRef = useRef();
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    meshRef.current.material.emissiveIntensity = selected
      ? 0.3 + 0.15 * Math.sin(clock.elapsedTime * 3)
      : 0;
  });

  const { geometry, position, rotation_y, material_color_hex, orientation } = wall;
  // CRITICAL FIX: Scale wall length by the correct real-world axis
  // Horizontal walls extend along X → scale by REAL_WIDTH_M
  // Vertical walls extend along Z (rotated π/2) → scale by REAL_DEPTH_M
  const isHorizontal = orientation === 'horizontal';
  const wallLength = isHorizontal
    ? geometry.width * REAL_WIDTH_M
    : geometry.width * REAL_DEPTH_M;
  const h  = geometry.height * WALL_HEIGHT_M;
  const px = position[0] * REAL_WIDTH_M;
  const py = position[1] * WALL_HEIGHT_M;
  const pz = position[2] * REAL_DEPTH_M;
  const baseColor = material_color_hex || '#8B5E3C';
  const color = selected ? '#60a5fa' : baseColor;

  return (
    <group position={[px, py, pz]} rotation={[0, rotation_y, 0]}>
      {/* Main wall body */}
      <mesh
        ref={meshRef}
        castShadow receiveShadow
        onClick={(e) => { e.stopPropagation(); onClick(wall.id); }}
      >
        <boxGeometry args={[wallLength, h, WALL_THICK_M]} />
        <meshStandardMaterial
          color={color}
          emissive={selected ? '#3b82f6' : '#000'}
          emissiveIntensity={0}
          roughness={0.82}
          metalness={0.04}
        />
        <Edges threshold={15} color={selected ? '#93c5fd' : '#1a1a2e'} transparent opacity={selected ? 0.9 : 0.5} />
      </mesh>
      {/* Wall top cap for architectural depth */}
      <mesh position={[0, h / 2 + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[wallLength, WALL_THICK_M]} />
        <meshStandardMaterial color={selected ? '#4a7ab5' : '#383838'} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Room3D({ room, showLabel, area }) {
  const centroid = useMemo(() => computeCentroid(room.geometry?.vertices), [room]);

  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    (room.geometry?.vertices || []).forEach(([x, , z], i) => {
      const rx = x * REAL_WIDTH_M;
      const rz = z * REAL_DEPTH_M;
      if (i === 0) shape.moveTo(rx, rz); else shape.lineTo(rx, rz);
    });
    shape.closePath();
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [room]);

  const ROOM_COLORS = ['#e0f2fe','#fef3c7','#dcfce7','#fce7f3','#ede9fe','#ffedd5'];
  const colorIdx = (room.id?.charCodeAt(room.id.length - 1) || 0) % ROOM_COLORS.length;

  return (
    <group>
      <mesh geometry={geometry} receiveShadow position={[0, 0.01, 0]}>
        <meshStandardMaterial color={ROOM_COLORS[colorIdx]} roughness={0.95} opacity={0.7} transparent side={THREE.DoubleSide} />
      </mesh>
      {showLabel && area > 0 && (
        <Html position={[centroid[0], 0.5, centroid[2]]} center distanceFactor={10}>
          <div style={{
            background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(6px)',
            border: '1px solid rgba(99,102,241,0.4)', borderRadius: 6,
            padding: '3px 8px', fontSize: 11, color: '#e2e8f0',
            fontWeight: 600, userSelect: 'none', whiteSpace: 'nowrap',
            fontFamily: 'system-ui, sans-serif',
          }}>
            {room.label || `Room ${room.id}`}<br />
            <span style={{ color: '#94a3b8', fontWeight: 400 }}>{area.toFixed(1)} m²</span>
          </div>
        </Html>
      )}
    </group>
  );
}

function Opening3D({ opening, wall }) {
  const isWindow = opening.type === 'window';
  const color    = isWindow ? '#60a5fa' : '#34d399';
  const px = opening.position[0] * REAL_WIDTH_M;
  const pz = opening.position[2] * REAL_DEPTH_M;
  const hStart = (opening.height_start || 0) * WALL_HEIGHT_M;
  const hEnd   = (opening.height_end   || 0.7) * WALL_HEIGHT_M;
  const oH     = hEnd - hStart;
  const py     = hStart + oH / 2;
  // FIX: Scale opening width by the correct axis based on parent wall orientation
  const isHorizontalWall = wall ? wall.orientation === 'horizontal' : true;
  const scaleFactor = isHorizontalWall ? REAL_WIDTH_M : REAL_DEPTH_M;
  const oW     = Math.max(0.3, (opening.width || 0.05) * scaleFactor);
  const rotY   = wall ? wall.rotation_y : 0;
  const openingDepth = WALL_THICK_M + 0.04;

  return (
    <group position={[px, py, pz]} rotation={[0, rotY, 0]}>
      <mesh>
        <boxGeometry args={[oW, oH, openingDepth]} />
        <meshStandardMaterial
          color={color} transparent opacity={isWindow ? 0.3 : 0.45}
          emissive={color} emissiveIntensity={0.12}
        />
        <Edges color="white" transparent opacity={0.35} />
      </mesh>
      {isWindow && (
        <mesh>
          <planeGeometry args={[oW * 0.85, oH * 0.85]} />
          <meshStandardMaterial
            color="#bae6fd" transparent opacity={0.15}
            roughness={0.05} metalness={0.8} side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

function FloorPlanScene({ sceneJson, selectedWall, onWallClick, layers, roomAreas }) {
  const walls    = sceneJson?.walls    || [];
  const rooms    = sceneJson?.rooms    || [];
  const openings = sceneJson?.openings || [];

  return (
    <>
      {/* Enhanced lighting rig */}
      <ambientLight intensity={0.45} color="#e8eaf6" />
      <directionalLight
        position={[12, 20, 10]} intensity={1.8} castShadow
        shadow-mapSize-width={2048} shadow-mapSize-height={2048}
        shadow-camera-far={60}
        shadow-camera-left={-20} shadow-camera-right={20}
        shadow-camera-top={20} shadow-camera-bottom={-20}
        shadow-bias={-0.001}
      />
      <directionalLight position={[-10, 15, -8]} intensity={0.35} color="#b0c4de" />
      <hemisphereLight skyColor="#c7d2fe" groundColor="#5c4033" intensity={0.4} />
      <pointLight position={[REAL_WIDTH_M / 2, WALL_HEIGHT_M * 3, REAL_DEPTH_M / 2]} intensity={0.3} color="#fff5e6" />
      <color attach="background" args={['#0a0e18']} />
      <fog attach="fog" args={['#0a0e18', 35, 120]} />

      {/* Ground plane */}
      <mesh receiveShadow position={[REAL_WIDTH_M / 2, -0.02, REAL_DEPTH_M / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[REAL_WIDTH_M * 2, REAL_DEPTH_M * 2]} />
        <meshStandardMaterial color="#080c14" roughness={0.98} />
      </mesh>

      <Grid
        position={[REAL_WIDTH_M / 2, -0.01, REAL_DEPTH_M / 2]}
        args={[REAL_WIDTH_M * 2, REAL_DEPTH_M * 2]}
        cellSize={1} cellThickness={0.4} cellColor="#1a2038"
        sectionSize={3} sectionThickness={0.8} sectionColor="#2a3456"
        fadeDistance={60} infiniteGrid
      />

      {/* Contact shadows for soft grounding */}
      <ContactShadows
        position={[REAL_WIDTH_M / 2, 0.01, REAL_DEPTH_M / 2]}
        opacity={0.35} scale={30} blur={2.5} far={10} color="#000020"
      />

      {layers.rooms && rooms.map(r => (
        <Room3D
          key={r.id} room={r}
          showLabel={layers.labels}
          area={roomAreas[r.id] || 0}
        />
      ))}

      {layers.walls && walls.map(w => (
        <Wall3D key={w.id} wall={w} selected={selectedWall === w.id} onClick={onWallClick} />
      ))}

      {layers.openings && openings.map(o => {
        let parentWall = o.wall_id ? walls.find(w => w.id === o.wall_id) : null;
        if (!parentWall && walls.length > 0) {
          let minD = Number.POSITIVE_INFINITY;
          for (const w of walls) {
            const dx = w.position[0] - o.position[0];
            const dz = w.position[2] - o.position[2];
            const dStr = dx * dx + dz * dz;
            if (dStr < minD) {
              minD = dStr;
              parentWall = w;
            }
          }
        }
        return <Opening3D key={o.id} opening={o} wall={parentWall} />;
      })}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   UI HELPERS
═══════════════════════════════════════════════════════════════════ */
function SectionTitle({ icon: Icon, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
      <Icon style={{ width: 12, height: 12, color: '#6366f1', flexShrink: 0 }} />
      <span style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {children}
      </span>
    </div>
  );
}

function MiniBar({ value, color }) {
  return (
    <div style={{ height: 4, background: '#1e293b', borderRadius: 2, overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${Math.min(value * 10, 100)}%`, background: color, borderRadius: 2, transition: 'width .5s ease' }} />
    </div>
  );
}

const SEVERITY = {
  critical: { bg: 'rgba(239,68,68,0.1)',  border: '#dc2626', text: '#fca5a5', Icon: AlertCircle  },
  warning:  { bg: 'rgba(245,158,11,0.1)', border: '#d97706', text: '#fcd34d', Icon: AlertTriangle },
  info:     { bg: 'rgba(59,130,246,0.1)', border: '#3b82f6', text: '#93c5fd', Icon: Info          },
};

function FlagCard({ flag }) {
  const s = SEVERITY[flag.severity] || SEVERITY.info;
  const { Icon } = s;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      background: s.bg, border: `1px solid ${s.border}30`,
      borderLeft: `3px solid ${s.border}`,
      borderRadius: 8, padding: '8px 10px', marginBottom: 6,
    }}>
      <Icon style={{ width: 14, height: 14, color: s.border, marginTop: 1, flexShrink: 0 }} />
      <div>
        <span style={{ fontSize: 10, fontWeight: 700, color: s.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {flag.severity}
        </span>
        <p style={{ margin: 0, fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, marginTop: 2 }}>
          {flag.message}
        </p>
      </div>
    </div>
  );
}

function WallCard({ wall, material, selected, onClick }) {
  const typeConfig = {
    load_bearing_outer: { label: 'Load-Bearing Outer', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    load_bearing_spine: { label: 'Load-Bearing Spine', color: '#ef4444', bg: 'rgba(239,68,68,0.10)'  },
    partition:          { label: 'Partition',           color: '#10b981', bg: 'rgba(16,185,129,0.10)' },
  };
  const tc = typeConfig[wall.structural_type] || { label: wall.structural_type, color: '#6b7280', bg: 'rgba(107,114,128,0.1)' };

  return (
    <div
      onClick={onClick}
      style={{
        border: `1.5px solid ${selected ? '#6366f1' : '#1e293b'}`,
        borderRadius: 10, marginBottom: 6,
        background: selected ? 'rgba(99,102,241,0.08)' : '#0f172a',
        cursor: 'pointer', overflow: 'hidden',
        boxShadow: selected ? '0 0 0 2px rgba(99,102,241,0.3)' : 'none',
        transition: 'all .15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 11px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: wall.material_color_hex || '#8B5E3C', flexShrink: 0, boxShadow: '0 0 0 2px rgba(255,255,255,.1)' }} />
            <span style={{ fontWeight: 600, fontSize: 12, color: '#f1f5f9' }}>Wall {wall.id}</span>
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, color: tc.color, background: tc.bg, borderRadius: 4, padding: '2px 6px' }}>
            {tc.label}
          </span>
        </div>
        {selected
          ? <ChevronDown style={{ width: 14, color: '#6366f1' }} />
          : <ChevronRight style={{ width: 14, color: '#475569' }} />}
      </div>

      {selected && material && (
        <div style={{ padding: '8px 11px 11px', borderTop: '1px solid #1e293b', background: 'rgba(15,23,42,0.5)' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 7px' }}>
            Recommended Materials
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
            {material.options.map((opt, i) => (
              <span key={i} style={{
                fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                background: i === 0 ? 'rgba(99,102,241,0.25)' : 'rgba(30,41,59,0.8)',
                color: i === 0 ? '#818cf8' : '#94a3b8',
                border: `1px solid ${i === 0 ? 'rgba(99,102,241,0.5)' : '#1e293b'}`,
              }}>
                {i === 0 ? '★ ' : ''}{opt}
              </span>
            ))}
          </div>

          {/* Score breakdown as mini bars */}
          {material.score && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 8 }}>
              {[
                { label: 'Strength',   val: material.score.strength,   color: '#10b981' },
                { label: 'Durability', val: material.score.durability, color: '#3b82f6' },
                { label: 'Cost',       val: material.score.cost,       color: '#f59e0b' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 10, color: '#64748b', width: 58, flexShrink: 0 }}>{label}</span>
                  <MiniBar value={val} color={color} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#e2e8f0', width: 16, textAlign: 'right' }}>{val}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 7, borderTop: '1px solid #1e293b' }}>
            <span style={{ fontSize: 10, color: '#64748b' }}>Suitability Score</span>
            <span style={{
              fontSize: 13, fontWeight: 800,
              color: material.net_score >= 15 ? '#34d399' : material.net_score >= 10 ? '#fbbf24' : '#f87171',
            }}>
              {material.net_score} / 30
            </span>
          </div>

          {/* Explainability */}
          {material.justification && (
            <div style={{ marginTop: 8, padding: '7px 9px', background: 'rgba(99,102,241,0.07)', borderRadius: 6, border: '1px solid rgba(99,102,241,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                <Lightbulb style={{ width: 11, color: '#818cf8' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Why</span>
              </div>
              <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.6 }}>{material.justification}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: '9px 10px', textAlign: 'center', flex: 1 }}>
      <Icon style={{ width: 13, color: color || '#6366f1', marginBottom: 4 }} />
      <div style={{ fontSize: 17, fontWeight: 800, color: '#f1f5f9', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9.5, color: '#64748b', fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function LayerToggle({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      border: `1px solid ${active ? '#6366f1' : '#1e293b'}`,
      background: active ? 'rgba(99,102,241,0.18)' : 'transparent',
      color: active ? '#a5b4fc' : '#475569',
      cursor: 'pointer', transition: 'all .15s',
    }}>
      {active ? <Eye style={{ width: 11 }} /> : <EyeOff style={{ width: 11 }} />}
      {label}
    </button>
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
  const [activePanel,  setActivePanel]  = useState('overview'); // 'overview' | 'walls' | 'flags' | 'explain'
  const [layers, setLayers] = useState({ walls: true, rooms: true, openings: true, labels: true });

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get(`/analysis/${id}`);
        if (data.success) setAnalysis(data.analysis);
        else setError('Analysis not found.');
      } catch {
        setError('Failed to load analysis.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const report    = analysis?.report      || {};
  const sceneJson = report?.sceneJson     || analysis?.sceneJson || {};
  const walls     = sceneJson?.walls      || [];
  const rooms     = sceneJson?.rooms      || [];
  const openings  = sceneJson?.openings   || [];
  const materials = report?.materials     || [];
  const flags     = analysis?.structuralFlags || report?.structuralFlags || [];
  const explanation = report?.explanation || null;

  const imageUrl = analysis?.imageUrl
    ? `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5010'}${analysis.imageUrl}`
    : null;

  // Compute room areas
  const roomAreas = useMemo(() => {
    const map = {};
    rooms.forEach(r => {
      map[r.id] = computeRoomAreaM2(r.geometry?.vertices);
    });
    return map;
  }, [rooms]);

  const totalArea = useMemo(() => Object.values(roomAreas).reduce((s, a) => s + a, 0), [roomAreas]);
  const estimatedArea = useMemo(() => {
    if (totalArea > 0) return totalArea;
    return REAL_WIDTH_M * REAL_DEPTH_M; // Fallback bounding box
  }, [totalArea]);

  // Auto-center camera
  useEffect(() => {
    if (walls.length > 0) {
      const sumX = walls.reduce((s, w) => s + w.position[0], 0);
      const sumZ = walls.reduce((s, w) => s + w.position[2], 0);
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

  const toggleLayer = useCallback((key) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis-${id?.slice(-8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Loading / Error ── */
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1117' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #1e293b', borderTopColor: '#6366f1', animation: 'spin .8s linear infinite', margin: '0 auto 16px' }} />
        <span style={{ fontSize: 13, color: '#475569' }}>Loading analysis…</span>
      </div>
      <style>{`@keyframes spin { to { transform:rotate(360deg) }}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0d1117', color: '#fff' }}>
      <AlertCircle style={{ width: 40, height: 40, color: '#ef4444', marginBottom: 12 }} />
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>{error}</h2>
      <button onClick={() => navigate('/dashboard')} style={{ marginTop: 8, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>
        ← Back to Dashboard
      </button>
    </div>
  );

  const navTabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'walls',    label: 'Walls',    icon: Box        },
    { id: 'flags',    label: `Flags${flags.length ? ` (${flags.length})` : ''}`, icon: AlertTriangle },
    { id: 'explain',  label: 'Insights', icon: Lightbulb  },
  ];

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', system-ui, sans-serif", overflow: 'hidden', background: '#0d1117' }}>

      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <header style={{
        height: 52, background: 'rgba(13,17,23,0.95)', borderBottom: '1px solid #1e293b',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 14px', flexShrink: 0, backdropFilter: 'blur(8px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate('/dashboard')} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#64748b',
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500,
            padding: '5px 8px', borderRadius: 6, transition: 'all .15s',
          }}
            onMouseEnter={e => e.currentTarget.style.color = '#e2e8f0'}
            onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
          >
            <ArrowLeft style={{ width: 14 }} /> Dashboard
          </button>
          <span style={{ color: '#1e293b', fontSize: 18 }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Building2 style={{ width: 14, color: '#6366f1' }} />
            <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 13 }}>
              Analysis #{id?.slice(-8).toUpperCase()}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Layer toggles */}
          <LayerToggle label="Walls"    active={layers.walls}    onClick={() => toggleLayer('walls')}    />
          <LayerToggle label="Rooms"    active={layers.rooms}    onClick={() => toggleLayer('rooms')}    />
          <LayerToggle label="Doors"    active={layers.openings} onClick={() => toggleLayer('openings')} />
          <LayerToggle label="Labels"   active={layers.labels}   onClick={() => toggleLayer('labels')}   />

          <span style={{ color: '#1e293b', fontSize: 18, margin: '0 2px' }}>|</span>

          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
            background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}>
            <CheckCircle2 style={{ width: 9, display: 'inline', marginRight: 4 }} />Completed
          </span>

          <button onClick={handleExport} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600,
            background: 'rgba(30,41,59,0.8)', color: '#94a3b8', border: '1px solid #1e293b', cursor: 'pointer',
          }}>
            <Download style={{ width: 12 }} /> Export
          </button>

          <button onClick={handleDelete} disabled={deleting} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600,
            background: 'rgba(127,29,29,0.3)', color: '#fca5a5', border: '1px solid rgba(185,28,28,0.3)',
            cursor: deleting ? 'not-allowed' : 'pointer',
          }}>
            {deleting ? <Loader2 style={{ width: 12, animation: 'spin .8s linear infinite' }} /> : <Trash2 style={{ width: 12 }} />}
            Delete
          </button>
        </div>
      </header>

      {/* ── Main Layout ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left Panel */}
        <aside style={{ width: 320, background: '#0d1117', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

          {/* Floor plan image */}
          {imageUrl && (
            <div style={{ height: 120, overflow: 'hidden', borderBottom: '1px solid #1e293b', flexShrink: 0, position: 'relative' }}>
              <img src={imageUrl} alt="Floor plan" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(13,17,23,0.8) 0%, transparent 60%)' }} />
              <span style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Original Floor Plan</span>
            </div>
          )}

          {/* Panel nav tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
            {navTabs.map(tab => {
              const Icon = tab.icon;
              const active = activePanel === tab.id;
              return (
                <button key={tab.id} onClick={() => setActivePanel(tab.id)} style={{
                  flex: 1, padding: '8px 2px', fontSize: 9.5, fontWeight: 600,
                  background: active ? 'rgba(99,102,241,0.1)' : 'transparent',
                  color: active ? '#818cf8' : '#475569',
                  border: 'none', borderBottom: active ? '2px solid #6366f1' : '2px solid transparent',
                  cursor: 'pointer', transition: 'all .15s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                }}>
                  <Icon style={{ width: 12 }} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Panel content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px' }}>

            {/* OVERVIEW TAB */}
            {activePanel === 'overview' && (
              <>
                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 14 }}>
                  <StatCard icon={Box}       label="Walls"    value={walls.length}    color="#6366f1" />
                  <StatCard icon={Home}      label="Rooms"    value={rooms.length}    color="#10b981" />
                  <StatCard icon={DoorOpen}  label="Openings" value={openings.length} color="#3b82f6" />
                </div>

                {/* Area summary */}
                <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Ruler style={{ width: 13, color: '#6366f1' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc' }}>Area Analysis</span>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#f1f5f9', lineHeight: 1 }}>
                    {estimatedArea.toFixed(1)}
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b', marginLeft: 4 }}>m²</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    {totalArea > 0 ? 'Total usable floor area' : 'Estimated bounding area'}
                  </div>
                </div>

                {/* Per-room area breakdown */}
                {rooms.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <SectionTitle icon={Home}>Room Breakdown</SectionTitle>
                    {rooms.map((r, i) => {
                      const area = roomAreas[r.id] || 0;
                      const pct  = estimatedArea > 0 ? (area / estimatedArea) * 100 : 0;
                      const COLORS = ['#6366f1','#10b981','#3b82f6','#f59e0b','#ec4899','#8b5cf6'];
                      const col = COLORS[i % COLORS.length];
                      return (
                        <div key={r.id} style={{ marginBottom: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                            <span style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 500 }}>{r.label || `Room ${r.id}`}</span>
                            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{area.toFixed(1)} m²</span>
                          </div>
                          <div style={{ height: 4, background: '#1e293b', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 2 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Quick material summary */}
                {materials.length > 0 && (
                  <div>
                    <SectionTitle icon={BarChart3}>Top Materials</SectionTitle>
                    {materials.slice(0, 3).map((m, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: '#0f172a', border: '1px solid #1e293b', borderRadius: 7,
                        padding: '7px 10px', marginBottom: 5,
                      }}>
                        <span style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 500 }}>Wall {m.wallId}</span>
                        <span style={{ fontSize: 10, color: '#818cf8', background: 'rgba(99,102,241,0.15)', padding: '2px 7px', borderRadius: 10, fontWeight: 600 }}>
                          {m.options?.[0] || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* WALLS TAB */}
            {activePanel === 'walls' && (
              <>
                <SectionTitle icon={Box}>Wall Analysis</SectionTitle>
                {walls.length === 0
                  ? <p style={{ color: '#475569', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No walls detected</p>
                  : walls.map(w => {
                    const mat = materials.find(m => m.wallId === w.id);
                    return (
                      <WallCard
                        key={w.id} wall={w} material={mat}
                        selected={selectedWall === w.id}
                        onClick={() => setSelectedWall(prev => prev === w.id ? null : w.id)}
                      />
                    );
                  })
                }
              </>
            )}

            {/* FLAGS TAB */}
            {activePanel === 'flags' && (
              <>
                <SectionTitle icon={AlertTriangle}>Structural Flags</SectionTitle>
                {flags.length === 0 ? (
                  <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 style={{ width: 15, color: '#34d399', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#6ee7b7', fontWeight: 500 }}>No structural anomalies detected</span>
                  </div>
                ) : flags.map((f, i) => <FlagCard key={i} flag={f} />)}
              </>
            )}

            {/* INSIGHTS TAB */}
            {activePanel === 'explain' && (
              <>
                <SectionTitle icon={Lightbulb}>AI Insights & Explainability</SectionTitle>
                {explanation ? (
                  <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
                    <p style={{ margin: 0, fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{explanation}</p>
                  </div>
                ) : (
                  <div style={{ marginBottom: 12 }}>
                    {/* Auto-generated insights from data */}
                    {walls.length > 0 && (
                      <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
                        <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#818cf8' }}>Structural Summary</p>
                        <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', lineHeight: 1.75 }}>
                          This floor plan contains <strong style={{ color: '#f1f5f9' }}>{walls.length} walls</strong>,
                          of which <strong style={{ color: '#f59e0b' }}>{walls.filter(w => w.structural_type?.includes('load_bearing')).length} are load-bearing</strong>.
                          {rooms.length > 0 && ` There are ${rooms.length} identified rooms with a total usable area of approximately ${estimatedArea.toFixed(1)} m².`}
                        </p>
                      </div>
                    )}
                    {materials.length > 0 && (
                      <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
                        <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#34d399' }}>Material Recommendations</p>
                        <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', lineHeight: 1.75 }}>
                          The system recommends <strong style={{ color: '#f1f5f9' }}>{materials[0]?.options?.[0]}</strong> as the primary material
                          for load-bearing walls due to high strength and durability scores.
                          Partition walls may use lighter alternatives like AAC blocks for cost efficiency.
                        </p>
                      </div>
                    )}
                    {flags.length > 0 && (
                      <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 14px' }}>
                        <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#f87171' }}>Structural Warnings</p>
                        <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', lineHeight: 1.75 }}>
                          {flags.length} structural flag{flags.length !== 1 ? 's' : ''} detected.
                          Review the Flags tab for details. Immediate attention is recommended for any <strong style={{ color: '#f87171' }}>critical</strong> items.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Cost-Strength summary table */}
                {materials.length > 0 && (
                  <>
                    <SectionTitle icon={BarChart3}>Cost–Strength Tradeoff</SectionTitle>
                    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                        <thead>
                          <tr style={{ background: '#1e293b' }}>
                            {['Wall', 'Best Option', 'Strength', 'Cost', 'Score'].map(h => (
                              <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {materials.map((m, i) => (
                            <tr key={i} style={{ borderTop: '1px solid #1e293b' }}>
                              <td style={{ padding: '6px 8px', color: '#cbd5e1', fontWeight: 600 }}>{m.wallId}</td>
                              <td style={{ padding: '6px 8px', color: '#818cf8' }}>{m.options?.[0] || '—'}</td>
                              <td style={{ padding: '6px 8px', color: '#10b981' }}>{m.score?.strength ?? '—'}</td>
                              <td style={{ padding: '6px 8px', color: '#f59e0b' }}>{m.score?.cost ?? '—'}</td>
                              <td style={{ padding: '6px 8px', color: m.net_score >= 15 ? '#34d399' : '#fbbf24', fontWeight: 700 }}>{m.net_score ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </aside>

        {/* 3D Canvas */}
        <div style={{ flex: 1, position: 'relative' }}>

          {/* Legend */}
          <div style={{
            position: 'absolute', top: 12, left: 12, zIndex: 10,
            background: 'rgba(13,17,23,0.85)', backdropFilter: 'blur(8px)',
            border: '1px solid #1e293b', borderRadius: 8,
            padding: '8px 12px',
          }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Legend</span>
            {[
              { color: '#8B5E3C', label: 'Load-bearing outer' },
              { color: '#A0714F', label: 'Load-bearing spine' },
              { color: '#D4C5A9', label: 'Partition wall' },
              { color: '#34d399', label: 'Door opening' },
              { color: '#60a5fa', label: 'Window opening' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 10.5, color: '#94a3b8' }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Controls hint */}
          <div style={{
            position: 'absolute', bottom: 12, right: 12, zIndex: 10,
            background: 'rgba(13,17,23,0.8)', backdropFilter: 'blur(8px)',
            border: '1px solid #1e293b', borderRadius: 6,
            padding: '5px 10px', fontSize: 10.5, color: '#475569',
          }}>
            Drag: Orbit · Scroll: Zoom · Right-drag: Pan
          </div>

          {walls.length === 0 && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 5,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              color: '#475569', gap: 10,
            }}>
              <Layers style={{ width: 36, color: '#1e293b' }} />
              <span style={{ fontSize: 14 }}>No 3D geometry to display</span>
              <span style={{ fontSize: 12, color: '#334155' }}>The parser returned no walls for this image</span>
            </div>
          )}

          <Canvas
            shadows
            camera={{
              position: [camTarget[0] + REAL_WIDTH_M * 0.5, WALL_HEIGHT_M * 4.5, camTarget[2] + REAL_DEPTH_M * 0.8],
              fov: 42, near: 0.1, far: 600,
            }}
            gl={{ antialias: true }}
            style={{ width: '100%', height: '100%' }}
          >
            <FloorPlanScene
              sceneJson={sceneJson}
              selectedWall={selectedWall}
              onWallClick={(wid) => setSelectedWall(prev => prev === wid ? null : wid)}
              layers={layers}
              roomAreas={roomAreas}
            />
            <OrbitControls
              target={camTarget}
              makeDefault enableDamping dampingFactor={0.06}
              minDistance={2} maxDistance={80}
              maxPolarAngle={Math.PI / 2.05}
            />
          </Canvas>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
