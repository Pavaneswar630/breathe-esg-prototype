import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, Leaf, Activity, Zap, Plane, Database, TrendingUp, Clock, FileText, ChevronRight, X } from 'lucide-react';
import { esgApi } from '../services/api';
import DataGrid from './DataGrid';
 
const SOURCES = [
  {
    type: 'SAP',
    label: 'SAP Procurement',
    icon: Database,
    description: 'Raw AL11 CSV exports from your SAP ERP system.',
    hint: 'Accepts .csv files from SAP AL11 transaction exports',
    stat: '12.4k',
    statLabel: 'records this month',
    accent: '#1a1a1a',
  },
  {
    type: 'UTILITY',
    label: 'Utility Portal',
    icon: Zap,
    description: 'Electricity, gas, and water consumption data.',
    hint: 'Accepts .csv files from your utility provider portal',
    stat: '3.2k',
    statLabel: 'kWh tracked',
    accent: '#1a1a1a',
  },
  {
    type: 'CONCUR',
    label: 'Concur Travel',
    icon: Plane,
    description: 'Business travel and expense reports via SAP Concur.',
    hint: 'Accepts .csv files exported from SAP Concur',
    stat: '847',
    statLabel: 'trips this quarter',
    accent: '#1a1a1a',
  },
];
 
const RECENT_UPLOADS = [
  { name: 'sap_export_june_2025.csv', type: 'SAP', rows: 2341, time: '2h ago', status: 'success' },
  { name: 'utility_q2_2025.csv', type: 'UTILITY', rows: 890, time: '1d ago', status: 'success' },
  { name: 'concur_may_report.csv', type: 'CONCUR', rows: 412, time: '3d ago', status: 'success' },
  { name: 'sap_export_may_partial.csv', type: 'SAP', rows: 0, time: '5d ago', status: 'error' },
];
 
function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseInt(value.replace(/\D/g, ''));
    const duration = 900;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setDisplay(end); clearInterval(timer); }
      else setDisplay(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{display.toLocaleString()}{value.includes('k') ? '' : ''}</span>;
}
 
export default function Dashboard() {
  const [file, setFile] = useState(null);
  const [uploadType, setUploadType] = useState('SAP');
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('');
  
  // NEW: State to hold our live database records
  const [records, setRecords] = useState([]);
  const fileInputRef = useRef(null);

  // NEW: Fetch all records from Django
  const fetchRecords = async () => {
    try {
        const data = await esgApi.getRecords();
        setRecords(data);
    } catch (err) {
        console.error("Failed to load records", err);
    }
  };

  // NEW: Trigger fetch on load, and whenever an upload finishes
  useEffect(() => {
      fetchRecords();
  }, [result]);

  // --- LIVE DATA CALCULATIONS ---
  // We identify the source of the record based on the scope/category we defined in Django
  const utilityRecords = records.filter(r => r.scope_category === 'SCOPE_2');
  const concurRecords = records.filter(r => r.ghg_category?.includes('Travel'));
  // SAP is everything else (Scope 1 or Scope 3 Goods)
  const sapRecords = records.filter(r => r.scope_category === 'SCOPE_1' || (r.scope_category === 'SCOPE_3' && !r.ghg_category?.includes('Travel')));

  // Calculate the overall approval rate
  const totalRecords = records.length;
  const approvedRecords = records.filter(r => r.status === 'APPROVED').length;
  const approvalRate = totalRecords === 0 ? "0.0" : ((approvedRecords / totalRecords) * 100).toFixed(1);

  // Inject the real counts into your SOURCES array
  const LIVE_SOURCES = [
    {
      type: 'SAP',
      label: 'SAP Procurement',
      icon: Database,
      description: 'Raw AL11 CSV exports from your SAP ERP system.',
      hint: 'Accepts .csv files from SAP AL11 transaction exports',
      stat: sapRecords.length.toString(),
      statLabel: 'records parsed',
      accent: '#1a1a1a',
    },
    {
      type: 'UTILITY',
      label: 'Utility Portal',
      icon: Zap,
      description: 'Electricity, gas, and water consumption data.',
      hint: 'Accepts .csv files from your utility provider portal',
      stat: utilityRecords.length.toString(),
      statLabel: 'bills processed',
      accent: '#1a1a1a',
    },
    {
      type: 'CONCUR',
      label: 'Concur Travel',
      icon: Plane,
      description: 'Business travel and expense reports via SAP Concur.',
      hint: 'Accepts .csv files exported from SAP Concur',
      stat: concurRecords.length.toString(),
      statLabel: 'flights mapped',
      accent: '#1a1a1a',
    },
  ];

  const activeSource = LIVE_SOURCES.find(s => s.type === uploadType);
  const IconComponent = activeSource.icon;

  const handleFileChange = (e) => {
    const chosen = e.target.files[0];
    if (chosen) { setFile(chosen); setResult(null); setError(null); }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith('.csv') || dropped?.name.endsWith('.json')) { setFile(dropped); setResult(null); setError(null); }
  };

  const simulateProgress = () => {
    const stages = ['Validating schema…', 'Parsing rows…', 'Mapping emission factors…', 'Writing to ledger…'];
    let i = 0;
    setProgress(0);
    const interval = setInterval(() => {
      i++;
      setProgress(i * 25);
      setUploadStage(stages[i - 1] || '');
      if (i >= 4) clearInterval(interval);
    }, 400); // Sped up the animation slightly
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    simulateProgress();
    
    try {
      let data;
      if (uploadType === 'SAP') {
          data = await esgApi.uploadSAP(file);
      } else if (uploadType === 'UTILITY') {
          data = await esgApi.uploadUtility(file);
      } else if (uploadType === 'CONCUR') {
          data = await esgApi.uploadConcur(file);
      }
      setTimeout(() => { setResult(data); setIsUploading(false); }, 1800);
    } catch (err) {
      setTimeout(() => {
        setError(err.response?.data?.error || 'Failed to upload file to server.');
        setIsUploading(false);
      }, 1800);
    }
  };

  return (
    <div style={styles.root}>
      {/* Subtle grid background */}
      <div style={styles.gridBg} aria-hidden="true" />
 
      {/* Top bar */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logoMark}>
            <Leaf size={14} color="#fff" strokeWidth={2} />
          </div>
          <div>
            <span style={styles.brandName}>Breathe ESG</span>
            <span style={styles.brandPipe}>·</span>
            <span style={styles.brandRole}>Analyst Portal</span>
          </div>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.statusPill}>
            <span style={styles.statusDot} />
            <span style={styles.statusText}>Ledger Online</span>
          </div>
          <div style={styles.avatarRing}>
            <span style={styles.avatarText}>A</span>
          </div>
        </div>
      </header>
 
      <main style={styles.main}>
 
        {/* Page title row */}
        <div style={styles.pageTitle}>
          <div>
            <h1 style={styles.h1}>Data Ingestion</h1>
            <p style={styles.pageDesc}>Upload source files to the emissions ledger. All data is validated, mapped, and stored in accordance with GHG Protocol scope boundaries.</p>
          </div>
          <div style={styles.topStats}>
            <div style={styles.topStat}>
              <TrendingUp size={13} color="#888" />
              <span style={styles.topStatVal}>{approvalRate}%</span>
              <span style={styles.topStatLabel}>approval rate</span>
            </div>
            <div style={styles.topStatDivider} />
            <div style={styles.topStat}>
              <Activity size={13} color="#888" />
              <span style={styles.topStatVal}>{totalRecords}</span>
              <span style={styles.topStatLabel}>total records</span>
            </div>
          </div>
        </div>
 
        <div style={styles.twoCol}>
          {/* LEFT — source selector + upload */}
          <div style={styles.leftCol}>
 
            {/* Source tabs */}
            <div style={styles.sectionLabel}>Select data source</div>
            <div style={styles.sourceGrid}>
              {LIVE_SOURCES.map(src => {
                const Ic = src.icon;
                const active = uploadType === src.type;
                return (
                  <button
                    key={src.type}
                    onClick={() => { setUploadType(src.type); setFile(null); setResult(null); setError(null); }}
                    style={{ ...styles.sourceCard, ...(active ? styles.sourceCardActive : {}) }}
                  >
                    <div style={{ ...styles.sourceIconBox, ...(active ? styles.sourceIconBoxActive : {}) }}>
                      <Ic size={15} color={active ? '#fff' : '#888'} strokeWidth={1.5} />
                    </div>
                    <div style={styles.sourceCardBody}>
                      <span style={{ ...styles.sourceCardLabel, ...(active ? { color: '#0f0f0f' } : {}) }}>{src.label}</span>
                      <span style={styles.sourceCardDesc}>{src.description}</span>
                    </div>
                    {active && <ChevronRight size={14} color="#aaa" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
 
            {/* Drop zone */}
            <div style={styles.sectionLabel} id="uploadZone">Drop zone</div>
            <div
              style={{ ...styles.dropZone, ...(dragOver ? styles.dropZoneActive : {}), ...(file ? styles.dropZoneHasFile : {}) }}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input type="file" accept=".csv" onChange={handleFileChange} ref={fileInputRef} style={{ display: 'none' }} />
 
              {file ? (
                <div style={styles.filePreview}>
                  <div style={styles.fileIcon}>
                    <FileText size={22} color="#1a1a1a" strokeWidth={1.5} />
                  </div>
                  <div style={styles.fileInfo}>
                    <span style={styles.fileName}>{file.name}</span>
                    <span style={styles.fileSize}>{(file.size / 1024).toFixed(1)} KB · CSV</span>
                  </div>
                  <button
                    style={styles.removeFile}
                    onClick={e => { e.stopPropagation(); setFile(null); setResult(null); setError(null); }}
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <div style={styles.dropInner}>
                  <div style={styles.dropIconRing}>
                    <UploadCloud size={20} color={dragOver ? '#1a1a1a' : '#bbb'} strokeWidth={1.5} />
                  </div>
                  <p style={styles.dropMain}>Drop CSV here, or <span style={styles.dropLink}>browse</span></p>
                  <p style={styles.dropHint}>{activeSource.hint}</p>
                </div>
              )}
            </div>
 
            {/* Upload button + progress */}
            {isUploading ? (
              <div style={styles.progressWrap}>
                <div style={styles.progressHeader}>
                  <span style={styles.progressStage}>{uploadStage}</span>
                  <span style={styles.progressPct}>{progress}%</span>
                </div>
                <div style={styles.progressTrack}>
                  <div style={{ ...styles.progressFill, width: `${progress}%` }} />
                </div>
              </div>
            ) : (
              <button
                onClick={handleUpload}
                disabled={!file}
                style={{ ...styles.uploadBtn, ...(!file ? styles.uploadBtnDisabled : {}) }}
              >
                <UploadCloud size={15} strokeWidth={2} />
                Upload to Ledger
              </button>
            )}
 
            {/* Feedback */}
            {result && !isUploading && (
              <div style={styles.feedbackSuccess}>
                <CheckCircle size={16} color="#166534" strokeWidth={1.5} />
                <div>
                  <p style={styles.feedbackTitle}>Ingestion complete</p>
                  <div style={styles.feedbackPills}>
                    <span style={styles.pill}>Job {result.job_id}</span>
                    <span style={styles.pill}>{result.records_processed?.toLocaleString()} rows</span>
                    <span style={styles.pill}>{uploadType}</span>
                  </div>
                </div>
              </div>
            )}
            {error && !isUploading && (
              <div style={styles.feedbackError}>
                <AlertTriangle size={16} color="#991b1b" strokeWidth={1.5} />
                <div>
                  <p style={styles.feedbackTitle}>Upload failed</p>
                  <p style={styles.feedbackDesc}>{error}</p>
                </div>
              </div>
            )}
          </div>
 
          {/* RIGHT — info panel */}
          <div style={styles.rightCol}>
 
            {/* Active source stat card */}
            <div style={styles.statCard}>
              <div style={styles.statCardTop}>
                <div style={styles.statCardIconBox}>
                  <IconComponent size={16} color="#fff" strokeWidth={1.5} />
                </div>
                <span style={styles.statCardType}>{activeSource.label}</span>
              </div>
              <div style={styles.statCardValue}>
                <AnimatedNumber value={activeSource.stat} />
                {activeSource.stat.includes('k') && <span style={styles.statK}>k</span>}
              </div>
              <p style={styles.statCardLabel}>{activeSource.statLabel}</p>
              <div style={styles.statCardBar}>
                <div style={{ ...styles.statCardBarFill, width: uploadType === 'SAP' ? '74%' : uploadType === 'UTILITY' ? '42%' : '28%' }} />
              </div>
            </div>
 
            {/* Recent uploads */}
            <div style={styles.recentCard}>
              <div style={styles.recentHeader}>
                <span style={styles.recentTitle}>Recent uploads</span>
                <Clock size={13} color="#bbb" />
              </div>
              <div style={styles.recentList}>
                {RECENT_UPLOADS.map((u, i) => (
                  <div key={i} style={styles.recentRow}>
                    <div style={{ ...styles.recentDot, background: u.status === 'success' ? '#166534' : '#991b1b' }} />
                    <div style={styles.recentInfo}>
                      <span style={styles.recentName}>{u.name}</span>
                      <span style={styles.recentMeta}>{u.type} · {u.rows > 0 ? `${u.rows.toLocaleString()} rows` : 'failed'} · {u.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
 
            {/* Protocol badge */}
            <div style={styles.protocolCard}>
              <div style={styles.protocolRow}>
                <Leaf size={13} color="#166534" />
                <span style={styles.protocolText}>GHG Protocol aligned · Scope 1, 2 &amp; 3</span>
              </div>
              <div style={styles.protocolRow}>
                <Activity size={13} color="#166534" />
                <span style={styles.protocolText}>Emission factors: DEFRA 2024, EPA 2024</span>
              </div>
            </div>
 
          </div>
        </div>
 
        {/* Data grid */}
        <div style={styles.gridSection}>
          <div style={styles.gridHeader}>
            <span style={styles.gridTitle}>Emission Records</span>
            <span style={styles.gridBadge}>Ledger</span>
          </div>
          <DataGrid records={records} onRefresh={fetchRecords} />
        </div>
 
      </main>
    </div>
  );
}
 
const styles = {
  root: {
    minHeight: '100vh',
    background: '#f7f7f5',
    fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
    position: 'relative',
    color: '#0f0f0f',
  },
  gridBg: {
    position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
    backgroundImage: `
      linear-gradient(rgba(0,0,0,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,0,0,0.025) 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px',
  },
  header: {
    position: 'sticky', top: 0, zIndex: 100,
    background: 'rgba(247,247,245,0.85)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(0,0,0,0.07)',
    padding: '0 32px',
    height: 56,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  logoMark: {
    width: 28, height: 28, borderRadius: 8,
    background: '#1a1a1a',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  brandName: { fontSize: 14, fontWeight: 600, color: '#0f0f0f', letterSpacing: '-0.01em' },
  brandPipe: { fontSize: 14, color: '#ccc', margin: '0 6px' },
  brandRole: { fontSize: 13, color: '#888' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12 },
  statusPill: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: '#f0fdf4', border: '1px solid #bbf7d0',
    borderRadius: 20, padding: '4px 10px',
  },
  statusDot: { width: 6, height: 6, borderRadius: '50%', background: '#16a34a' },
  statusText: { fontSize: 12, color: '#166534', fontWeight: 500 },
  avatarRing: {
    width: 30, height: 30, borderRadius: '50%',
    background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 12, color: '#fff', fontWeight: 600 },
  main: { position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '40px 32px 80px' },
  pageTitle: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36, gap: 24 },
  h1: { fontSize: 26, fontWeight: 600, letterSpacing: '-0.03em', color: '#0f0f0f', margin: '0 0 6px' },
  pageDesc: { fontSize: 13, color: '#888', lineHeight: 1.6, maxWidth: 460, margin: 0 },
  topStats: { display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, marginTop: 4 },
  topStat: { display: 'flex', alignItems: 'center', gap: 5 },
  topStatVal: { fontSize: 14, fontWeight: 600, color: '#0f0f0f' },
  topStatLabel: { fontSize: 12, color: '#aaa' },
  topStatDivider: { width: 1, height: 16, background: '#e5e5e5' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' },
  leftCol: { display: 'flex', flexDirection: 'column', gap: 14 },
  rightCol: { display: 'flex', flexDirection: 'column', gap: 14 },
  sectionLabel: { fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#aaa', textTransform: 'uppercase' },
  sourceGrid: { display: 'flex', flexDirection: 'column', gap: 8 },
  sourceCard: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: '#fff', border: '1px solid #ebebeb',
    borderRadius: 12, padding: '12px 14px',
    cursor: 'pointer', textAlign: 'left',
    transition: 'all 0.15s ease',
    outline: 'none',
  },
  sourceCardActive: {
    border: '1px solid #d4d4d4',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  sourceIconBox: {
    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
    background: '#f5f5f5',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  sourceIconBoxActive: { background: '#1a1a1a' },
  sourceCardBody: { display: 'flex', flexDirection: 'column', gap: 1 },
  sourceCardLabel: { fontSize: 13, fontWeight: 500, color: '#555' },
  sourceCardDesc: { fontSize: 12, color: '#aaa' },
  dropZone: {
    background: '#fff', border: '1.5px dashed #e0e0e0',
    borderRadius: 14, padding: '36px 24px',
    cursor: 'pointer', transition: 'all 0.18s ease',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  dropZoneActive: { border: '1.5px dashed #1a1a1a', background: '#fafafa' },
  dropZoneHasFile: { padding: '16px 20px', border: '1.5px solid #ebebeb' },
  dropInner: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' },
  dropIconRing: {
    width: 48, height: 48, borderRadius: '50%',
    border: '1.5px dashed #ddd',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  dropMain: { fontSize: 14, color: '#555', margin: 0, fontWeight: 400 },
  dropLink: { fontWeight: 500, color: '#1a1a1a', textDecoration: 'underline', textDecorationColor: '#ccc' },
  dropHint: { fontSize: 12, color: '#bbb', margin: 0 },
  filePreview: { display: 'flex', alignItems: 'center', gap: 12, width: '100%' },
  fileIcon: {
    width: 40, height: 40, borderRadius: 10, background: '#f5f5f5',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  fileInfo: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
  fileName: { fontSize: 13, fontWeight: 500, color: '#0f0f0f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 },
  fileSize: { fontSize: 12, color: '#aaa' },
  removeFile: {
    marginLeft: 'auto', background: 'none', border: '1px solid #ebebeb',
    borderRadius: 6, padding: '4px 6px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', color: '#aaa',
  },
  progressWrap: { display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 0' },
  progressHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  progressStage: { fontSize: 12, color: '#888' },
  progressPct: { fontSize: 12, fontWeight: 600, color: '#1a1a1a' },
  progressTrack: { height: 4, background: '#ebebeb', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', background: '#1a1a1a', borderRadius: 4, transition: 'width 0.45s ease' },
  uploadBtn: {
    width: '100%', padding: '12px 20px',
    background: '#1a1a1a', color: '#fff',
    border: 'none', borderRadius: 10,
    fontSize: 14, fontWeight: 500,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    transition: 'opacity 0.15s',
  },
  uploadBtnDisabled: { opacity: 0.3, cursor: 'not-allowed' },
  feedbackSuccess: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    background: '#f0fdf4', border: '1px solid #bbf7d0',
    borderRadius: 10, padding: '12px 14px',
  },
  feedbackError: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    background: '#fef2f2', border: '1px solid #fecaca',
    borderRadius: 10, padding: '12px 14px',
  },
  feedbackTitle: { fontSize: 13, fontWeight: 600, margin: '0 0 6px', color: '#0f0f0f' },
  feedbackDesc: { fontSize: 12, color: '#888', margin: 0 },
  feedbackPills: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  pill: {
    fontSize: 11, padding: '2px 8px',
    background: '#fff', border: '1px solid #e5e5e5',
    borderRadius: 20, color: '#555',
  },
  statCard: {
    background: '#1a1a1a', borderRadius: 14,
    padding: '20px', color: '#fff',
  },
  statCardTop: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 },
  statCardIconBox: {
    width: 30, height: 30, borderRadius: 8,
    background: 'rgba(255,255,255,0.12)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  statCardType: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 500 },
  statCardValue: { fontSize: 36, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, display: 'flex', alignItems: 'baseline', gap: 2 },
  statK: { fontSize: 20, fontWeight: 600, color: 'rgba(255,255,255,0.5)' },
  statCardLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '6px 0 16px' },
  statCardBar: { height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  statCardBarFill: { height: '100%', background: 'rgba(255,255,255,0.4)', borderRadius: 3, transition: 'width 0.6s ease' },
  recentCard: {
    background: '#fff', border: '1px solid #ebebeb',
    borderRadius: 14, padding: '16px',
  },
  recentHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  recentTitle: { fontSize: 12, fontWeight: 600, color: '#0f0f0f', letterSpacing: '-0.01em' },
  recentList: { display: 'flex', flexDirection: 'column', gap: 12 },
  recentRow: { display: 'flex', alignItems: 'flex-start', gap: 10 },
  recentDot: { width: 6, height: 6, borderRadius: '50%', marginTop: 4, flexShrink: 0 },
  recentInfo: { display: 'flex', flexDirection: 'column', gap: 2 },
  recentName: { fontSize: 12, fontWeight: 500, color: '#0f0f0f', lineHeight: 1.3 },
  recentMeta: { fontSize: 11, color: '#bbb' },
  protocolCard: {
    background: '#f0fdf4', border: '1px solid #bbf7d0',
    borderRadius: 12, padding: '14px',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  protocolRow: { display: 'flex', alignItems: 'center', gap: 8 },
  protocolText: { fontSize: 12, color: '#166534' },
  gridSection: { marginTop: 40 },
  gridHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  gridTitle: { fontSize: 14, fontWeight: 600, letterSpacing: '-0.02em', color: '#0f0f0f' },
  gridBadge: {
    fontSize: 11, padding: '3px 10px',
    background: '#f5f5f5', border: '1px solid #e5e5e5',
    borderRadius: 20, color: '#888',
  },
};