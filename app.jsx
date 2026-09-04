const { useState, useEffect, useMemo, useRef } = React;

// Integrated Regional Google Sheets Configuration (Coimbatore, Erode, Vellore, Tiruppur, Cuddalore)
const DEFAULT_4_REGIONS = [
  { 
    id: 'coimbatore', 
    name: 'Coimbatore Region', 
    sheetId: '19hEpNyOUgLCEmq5_QZqF60c7u1ph2QkueCPEpXx63oc',
    url: 'https://docs.google.com/spreadsheets/d/19hEpNyOUgLCEmq5_QZqF60c7u1ph2QkueCPEpXx63oc/edit'
  },
  { 
    id: 'erode', 
    name: 'Erode Region', 
    sheetId: '1mVbu_aqdxKVI7TCaNnsHXQ6ab1TFjDEip7AKhtsEQ8Y',
    url: 'https://docs.google.com/spreadsheets/d/1mVbu_aqdxKVI7TCaNnsHXQ6ab1TFjDEip7AKhtsEQ8Y/edit'
  },
  { 
    id: 'vellore', 
    name: 'Vellore Region', 
    sheetId: '1WyFV4gLhH7Y6D6GiM7Jj2iAcj8KobNMvWY-_sgqxSoE',
    url: 'https://docs.google.com/spreadsheets/d/1WyFV4gLhH7Y6D6GiM7Jj2iAcj8KobNMvWY-_sgqxSoE/edit?gid=0#gid=0'
  },
  { 
    id: 'tiruppur', 
    name: 'Tiruppur Region', 
    sheetId: '1bPDHWkcnpJPM0wwtooGPR_JubRtO3RNB7e-5fWd-dbo',
    url: 'https://docs.google.com/spreadsheets/d/1bPDHWkcnpJPM0wwtooGPR_JubRtO3RNB7e-5fWd-dbo/edit?gid=0#gid=0'
  },
  {
    id: 'cuddalore',
    name: 'Cuddalore Region',
    sheetId: '',
    url: ''
  }
];

// Fixed Brand & Semantic Color Mapping for each Lamp Wattage
const WATTAGE_COLORS = {
  '15W': '#10b981',       // Emerald
  '20W': '#14b8a6',       // Teal
  '24W': '#2dd4bf',       // Light Teal
  '25W': '#06b6d4',       // Cyan
  '30W': '#38bdf8',       // Sky Blue
  '36W': '#60a5fa',       // Blue 400
  '40W': '#3b82f6',       // Royal Blue
  '50W': '#6366f1',       // Indigo
  '60W': '#8b5cf6',       // Purple
  '70W': '#a855f7',       // Purple 500
  '72W': '#d946ef',       // Fuchsia
  '80W': '#ec4899',       // Pink
  '90W': '#f43f5e',       // Rose
  '100W': '#ef4444',      // Red
  '120W': '#f97316',      // Orange
  '150W': '#f59e0b',      // Amber
  '200W': '#eab308',      // Yellow
  '250W': '#84cc16',      // Lime
  'Unspecified': '#64748b'// Unspecified / Other -> Slate Gray
};

// Universal Wattage Normalization (e.g. 20, 20.0, 20w, 20W, 20ww, 20WW -> 20W; 120, 120.0, 120w, 120W, 120ww -> 120W)
const normalizeWattage = (wattStr) => {
  if (wattStr === null || wattStr === undefined || wattStr === '') return 'Unspecified';
  const str = String(wattStr).trim().toUpperCase();
  if (str === 'UNSPECIFIED' || str === 'UNKNOWN' || str === 'OTHER' || str === 'NONE') return 'Unspecified';
  
  const match = str.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    const num = Math.round(parseFloat(match[1]));
    if (num > 0) {
      return `${num}W`;
    }
  }
  return 'Unspecified';
};

const getWattageColor = (wattStr) => {
  const norm = normalizeWattage(wattStr);
  if (WATTAGE_COLORS[norm]) return WATTAGE_COLORS[norm];
  
  const num = parseInt(norm.replace(/\D/g, '')) || 0;
  if (num > 0) {
    const hue = (num * 37) % 360;
    return `hsl(${hue}, 75%, 60%)`;
  }
  return '#64748b';
};

// Complaint Type Descriptions
const COMPLAINT_TYPE_LABELS = {
  'FC': 'Fitting Change (FC) - Lamp / Fitting Replacement',
  'RC': 'Repair & Component Replacement (RC)',
  'Jumper Cut': 'Jumper Wire Cut / Disconnected',
  'Switch Fault': 'Switch / Control Box Failure',
  'SLC': 'Smart Light Controller (SLC) Issue',
  'Line Short': 'Overhead / Underground Line Short',
  'NB': 'Neutral Break / Voltage Drop (NB)'
};

// Zone Normalization Rule (Combines CBE-North/North -> North, CBE-West/West -> West, CBE-South/South -> South)
const normalizeZone = (zoneStr) => {
  if (!zoneStr) return 'Unknown Zone';
  const z = String(zoneStr).trim().toUpperCase();
  if (z.includes('NORTH')) return 'North';
  if (z.includes('WEST')) return 'West';
  if (z.includes('SOUTH')) return 'South';
  if (z.includes('EAST')) return 'East';
  if (z.includes('CENTRAL')) return 'Central';
  return String(zoneStr).trim();
};

// Month Extractor Helper ("Jan 2026")
const getMonthKey = (dateStr) => {
  if (!dateStr) return 'Other';
  const s = String(dateStr).trim();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Format 1: YYYY-MM-DD or YYYY/MM/DD
  const m1 = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m1) {
    const y = parseInt(m1[1], 10);
    const m = parseInt(m1[2], 10);
    if (m >= 1 && m <= 12) return `${monthNames[m - 1]} ${y}`;
  }

  // Format 2: M/D/YYYY or MM/DD/YYYY
  const m2 = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m2) {
    const m = parseInt(m2[1], 10);
    const y = parseInt(m2[3], 10);
    if (m >= 1 && m <= 12) return `${monthNames[m - 1]} ${y}`;
  }

  // Format 3: Google Sheets Date(y, m, d)
  const m3 = s.match(/Date\((\d{4}),(\d{1,2})/);
  if (m3) {
    const y = parseInt(m3[1], 10);
    const m = parseInt(m3[2], 10) + 1;
    if (m >= 1 && m <= 12) return `${monthNames[m - 1]} ${y}`;
  }

  return 'Other';
};

// Week Extractor Helper ("Week 1 (Day 1-7)", "Week 2 (Day 8-14)", etc.)
const getWeekKey = (dateStr) => {
  if (!dateStr) return 'Week 1 (Day 1-7)';
  const s = String(dateStr).trim();
  let day = null;

  // Format 1: YYYY-MM-DD or YYYY/MM/DD
  const m1 = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m1) {
    day = parseInt(m1[3], 10);
  } else {
    // Format 2: M/D/YYYY or MM/DD/YYYY
    const m2 = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (m2) {
      day = parseInt(m2[2], 10);
    } else {
      // Format 3: Google Sheets Date(y, m, d)
      const m3 = s.match(/Date\((\d{4}),(\d{1,2}),(\d{1,2})/);
      if (m3) {
        day = parseInt(m3[3], 10);
      }
    }
  }

  if (day === null || isNaN(day) || day < 1 || day > 31) return 'Week 1 (Day 1-7)';
  if (day <= 7) return 'Week 1 (Day 1-7)';
  if (day <= 14) return 'Week 2 (Day 8-14)';
  if (day <= 21) return 'Week 3 (Day 15-21)';
  if (day <= 28) return 'Week 4 (Day 22-28)';
  return 'Week 5 (Day 29-31)';
};

// Precise Date Normalizer into ISO YYYY-MM-DD
const parseDateToISO = (dateStr) => {
  if (!dateStr) return null;
  if (typeof dateStr === 'number') {
    const d = new Date((dateStr - (25567 + 2)) * 86400 * 1000);
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
  }
  const s = String(dateStr).trim();

  // Format 1: YYYY-MM-DD or YYYY/MM/DD
  const m1 = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m1) {
    return `${m1[1]}-${m1[2].padStart(2, '0')}-${m1[3].padStart(2, '0')}`;
  }

  // Format 2: M/D/YYYY or D/M/YYYY
  const m2 = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m2) {
    const num1 = parseInt(m2[1], 10);
    const num2 = parseInt(m2[2], 10);
    const y = m2[3];
    if (num1 > 12 && num2 <= 12) {
      return `${y}-${String(num2).padStart(2, '0')}-${String(num1).padStart(2, '0')}`;
    } else {
      return `${y}-${String(num1).padStart(2, '0')}-${String(num2).padStart(2, '0')}`;
    }
  }

  // Format 3: Google Sheets Date(y, m, d)
  const m3 = s.match(/Date\((\d{4}),(\d{1,2}),(\d{1,2})/);
  if (m3) {
    return `${m3[1]}-${String(parseInt(m3[2], 10) + 1).padStart(2, '0')}-${m3[3].padStart(2, '0')}`;
  }

  return null;
};

function App() {
  const [activeTab, setActiveTab] = useState('fc_centric');
  const [rawTickets, setRawTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [regionStatusMsg, setRegionStatusMsg] = useState(null);
  const [error, setError] = useState(null);

  // 4 Regional Sheets State (Coimbatore, Erode, Vellore, Tiruppur)
  const [regions, setRegions] = useState(() => {
    try {
      const saved = localStorage.getItem('appsheet_fc_4_regions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some(r => r.id === 'coimbatore')) {
          // Merge with DEFAULT_4_REGIONS so newly added default URLs/IDs are automatically populated
          const merged = DEFAULT_4_REGIONS.map(def => {
            const found = parsed.find(p => p.id === def.id);
            if (!found) return def;
            if (!found.sheetId || found.sheetId.includes('PASTE_') || !found.url) {
              return { ...found, sheetId: def.sheetId, url: def.url };
            }
            return found;
          }).concat(parsed.filter(p => !DEFAULT_4_REGIONS.some(def => def.id === p.id)));
          return merged;
        }
      }
    } catch(e) {}
    return DEFAULT_4_REGIONS;
  });

  // Focus Mode State (FC Centric vs All)
  const [fcFocusOnly, setFcFocusOnly] = useState(true);

  // Region State (Default Coimbatore Region)
  const [selectedRegion, setSelectedRegion] = useState('coimbatore');
  
  // Data Source & Live Sync State
  const [dataSource, setDataSource] = useState('sheets');
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [googleSheetId, setGoogleSheetId] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [googleRange, setGoogleRange] = useState('A1:Z10000');
  const [appSheetId, setAppSheetId] = useState('O-MCoimbatore-3851427');
  const [appSheetTable, setAppSheetTable] = useState('Coimbatore Fault Tickets');
  const [appSheetKey, setAppSheetKey] = useState('V2-x6P8J-cECOL-7Y1yo-tA9eD-NieVR-1EvXv-cZMiP-9ZDBI');
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(new Date().toLocaleTimeString());
  const [isSyncing, setIsSyncing] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [datePreset, setDatePreset] = useState('all');
  const [filterMonth, setFilterMonth] = useState('ALL');
  const [filterComplaintType, setFilterComplaintType] = useState('ALL');
  const [filterWorkStatus, setFilterWorkStatus] = useState('ALL');
  const [filterZone, setFilterZone] = useState('ALL');
  const [filterWattage, setFilterWattage] = useState('ALL');
  const [trendViewMode, setTrendViewMode] = useState('both'); // 'both', 'fc', 'total'
  const isDateRangeActive = Boolean(filterFromDate || filterToDate);

  // Date Presets Handler
  const applyDatePreset = (preset) => {
    setDatePreset(preset);
    setFilterMonth('ALL');
    setCurrentPage(1);
    const today = new Date();
    const formatISO = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    if (preset === 'all') {
      setFilterFromDate('');
      setFilterToDate('');
    } else if (preset === 'today') {
      const todayStr = formatISO(today);
      setFilterFromDate(todayStr);
      setFilterToDate(todayStr);
    } else if (preset === 'last7') {
      const from = new Date(today);
      from.setDate(today.getDate() - 7);
      setFilterFromDate(formatISO(from));
      setFilterToDate(formatISO(today));
    } else if (preset === 'last30') {
      const from = new Date(today);
      from.setDate(today.getDate() - 30);
      setFilterFromDate(formatISO(from));
      setFilterToDate(formatISO(today));
    } else if (preset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setFilterFromDate(formatISO(firstDay));
      setFilterToDate(formatISO(today));
    } else if (preset === 'last_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      setFilterFromDate(formatISO(firstDay));
      setFilterToDate(formatISO(lastDay));
    }
  };

  const resetAllFilters = () => {
    setSearchQuery('');
    setInwardSearch('');
    setFilterMonth('ALL');
    setFilterFromDate('');
    setFilterToDate('');
    setDatePreset('all');
    setFilterComplaintType('ALL');
    setFilterWorkStatus('ALL');
    setInwardStatusFilter('ALL');
    setFilterZone('ALL');
    setFilterWattage('ALL');
    setInwardWattFilter('ALL');
    setInwardMakeFilter('ALL');
    setCurrentPage(1);
    setInwardPage(1);
  };
  
  // Modal & Add Region State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showAddRegionForm, setShowAddRegionForm] = useState(false);
  const [newRegionName, setNewRegionName] = useState('');
  const [newRegionUrl, setNewRegionUrl] = useState('');

  const handleAddRegion = () => {
    if (!newRegionName.trim()) {
      alert('Please enter a Region Name');
      return;
    }
    const cleanUrl = newRegionUrl.trim();
    let sheetId = cleanUrl;
    const match = cleanUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      sheetId = match[1];
    }

    const newRegionObj = {
      id: `region_${Date.now()}`,
      name: newRegionName.trim(),
      sheetId: sheetId,
      url: cleanUrl
    };

    const updatedRegions = [...regions, newRegionObj];
    setRegions(updatedRegions);
    localStorage.setItem('appsheet_fc_4_regions', JSON.stringify(updatedRegions));
    
    setNewRegionName('');
    setNewRegionUrl('');
    setShowAddRegionForm(false);
  };

  const handleDeleteRegion = (idToDelete) => {
    if (regions.length <= 1) {
      alert('You must keep at least one region.');
      return;
    }
    const updatedRegions = regions.filter(r => r.id !== idToDelete);
    setRegions(updatedRegions);
    localStorage.setItem('appsheet_fc_4_regions', JSON.stringify(updatedRegions));
    if (selectedRegion === idToDelete) {
      setSelectedRegion(updatedRegions[0].id);
    }
  };

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Inward & FC Return Register State (Focus Regions: Coimbatore, Erode, Tiruppur, Vellore)
  const [inwardData, setInwardData] = useState([]);
  const [inwardLoading, setInwardLoading] = useState(false);
  const [inwardSelectedRegion, setInwardSelectedRegion] = useState('COIMBATORE'); // 'ALL', 'COIMBATORE', 'ERODE', 'TIRUPPUR', 'VELLORE'
  const [inwardSearch, setInwardSearch] = useState('');
  const [inwardStatusFilter, setInwardStatusFilter] = useState('ALL');
  const [inwardWattFilter, setInwardWattFilter] = useState('ALL');
  const [inwardMakeFilter, setInwardMakeFilter] = useState('ALL');
  const [inwardPage, setInwardPage] = useState(1);
  const inwardPageSize = 12;

  // -------------------------------------------------------------
  // UNIVERSAL GLOBAL FILTER & REGION SYNCHRONIZATION HANDLERS
  // -------------------------------------------------------------
  const handleGlobalRegionChange = (newRegionId) => {
    if (!newRegionId) return;
    const lower = newRegionId.toLowerCase();
    const upper = newRegionId.toUpperCase();

    if (upper === 'ALL' || lower === 'all') {
      setSelectedRegion('all');
      setInwardSelectedRegion('ALL');
    } else {
      setSelectedRegion(lower);
      setInwardSelectedRegion(upper);
    }
    setCurrentPage(1);
    setInwardPage(1);
  };

  const handleGlobalWattageChange = (watt) => {
    if (!watt || watt === 'ALL') {
      setFilterWattage('ALL');
      setInwardWattFilter('ALL');
    } else {
      const norm = normalizeWattage(watt);
      setFilterWattage(norm);
      setInwardWattFilter(norm);
    }
    setCurrentPage(1);
    setInwardPage(1);
  };

  const handleGlobalStatusChange = (status) => {
    setFilterWorkStatus(status);
    if (status === 'ALL') {
      setInwardStatusFilter('ALL');
    } else if (status === 'Completed' || status === 'COMPLETED') {
      setInwardStatusFilter('COMPLETED');
    } else if (status.includes('Hold') || status === 'PENDING') {
      setInwardStatusFilter('PENDING');
    }
    setCurrentPage(1);
    setInwardPage(1);
  };

  const handleGlobalSearchChange = (query) => {
    setSearchQuery(query);
    setInwardSearch(query);
    setCurrentPage(1);
    setInwardPage(1);
  };

  const handleGlobalMonthChange = (month) => {
    setFilterMonth(month);
    setCurrentPage(1);
    setInwardPage(1);
  };

  // Regional FC Ticket Summaries (Pre-aggregated Field Demand)
  const [regionalFcSummary, setRegionalFcSummary] = useState({});

  // Chart Refs
  const fcMonthTrendChartRef = useRef(null);
  const fcMonthWattageChartRef = useRef(null);
  const fcWattageChartRef = useRef(null);
  const fcZoneChartRef = useRef(null);
  const complaintChartRef = useRef(null);
  const materialChartRef = useRef(null);

  // Inward Chart Refs
  const inwardMonthChartRef = useRef(null);
  const inwardWattChartRef = useRef(null);
  const inwardMakeChartRef = useRef(null);

  // Cross-Comparison Chart Refs (FC Tickets vs Inward Materials)
  const comparisonWattChartRef = useRef(null);
  const comparisonMonthChartRef = useRef(null);

  const chartInstances = useRef({});

  // Initial Fetch of Inward Register Dataset & Regional FC Summary
  useEffect(() => {
    const fetchInwardAndSummary = async () => {
      setInwardLoading(true);
      try {
        const [res1, res2] = await Promise.allSettled([
          fetch(`/api/inward-data?t=${Date.now()}`).then(r => r.ok ? r.json() : fetch(`inward_register_data.json?t=${Date.now()}`).then(r2 => r2.json())),
          fetch(`/api/regional-fc-summary?t=${Date.now()}`).then(r => r.ok ? r.json() : fetch(`regional_fc_summary.json?t=${Date.now()}`).then(r2 => r2.json()))
        ]);

        if (res1.status === 'fulfilled' && res1.value) {
          setInwardData(res1.value);
        }
        if (res2.status === 'fulfilled' && res2.value) {
          setRegionalFcSummary(res2.value);
        }
      } catch (err) {
        console.error('Failed to load inward data or regional summary:', err);
      } finally {
        setInwardLoading(false);
      }
    };
    fetchInwardAndSummary();
  }, []);

  // Load region dataset when selectedRegion changes or on initial mount
  useEffect(() => {
    let progressTimer = null;
    let isCancelled = false;

    const loadRegionData = async () => {
      // 1. Immediately reset tickets to 0 and start loading progress
      setRawTickets([]);
      setLoading(true);
      setError(null);
      setRegionStatusMsg(null);
      setLoadingProgress(20);

      // Animate progress smoothly while awaiting network response
      progressTimer = setInterval(() => {
        setLoadingProgress(prev => (prev < 88 ? prev + Math.floor(Math.random() * 12) + 6 : prev));
      }, 120);

      // Handle 'all' regions selection (Consolidated 4 Focus Regions)
      if (selectedRegion === 'all' || selectedRegion === 'ALL') {
        try {
          const fetchPromises = regions.filter(r => r.id !== 'all').map(r => 
            fetch(`/api/proxy-sheets-json?sheetId=${encodeURIComponent(r.sheetId || r.url)}&t=${Date.now()}`)
              .then(res => res.ok ? res.json() : [])
              .catch(() => [])
          );
          const results = await Promise.all(fetchPromises);
          const allMergedRows = results.flat();
          if (!isCancelled) {
            setLoadingProgress(95);
            setRawTickets(allMergedRows);
            setLastSyncTime(new Date().toLocaleTimeString());
            setDataSource('sheets');
            if (progressTimer) clearInterval(progressTimer);
            setLoadingProgress(100);
            setLoading(false);
          }
          return;
        } catch (err) {
          console.error('Error fetching consolidated records:', err);
          if (!isCancelled) {
            if (progressTimer) clearInterval(progressTimer);
            setLoadingProgress(100);
            setLoading(false);
            setRegionStatusMsg('Error loading consolidated region records.');
          }
          return;
        }
      }

      const currentReg = regions.find(r => r.id === selectedRegion);

      if (!currentReg) {
        if (progressTimer) clearInterval(progressTimer);
        setLoading(false);
        setLoadingProgress(100);
        return;
      }

      // All regions: Fetch live Google Sheet data
      const targetSheet = currentReg.sheetId || currentReg.url || '';
      if (!targetSheet || targetSheet.includes('PASTE_')) {
        // Region is unconfigured -> Display 0 tickets and helpful notice banner with brief visual progress
        await new Promise(r => setTimeout(r, 350));
        if (progressTimer) clearInterval(progressTimer);
        if (!isCancelled) {
          setLoadingProgress(100);
          setLoading(false);
          setRawTickets([]);
          setRegionStatusMsg(`Google Sheet URL / ID is not configured yet. Click "Connect Sheet / AppSheet" to link this region.`);
        }
        return;
      }

      // Fetch live records for the configured region from Google Sheets
      try {
        const [res] = await Promise.all([
          fetch(`/api/proxy-sheets-json?sheetId=${encodeURIComponent(targetSheet)}&t=${Date.now()}`),
          new Promise(r => setTimeout(r, 450)) // Smooth visual transition guarantee
        ]);

        if (res.ok) {
          const jsonRows = await res.json();
          if (Array.isArray(jsonRows) && jsonRows.length > 0) {
            if (!isCancelled) {
              setLoadingProgress(95);
              await new Promise(r => setTimeout(r, 100));
              setRawTickets(jsonRows);
              setLastSyncTime(new Date().toLocaleTimeString());
              setDataSource('sheets');
              if (progressTimer) clearInterval(progressTimer);
              setLoadingProgress(100);
              setLoading(false);
            }
            return;
          }
        }

        // Fallback: CSV Proxy
        let fetchUrl = `/api/proxy-sheets?url=${encodeURIComponent(targetSheet)}&t=${Date.now()}`;
        Papa.parse(fetchUrl, {
          download: true,
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            if (isCancelled) return;
            if (progressTimer) clearInterval(progressTimer);
            setLoadingProgress(100);
            setLoading(false);
            if (results.data && results.data.length > 0) {
              setRawTickets(results.data);
              setLastSyncTime(new Date().toLocaleTimeString());
              setDataSource('sheets');
            } else {
              setRawTickets([]);
              setRegionStatusMsg(`0 tickets found in Google Sheet for ${currentReg.name}.`);
            }
          },
          error: (parseErr) => {
            if (isCancelled) return;
            if (progressTimer) clearInterval(progressTimer);
            setLoadingProgress(100);
            setLoading(false);
            setRawTickets([]);
            setRegionStatusMsg(`Could not read Google Sheet for ${currentReg.name}. Please verify sheet sharing permissions.`);
          }
        });
      } catch (fetchErr) {
        console.error(fetchErr);
        if (!isCancelled) {
          if (progressTimer) clearInterval(progressTimer);
          setLoadingProgress(100);
          setLoading(false);
          setRawTickets([]);
          setRegionStatusMsg(`Connection error fetching live ${currentReg.name} data.`);
        }
      }
    };

    loadRegionData();

    return () => {
      isCancelled = true;
      if (progressTimer) clearInterval(progressTimer);
    };
  }, [selectedRegion, regions]);

  useEffect(() => {
    if (window.lucide) {
      setTimeout(() => window.lucide.createIcons(), 50);
    }
  }, [showConfigModal, showAddRegionForm, loading, regionStatusMsg, activeTab, filterFromDate, filterToDate, filterMonth]);

  // Direct Live Google Sheets JSON Fetcher (Manual Trigger from Modal/Sync)
  const fetchGoogleSheetData = async (urlToFetch, showAlert = true) => {
    const targetUrl = urlToFetch || googleSheetUrl;
    if (!targetUrl || targetUrl.includes('PASTE_REGION')) {
      if (showAlert) alert('Please configure a valid Google Sheet ID or URL.');
      return;
    }
    setIsSyncing(true);
    setLoading(true);
    setLoadingProgress(20);
    const progressTimer = setInterval(() => {
      setLoadingProgress(p => (p < 90 ? p + 10 : p));
    }, 150);

    try {
      // 1. Try Direct JSON Proxy (Google Sheets gviz API)
      const res = await fetch(`/api/proxy-sheets-json?sheetId=${encodeURIComponent(targetUrl)}`);
      if (res.ok) {
        const jsonRows = await res.json();
        if (Array.isArray(jsonRows) && jsonRows.length > 0) {
          setRawTickets(jsonRows);
          setLastSyncTime(new Date().toLocaleTimeString());
          setDataSource('sheets');
          setShowConfigModal(false);
          setCurrentPage(1);
          setSearchQuery('');
          setFilterComplaintType('ALL');
          setFilterWorkStatus('ALL');
          setFilterZone('ALL');
          setFilterWattage('ALL');
          setRegionStatusMsg(null);
          if (showAlert) alert(`Successfully fetched ${jsonRows.length.toLocaleString()} live records!`);
          clearInterval(progressTimer);
          setLoadingProgress(100);
          setIsSyncing(false);
          setLoading(false);
          return;
        }
      }

      // 2. Fallback CSV stream
      let fetchUrl = `/api/proxy-sheets?url=${encodeURIComponent(targetUrl)}`;
      Papa.parse(fetchUrl, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          clearInterval(progressTimer);
          setLoadingProgress(100);
          setIsSyncing(false);
          setLoading(false);
          if (results.data && results.data.length > 0) {
            setRawTickets(results.data);
            setLastSyncTime(new Date().toLocaleTimeString());
            setDataSource('sheets');
            setShowConfigModal(false);
            setRegionStatusMsg(null);
          } else {
            setRawTickets([]);
            setRegionStatusMsg('Google Sheet returned 0 rows.');
          }
        },
        error: () => {
          clearInterval(progressTimer);
          setLoadingProgress(100);
          setIsSyncing(false);
          setLoading(false);
          setRawTickets([]);
          setRegionStatusMsg('Could not read Google Sheet.');
        }
      });
    } catch (err) {
      console.error(err);
      clearInterval(progressTimer);
      setLoadingProgress(100);
      setIsSyncing(false);
      setLoading(false);
      setRawTickets([]);
      setRegionStatusMsg('Error connecting to Google Sheet.');
    }
  };

  // Official Google Sheets API v4 Fetcher (With Google Cloud API Key)
  const fetchGoogleSheetsApiV4 = async () => {
    if (!googleSheetId || !googleApiKey) {
      alert('Please enter your Google Sheet ID and Google Cloud API Key.');
      return;
    }
    setIsSyncing(true);
    try {
      const targetRange = googleRange || 'A1:Z10000';
      const url = `/api/proxy-sheets-v4?sheetId=${encodeURIComponent(googleSheetId)}&apiKey=${encodeURIComponent(googleApiKey)}&range=${encodeURIComponent(targetRange)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Google Sheets API v4 request failed');
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        setRawTickets(data);
        setLastSyncTime(new Date().toLocaleTimeString());
        setDataSource('sheets');
        setShowConfigModal(false);
        alert(`Successfully fetched ${data.length} live records via Google Sheets API v4!`);
      } else {
        alert('Google Sheets API v4 returned 0 rows or empty table.');
      }
    } catch (err) {
      console.error(err);
      alert('Google Sheets API v4 Connection Error. Verify your API Key and Sheet ID.');
    } finally {
      setIsSyncing(false);
    }
  };

  // AppSheet API Fetcher
  const fetchAppSheetApiData = async () => {
    if (!appSheetId || !appSheetTable || !appSheetKey) {
      alert('Please enter App ID, Table Name, and Access Key.');
      return;
    }
    setIsSyncing(true);
    try {
      const response = await fetch('/api/proxy-appsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId: appSheetId, tableName: appSheetTable, accessKey: appSheetKey })
      });
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        setRawTickets(data);
        setLastSyncTime(new Date().toLocaleTimeString());
        setDataSource('appsheet');
        setShowConfigModal(false);
        alert(`Fetched ${data.length} records from AppSheet API!`);
      }
    } catch (err) {
      alert('AppSheet API connection error.');
    } finally {
      setIsSyncing(false);
    }
  };

  // File Upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => {
          setRawTickets(res.data);
          setDataSource('file');
          setLoading(false);
        }
      });
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        setRawTickets(XLSX.utils.sheet_to_json(ws));
        setDataSource('file');
        setLoading(false);
      };
      reader.readAsBinaryString(file);
    }
  };

  // All Ticket Types Filtered Dataset (Includes RC, FC, Jumper Cut, Switch Fault, SLC, Line Short, NB)
  const allTypeFilteredTickets = useMemo(() => {
    return rawTickets.filter(item => {
      const cType = String(item['Complaint Type'] || '').trim().toUpperCase();

      // Search
      const searchMatch = !searchQuery || [
        item['ID'], item['Technician Name'], item['Zone'], item['Ward'], 
        item['Complaint Type'], item['Materials'], item['Location Details'], item['Remarks'], item['Lamp Watts']
      ].some(val => String(val || '').toLowerCase().includes(searchQuery.toLowerCase()));

      // Date Range Filter
      const isoDate = parseDateToISO(item['Submission Date/Time']);
      const fromMatch = !filterFromDate || (isoDate && isoDate >= filterFromDate);
      const toMatch = !filterToDate || (isoDate && isoDate <= filterToDate);

      // Dropdown Filters
      const monthMatch = filterMonth === 'ALL' || getMonthKey(item['Submission Date/Time']) === filterMonth;
      const complaintMatch = filterComplaintType === 'ALL' || cType === String(filterComplaintType).trim().toUpperCase();
      const statusMatch = filterWorkStatus === 'ALL' || String(item['Work Status'] || '').includes(filterWorkStatus);
      const zoneMatch = filterZone === 'ALL' || normalizeZone(item['Zone']) === filterZone;
      const wattageMatch = filterWattage === 'ALL' || normalizeWattage(item['Lamp Watts']) === normalizeWattage(filterWattage);

      return searchMatch && fromMatch && toMatch && monthMatch && complaintMatch && statusMatch && zoneMatch && wattageMatch;
    });
  }, [rawTickets, searchQuery, filterFromDate, filterToDate, filterMonth, filterComplaintType, filterWorkStatus, filterZone, filterWattage]);

  // Filtered Dataset for FC Centric View
  const filteredTickets = useMemo(() => {
    return rawTickets.filter(item => {
      // FC Focus Filter
      const cType = String(item['Complaint Type'] || '').trim().toUpperCase();
      if (fcFocusOnly && cType !== 'FC' && !cType.includes('FITTING')) return false;

      // Search
      const searchMatch = !searchQuery || [
        item['ID'], item['Technician Name'], item['Zone'], item['Ward'], 
        item['Complaint Type'], item['Materials'], item['Location Details'], item['Remarks'], item['Lamp Watts']
      ].some(val => String(val || '').toLowerCase().includes(searchQuery.toLowerCase()));

      // Date Range Filter
      const isoDate = parseDateToISO(item['Submission Date/Time']);
      const fromMatch = !filterFromDate || (isoDate && isoDate >= filterFromDate);
      const toMatch = !filterToDate || (isoDate && isoDate <= filterToDate);

      // Dropdown Filters
      const monthMatch = filterMonth === 'ALL' || getMonthKey(item['Submission Date/Time']) === filterMonth;
      const complaintMatch = filterComplaintType === 'ALL' || cType === String(filterComplaintType).trim().toUpperCase();
      const statusMatch = filterWorkStatus === 'ALL' || String(item['Work Status'] || '').includes(filterWorkStatus);
      const zoneMatch = filterZone === 'ALL' || normalizeZone(item['Zone']) === filterZone;
      const wattageMatch = filterWattage === 'ALL' || normalizeWattage(item['Lamp Watts']) === normalizeWattage(filterWattage);

      return searchMatch && fromMatch && toMatch && monthMatch && complaintMatch && statusMatch && zoneMatch && wattageMatch;
    });
  }, [rawTickets, fcFocusOnly, searchQuery, filterFromDate, filterToDate, filterMonth, filterComplaintType, filterWorkStatus, filterZone, filterWattage]);

  // Overall & FC Specific Metrics
  const metrics = useMemo(() => {
    // FC Tickets in the active filtered dataset
    const fcTickets = filteredTickets.filter(t => {
      const cType = String(t['Complaint Type'] || '').trim().toUpperCase();
      return cType === 'FC' || cType.includes('FITTING');
    });

    // All FC tickets in raw dataset (honoring active Date Range if set)
    const allFcTickets = rawTickets.filter(t => {
      const cType = String(t['Complaint Type'] || '').trim().toUpperCase();
      if (cType !== 'FC' && !cType.includes('FITTING')) return false;
      const isoDate = parseDateToISO(t['Submission Date/Time']);
      const fromMatch = !filterFromDate || (isoDate && isoDate >= filterFromDate);
      const toMatch = !filterToDate || (isoDate && isoDate <= filterToDate);
      return fromMatch && toMatch;
    });

    const fcCompleted = fcTickets.filter(t => (t['Work Status'] || '').includes('Completed')).length;
    const fcOnHold = fcTickets.filter(t => (t['Work Status'] || '').includes('On Hold')).length;
    const fcCompletionRate = fcTickets.length > 0 ? ((fcCompleted / fcTickets.length) * 100).toFixed(1) : 0;

    // Period FC Counts, Total Counts & Wattage Breakdown (Month-wise, Week-wise, or Day-wise based on active filter)
    const totalPeriodCounts = {};
    const fcPeriodCounts = {};
    const fcPeriodWattages = {};

    const isDateRangeActive = Boolean(filterFromDate || filterToDate);

    if (filterMonth !== 'ALL') {
      const WEEK_KEYS = ['Week 1 (Day 1-7)', 'Week 2 (Day 8-14)', 'Week 3 (Day 15-21)', 'Week 4 (Day 22-28)', 'Week 5 (Day 29-31)'];
      WEEK_KEYS.forEach(w => {
        totalPeriodCounts[w] = 0;
        fcPeriodCounts[w] = 0;
        fcPeriodWattages[w] = { '40W': 0, '120W': 0, '90W': 0, '70W': 0, '20W': 0 };
      });

      // Count all ticket types in month
      allTypeFilteredTickets.forEach(t => {
        const wKey = getWeekKey(t['Submission Date/Time']);
        totalPeriodCounts[wKey] = (totalPeriodCounts[wKey] || 0) + 1;
      });

      // Count FC tickets in month
      fcTickets.forEach(t => {
        const wKey = getWeekKey(t['Submission Date/Time']);
        fcPeriodCounts[wKey] = (fcPeriodCounts[wKey] || 0) + 1;

        if (!fcPeriodWattages[wKey]) {
          fcPeriodWattages[wKey] = { '40W': 0, '120W': 0, '90W': 0, '70W': 0, '20W': 0 };
        }
        const normWatts = normalizeWattage(t['Lamp Watts']);
        if (fcPeriodWattages[wKey] && fcPeriodWattages[wKey][normWatts] !== undefined) {
          fcPeriodWattages[wKey][normWatts]++;
        }
      });
    } else if (isDateRangeActive) {
      // Sort chronologically
      const sortedAll = [...allTypeFilteredTickets].sort((a, b) => {
        const dA = parseDateToISO(a['Submission Date/Time']) || '';
        const dB = parseDateToISO(b['Submission Date/Time']) || '';
        return dA.localeCompare(dB);
      });

      const uniqueDays = new Set(sortedAll.map(t => parseDateToISO(t['Submission Date/Time'])).filter(Boolean));
      const useDayGrouping = uniqueDays.size <= 35;

      sortedAll.forEach(t => {
        const iso = parseDateToISO(t['Submission Date/Time']);
        const key = useDayGrouping ? (iso || 'Other') : getMonthKey(t['Submission Date/Time']);
        totalPeriodCounts[key] = (totalPeriodCounts[key] || 0) + 1;
      });

      fcTickets.forEach(t => {
        const iso = parseDateToISO(t['Submission Date/Time']);
        const key = useDayGrouping ? (iso || 'Other') : getMonthKey(t['Submission Date/Time']);
        fcPeriodCounts[key] = (fcPeriodCounts[key] || 0) + 1;

        if (!fcPeriodWattages[key]) {
          fcPeriodWattages[key] = { '40W': 0, '120W': 0, '90W': 0, '70W': 0, '20W': 0 };
        }
        const normWatts = normalizeWattage(t['Lamp Watts']);
        if (fcPeriodWattages[key] && fcPeriodWattages[key][normWatts] !== undefined) {
          fcPeriodWattages[key][normWatts]++;
        }
      });
    } else {
      // Month-wise aggregation
      rawTickets.forEach(t => {
        const mKey = getMonthKey(t['Submission Date/Time']);
        if (mKey && mKey !== 'Other') {
          totalPeriodCounts[mKey] = (totalPeriodCounts[mKey] || 0) + 1;
        }
      });

      allFcTickets.forEach(t => {
        const mKey = getMonthKey(t['Submission Date/Time']);
        if (mKey && mKey !== 'Other') {
          fcPeriodCounts[mKey] = (fcPeriodCounts[mKey] || 0) + 1;

          if (!fcPeriodWattages[mKey]) {
            fcPeriodWattages[mKey] = { '40W': 0, '120W': 0, '90W': 0, '70W': 0, '20W': 0 };
          }
          const normWatts = normalizeWattage(t['Lamp Watts']);
          if (fcPeriodWattages[mKey] && fcPeriodWattages[mKey][normWatts] !== undefined) {
            fcPeriodWattages[mKey][normWatts]++;
          }
        }
      });
    }

    // FC Wattage Distribution (For active filtered dataset)
    const fcWattages = {};
    fcTickets.forEach(t => {
      const w = normalizeWattage(t['Lamp Watts']);
      if (w !== 'Unspecified') {
        fcWattages[w] = (fcWattages[w] || 0) + 1;
      }
    });

    // FC Zone Breakdown (Normalized for active filtered dataset)
    const fcZones = {};
    fcTickets.forEach(t => {
      const z = normalizeZone(t['Zone']);
      fcZones[z] = (fcZones[z] || 0) + 1;
    });

    // FC Technician Leaderboard (For active filtered dataset)
    const fcTechs = {};
    fcTickets.forEach(t => {
      const tech = t['Technician Name'] || 'Unassigned';
      fcTechs[tech] = (fcTechs[tech] || 0) + 1;
    });

    // FC On Hold Wattage Breakdown (Which wattages are waiting on hold)
    const fcOnHoldWattages = {};
    fcTickets.filter(t => (t['Work Status'] || '').includes('On Hold')).forEach(t => {
      const w = normalizeWattage(t['Lamp Watts']);
      if (w !== 'Unspecified') {
        fcOnHoldWattages[w] = (fcOnHoldWattages[w] || 0) + 1;
      }
    });

    // Global Metrics (Total = ALL ticket types in active filters; FC = FC tickets specifically)
    const total = allTypeFilteredTickets.length;
    const completed = allTypeFilteredTickets.filter(t => (t['Work Status'] || '').includes('Completed')).length;
    const onHold = allTypeFilteredTickets.filter(t => (t['Work Status'] || '').includes('On Hold')).length;

    return {
      total,
      completed,
      onHold,
      fcTotal: fcTickets.length,
      fcCompleted,
      fcOnHold,
      fcCompletionRate,
      fcWattages,
      fcOnHoldWattages,
      fcZones,
      fcTechs,
      totalPeriodCounts,
      fcPeriodCounts,
      fcPeriodWattages,
      pctOfTotal: total > 0 ? ((fcTickets.length / total) * 100).toFixed(1) : 0
    };
  }, [rawTickets, filteredTickets, allTypeFilteredTickets, filterMonth, filterFromDate, filterToDate]);

  const uniqueZones = useMemo(() => Array.from(new Set(rawTickets.map(t => normalizeZone(t['Zone'])).filter(Boolean))).sort(), [rawTickets]);
  const uniqueWattages = useMemo(() => {
    const watts = new Set();
    rawTickets.forEach(t => {
      const w = normalizeWattage(t['Lamp Watts']);
      if (w && w !== 'Unspecified') watts.add(w);
    });
    inwardData.forEach(d => {
      const w = normalizeWattage(d.Wattage);
      if (w && w !== 'Unspecified') watts.add(w);
    });
    Object.values(regionalFcSummary).forEach(reg => {
      if (reg.watts) {
        Object.keys(reg.watts).forEach(rawW => {
          const w = normalizeWattage(rawW);
          if (w && w !== 'Unspecified') watts.add(w);
        });
      }
    });
    return Array.from(watts).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.replace(/\D/g, '')) || 0;
      return numA - numB;
    });
  }, [rawTickets, inwardData, regionalFcSummary]);
  const uniqueMonths = useMemo(() => {
    const set = new Set();
    rawTickets.forEach(t => {
      const m = getMonthKey(t['Submission Date/Time']);
      if (m && m !== 'Other') set.add(m);
    });
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return Array.from(set).sort((a, b) => {
      const [mA, yA] = a.split(' ');
      const [mB, yB] = b.split(' ');
      if (yA !== yB) return parseInt(yA) - parseInt(yB);
      return monthOrder.indexOf(mA) - monthOrder.indexOf(mB);
    });
  }, [rawTickets]);

  // Pagination slice
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, currentPage]);

  const totalPages = Math.ceil(filteredTickets.length / pageSize) || 1;

  // -------------------------------------------------------------
  // INWARD & FC RETURN DATA CALCULATIONS (FOCUS REGIONS + CUDDALORE)
  // -------------------------------------------------------------
  const INWARD_4_REGIONS = ['COIMBATORE', 'ERODE', 'TIRUPPUR', 'VELLORE', 'CUDDALORE'];

  // Base 4-Region filtered dataset
  const base4RegionInward = useMemo(() => {
    return inwardData.filter(d => INWARD_4_REGIONS.includes(d.Location));
  }, [inwardData]);

  // Active region & Universal Filters applied dataset
  const activeRegionInward = useMemo(() => {
    let list = base4RegionInward;

    // 1. Region Filter
    const activeReg = (inwardSelectedRegion || (selectedRegion === 'all' ? 'ALL' : selectedRegion)).toUpperCase();
    if (activeReg !== 'ALL') {
      list = list.filter(d => d.Location === activeReg);
    }

    // 2. Month-Wise Filter
    if (filterMonth && filterMonth !== 'ALL') {
      list = list.filter(d => {
        const dStr = d['Assigning Date'] || d['Assigning / Received Date'] || d['Mail Date'];
        return getMonthKey(dStr) === filterMonth;
      });
    }

    // 3. Date Range Filter
    if (filterFromDate || filterToDate) {
      list = list.filter(d => {
        const dStr = d['Assigning Date'] || d['Assigning / Received Date'] || d['Mail Date'] || '';
        const iso = parseDateToISO(dStr);
        if (!iso) return true;
        const fromMatch = !filterFromDate || iso >= filterFromDate;
        const toMatch = !filterToDate || iso <= filterToDate;
        return fromMatch && toMatch;
      });
    }

    // 4. Wattage Filter
    if (filterWattage && filterWattage !== 'ALL') {
      list = list.filter(d => normalizeWattage(d.Wattage) === normalizeWattage(filterWattage));
    }

    // 5. Work Status Filter
    if (filterWorkStatus && filterWorkStatus !== 'ALL') {
      if (filterWorkStatus === 'Completed' || filterWorkStatus === 'COMPLETED') {
        list = list.filter(d => (d['Service Status'] || '').toUpperCase() === 'COMPLETED');
      } else if (filterWorkStatus.includes('Hold') || filterWorkStatus === 'PENDING') {
        list = list.filter(d => (d['Service Status'] || '').toUpperCase() !== 'COMPLETED');
      }
    }

    // 6. Search Query
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d => {
        const slip = (d['Slip No'] || '').toLowerCase();
        const desc = (d['Drawing Number & Description'] || '').toLowerCase();
        const make = (d.Make || '').toLowerCase();
        const watt = (d.Wattage || '').toLowerCase();
        const rem = (d['Remarks / Reason'] || '').toLowerCase();
        const loc = (d.Location || '').toLowerCase();
        return slip.includes(q) || desc.includes(q) || make.includes(q) || watt.includes(q) || rem.includes(q) || loc.includes(q);
      });
    }

    return list;
  }, [base4RegionInward, inwardSelectedRegion, selectedRegion, filterMonth, filterFromDate, filterToDate, filterWattage, filterWorkStatus, searchQuery]);

  // Full table filtered dataset
  const filteredInward = useMemo(() => {
    return activeRegionInward.filter(d => {
      if (inwardStatusFilter !== 'ALL' && d['Service Status'] !== inwardStatusFilter) return false;
      if (inwardWattFilter !== 'ALL' && normalizeWattage(d.Wattage) !== normalizeWattage(inwardWattFilter)) return false;
      if (inwardMakeFilter !== 'ALL' && d.Make !== inwardMakeFilter) return false;
      if (inwardSearch.trim()) {
        const q = inwardSearch.toLowerCase();
        const slip = (d['Slip No'] || '').toLowerCase();
        const desc = (d['Drawing Number & Description'] || '').toLowerCase();
        const make = (d.Make || '').toLowerCase();
        const watt = (d.Wattage || '').toLowerCase();
        const rem = (d['Remarks / Reason'] || '').toLowerCase();
        const loc = (d.Location || '').toLowerCase();
        if (!slip.includes(q) && !desc.includes(q) && !make.includes(q) && !watt.includes(q) && !rem.includes(q) && !loc.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [activeRegionInward, inwardStatusFilter, inwardWattFilter, inwardMakeFilter, inwardSearch]);

  const inwardMetrics = useMemo(() => {
    const totalLots = activeRegionInward.length;
    let totalReceived = 0;
    let totalServiced = 0;
    let totalScrap = 0;
    let totalWaiting = 0;
    let totalBalance = 0;
    let tatSum = 0;
    let tatCount = 0;

    const monthlyMap = {};
    const wattMap = {};
    const makeMap = {};

    activeRegionInward.forEach(d => {
      const r = Number(d['Received Qty']) || 0;
      const s = Number(d['Serviced / Sent Qty']) || 0;
      const sc = Number(d['Scrap Qty']) || 0;
      const w = Number(d['Waiting for Service Qty']) || 0;
      const b = Number(d['Balance Qty']) || 0;

      totalReceived += r;
      totalServiced += s;
      totalScrap += sc;
      totalWaiting += w;
      totalBalance += b;

      if (d['Assigning Date'] && d['Mail Date']) {
        const d1 = new Date(d['Assigning Date']);
        const d2 = new Date(d['Mail Date']);
        const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
        if (!isNaN(diffDays)) {
          tatSum += diffDays;
          tatCount += 1;
        }
      }

      // Month
      const monthKey = d['Assigning Date'] ? d['Assigning Date'].slice(0, 7) : 'Unknown';
      if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { received: 0, sent: 0, scrap: 0, balance: 0 };
      monthlyMap[monthKey].received += r;
      monthlyMap[monthKey].sent += s;
      monthlyMap[monthKey].scrap += sc;
      monthlyMap[monthKey].balance += b;

      // Wattage (Normalized)
      const wattKey = normalizeWattage(d.Wattage);
      if (wattKey !== 'Unspecified') {
        if (!wattMap[wattKey]) wattMap[wattKey] = { received: 0, sent: 0, scrap: 0, waiting: 0 };
        wattMap[wattKey].received += r;
        wattMap[wattKey].sent += s;
        wattMap[wattKey].scrap += sc;
        wattMap[wattKey].waiting += w;
      }

      // Make
      const makeKey = d.Make || 'Others';
      if (!makeMap[makeKey]) makeMap[makeKey] = { received: 0, sent: 0, scrap: 0, waiting: 0 };
      makeMap[makeKey].received += r;
      makeMap[makeKey].sent += s;
      makeMap[makeKey].scrap += sc;
      makeMap[makeKey].waiting += w;
    });

    // 4 Regional comparison
    const regionalComparison = {};
    INWARD_4_REGIONS.forEach(reg => {
      const regData = base4RegionInward.filter(d => d.Location === reg);
      let rRecv = 0, rSent = 0, rScrap = 0, rWait = 0, rBal = 0, rTatSum = 0, rTatCount = 0;
      regData.forEach(d => {
        rRecv += Number(d['Received Qty']) || 0;
        rSent += Number(d['Serviced / Sent Qty']) || 0;
        rScrap += Number(d['Scrap Qty']) || 0;
        rWait += Number(d['Waiting for Service Qty']) || 0;
        rBal += Number(d['Balance Qty']) || 0;
        if (d['Assigning Date'] && d['Mail Date']) {
          const d1 = new Date(d['Assigning Date']);
          const d2 = new Date(d['Mail Date']);
          const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
          if (!isNaN(diffDays)) {
            rTatSum += diffDays;
            rTatCount += 1;
          }
        }
      });
      regionalComparison[reg] = {
        lots: regData.length,
        received: rRecv,
        sent: rSent,
        scrap: rScrap,
        waiting: rWait,
        balance: rBal,
        clearanceRate: rRecv > 0 ? ((rSent / rRecv) * 100).toFixed(1) : '0.0',
        scrapRate: rRecv > 0 ? ((rScrap / rRecv) * 100).toFixed(1) : '0.0',
        avgTat: rTatCount > 0 ? (rTatSum / rTatCount).toFixed(1) : '--'
      };
    });

    return {
      totalLots,
      totalReceived,
      totalServiced,
      totalScrap,
      totalWaiting,
      totalBalance,
      clearanceRate: totalReceived > 0 ? ((totalServiced / totalReceived) * 100).toFixed(1) : '0.0',
      scrapRate: totalReceived > 0 ? ((totalScrap / totalReceived) * 100).toFixed(1) : '0.0',
      avgTat: tatCount > 0 ? (tatSum / tatCount).toFixed(1) : '--',
      monthlyMap,
      wattMap,
      makeMap,
      regionalComparison
    };
  }, [activeRegionInward, base4RegionInward]);

  // -------------------------------------------------------------
  // CROSS-COMPARISON: FIELD FC TICKETS VS INWARD MATERIAL REGISTER
  // -------------------------------------------------------------
  const crossComparisonMetrics = useMemo(() => {
    let totalFcTickets = 0;
    let fcCompleted = 0;
    let fcOnHold = 0;
    const fcWattMap = {};
    const fcMonthMap = {};

    const activeReg = (inwardSelectedRegion || (selectedRegion === 'all' ? 'ALL' : selectedRegion)).toUpperCase();
    const targetRegions = (activeReg === 'ALL') 
      ? ['COIMBATORE', 'ERODE', 'TIRUPPUR', 'VELLORE', 'CUDDALORE'] 
      : [activeReg];

    // Priority 1: Use live filtered tickets from Google Sheets if loaded
    const isLiveApplicable = filteredTickets && filteredTickets.length > 0;
    if (isLiveApplicable) {
      const fcList = filteredTickets.filter(t => {
        const cType = String(t['Complaint Type'] || '').trim().toUpperCase();
        return cType === 'FC' || cType === 'FITTING CHANGE' || cType.includes('FITTING');
      });

      totalFcTickets = fcList.length;
      fcCompleted = fcList.filter(t => (t['Work Status'] || '').includes('Completed')).length;
      fcOnHold = fcList.filter(t => (t['Work Status'] || '').includes('On Hold')).length;

      fcList.forEach(t => {
        const wKey = normalizeWattage(t['Lamp Watts']);
        if (wKey !== 'Unspecified') {
          fcWattMap[wKey] = (fcWattMap[wKey] || 0) + 1;
        }

        const iso = parseDateToISO(t['Submission Date/Time']);
        if (iso) {
          const mKey = iso.slice(0, 7); // '2026-01'
          fcMonthMap[mKey] = (fcMonthMap[mKey] || 0) + 1;
        }
      });
    }

    // Priority 2: If live tickets not yet available or empty, use regional pre-aggregated summary
    if (totalFcTickets === 0 && !loading) {
      targetRegions.forEach(reg => {
        const summary = regionalFcSummary[reg];
        if (summary) {
          totalFcTickets += summary.total_fc_tickets || 0;
          fcCompleted += summary.status?.Completed || 0;
          fcOnHold += summary.status?.['On Hold'] || 0;

          if (summary.watts) {
            Object.entries(summary.watts).forEach(([w, cnt]) => {
              const wKey = normalizeWattage(w);
              if (wKey !== 'Unspecified') {
                fcWattMap[wKey] = (fcWattMap[wKey] || 0) + cnt;
              }
            });
          }
          if (summary.monthly) {
            Object.entries(summary.monthly).forEach(([m, cnt]) => {
              fcMonthMap[m] = (fcMonthMap[m] || 0) + cnt;
            });
          }
        }
      });
    }

    const inwardRecv = inwardMetrics.totalReceived || 0;
    const inwardSent = inwardMetrics.totalServiced || 0;
    const inwardScrap = inwardMetrics.totalScrap || 0;
    const inwardWaiting = inwardMetrics.totalWaiting || 0;

    // Combined unique wattages across both datasets
    const allWattKeys = Array.from(new Set([
      ...Object.keys(fcWattMap),
      ...Object.keys(inwardMetrics.wattMap)
    ])).filter(w => w && w !== 'Unspecified' && w !== 'Other');

    // Per-wattage reconciliation matrix (Sorted in DESCENDING order of inward received lamp wattages)
    const wattageMatrix = allWattKeys.map(w => {
      const fcDemand = fcWattMap[w] || 0;
      const inwRecv = inwardMetrics.wattMap[w]?.received || 0;
      const inwServiced = inwardMetrics.wattMap[w]?.sent || 0;
      const inwScrap = inwardMetrics.wattMap[w]?.scrap || 0;
      const inwWaiting = inwardMetrics.wattMap[w]?.waiting || 0;

      const netBuffer = inwServiced - fcDemand;
      const coverageRate = fcDemand > 0 ? ((inwServiced / fcDemand) * 100).toFixed(1) : (inwServiced > 0 ? '100+' : '0.0');

      let health = 'Balanced';
      let healthColor = 'var(--text-muted)';
      if (inwWaiting > 10 || (fcDemand > inwServiced && inwWaiting > 0)) {
        health = '⚠️ Service Bench Lag';
        healthColor = '#fbbf24';
      } else if (netBuffer > 0) {
        health = '🟢 Surplus / Buffer';
        healthColor = '#34d399';
      } else if (netBuffer < -20) {
        health = '🔴 Field Deficit';
        healthColor = '#f43f5e';
      }

      return {
        wattage: w,
        fcDemand,
        inwRecv,
        inwServiced,
        inwScrap,
        inwWaiting,
        netBuffer,
        coverageRate,
        health,
        healthColor
      };
    }).sort((a, b) => {
      // Primary sort: Descending order of Inwards Received quantity
      if (b.inwRecv !== a.inwRecv) {
        return b.inwRecv - a.inwRecv;
      }
      // Secondary sort: numeric wattage descending
      const numA = parseInt(a.wattage.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.wattage.replace(/\D/g, '')) || 0;
      return numB - numA;
    });

    const inwardToTicketRatio = totalFcTickets > 0 ? ((inwardRecv / totalFcTickets) * 100).toFixed(1) : '0.0';
    const overallCoverageRate = totalFcTickets > 0 ? ((inwardSent / totalFcTickets) * 100).toFixed(1) : '0.0';

    return {
      totalFcTickets,
      fcCompleted,
      fcOnHold,
      inwardRecv,
      inwardSent,
      inwardScrap,
      inwardWaiting,
      inwardToTicketRatio,
      overallCoverageRate,
      fcWattMap,
      fcMonthMap,
      wattageMatrix
    };
  }, [inwardSelectedRegion, selectedRegion, filteredTickets, regionalFcSummary, inwardMetrics, loading]);

  const uniqueInwardWatts = useMemo(() => {
    return Array.from(new Set(activeRegionInward.map(d => normalizeWattage(d.Wattage)).filter(w => w && w !== 'Unspecified'))).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.replace(/\D/g, '')) || 0;
      return numA - numB;
    });
  }, [activeRegionInward]);

  const uniqueInwardMakes = useMemo(() => {
    return Array.from(new Set(activeRegionInward.map(d => d.Make).filter(Boolean))).sort();
  }, [activeRegionInward]);

  const paginatedInward = useMemo(() => {
    const start = (inwardPage - 1) * inwardPageSize;
    return filteredInward.slice(start, start + inwardPageSize);
  }, [filteredInward, inwardPage]);

  const totalInwardPages = Math.ceil(filteredInward.length / inwardPageSize) || 1;

  // Chart Rendering Engine
  useEffect(() => {
    if (loading || activeTab === 'appsheet_guide') return;

    Object.values(chartInstances.current).forEach(c => c && c.destroy());

    // 1. Month-Wise / Week-Wise / Date-Range FC vs Total Count Line Chart
    if (fcMonthTrendChartRef.current && activeTab === 'fc_centric') {
      const ctx = fcMonthTrendChartRef.current.getContext('2d');
      const periods = (filterMonth === 'ALL' && !isDateRangeActive && uniqueMonths.length > 0)
        ? uniqueMonths
        : Object.keys(metrics.fcPeriodCounts);

      const fcCounts = periods.map(p => metrics.fcPeriodCounts[p] || 0);
      const totalCounts = periods.map(p => metrics.totalPeriodCounts[p] || 0);

      const datasets = [];

      if (trendViewMode === 'both' || trendViewMode === 'total') {
        datasets.push({
          label: '📋 Total Fault Tickets',
          data: totalCounts,
          borderColor: '#818cf8',
          backgroundColor: 'rgba(99, 102, 241, 0.12)',
          borderWidth: 2.5,
          fill: trendViewMode === 'total',
          tension: 0.35,
          pointBackgroundColor: '#818cf8',
          pointHoverRadius: 7,
          pointRadius: 4,
          order: 2
        });
      }

      if (trendViewMode === 'both' || trendViewMode === 'fc') {
        datasets.push({
          label: '⚡ Fitting Change (FC) Tickets',
          data: fcCounts,
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.22)',
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#38bdf8',
          pointHoverRadius: 8,
          pointRadius: 5,
          order: 1
        });
      }

      chartInstances.current.fcMonthTrend = new Chart(ctx, {
        type: 'line',
        data: {
          labels: periods,
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false
          },
          scales: {
            x: { 
              ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11, weight: '600' } }, 
              grid: { color: 'rgba(255, 255, 255, 0.05)' } 
            },
            y: { 
              ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } }, 
              grid: { color: 'rgba(255, 255, 255, 0.05)' } 
            }
          },
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                color: '#94a3b8',
                font: { family: 'Inter', size: 11, weight: '600' },
                usePointStyle: true,
                pointStyle: 'circle'
              }
            },
            tooltip: {
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              titleColor: '#fff',
              bodyColor: '#cbd5e1',
              borderColor: 'rgba(56, 189, 248, 0.3)',
              borderWidth: 1,
              padding: 12,
              callbacks: {
                title: (items) => `📅 ${items[0].label}`,
                afterBody: (items) => {
                  const idx = items[0].dataIndex;
                  const p = periods[idx];
                  const tot = metrics.totalPeriodCounts[p] || 0;
                  const fc = metrics.fcPeriodCounts[p] || 0;
                  const pct = tot > 0 ? ((fc / tot) * 100).toFixed(1) : 0;
                  return [
                    `📊 FC Share: ${pct}% of total`
                  ];
                }
              }
            }
          }
        }
      });
    }

    // 2. Month-Wise / Week-Wise Lamp Watts Stacked Bar Chart
    if (fcMonthWattageChartRef.current && activeTab === 'fc_centric') {
      const ctx = fcMonthWattageChartRef.current.getContext('2d');
      const periods = Object.keys(metrics.fcPeriodWattages);
      
      const watts40 = periods.map(p => metrics.fcPeriodWattages[p]['40W']);
      const watts120 = periods.map(p => metrics.fcPeriodWattages[p]['120W']);
      const watts90 = periods.map(p => metrics.fcPeriodWattages[p]['90W']);
      const watts70 = periods.map(p => metrics.fcPeriodWattages[p]['70W']);
      const watts20 = periods.map(p => metrics.fcPeriodWattages[p]['20W']);

      chartInstances.current.fcMonthWattage = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: periods,
          datasets: [
            { label: '40W', data: watts40, backgroundColor: WATTAGE_COLORS['40W'] },
            { label: '120W', data: watts120, backgroundColor: WATTAGE_COLORS['120W'] },
            { label: '90W', data: watts90, backgroundColor: WATTAGE_COLORS['90W'] },
            { label: '70W', data: watts70, backgroundColor: WATTAGE_COLORS['70W'] },
            { label: '20W', data: watts20, backgroundColor: WATTAGE_COLORS['20W'] }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { stacked: true, ticks: { color: '#94a3b8' }, grid: { display: false } },
            y: { stacked: true, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
          },
          plugins: {
            legend: { position: 'top', labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } } }
          }
        }
      });
    }

    // 3. Fitting Change Wattage Distribution Bar Chart
    if (fcWattageChartRef.current && activeTab === 'fc_centric') {
      const ctx = fcWattageChartRef.current.getContext('2d');
      const sortedWatts = Object.entries(metrics.fcWattages).sort((a, b) => b[1] - a[1]);

      chartInstances.current.fcWattage = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: sortedWatts.map(w => w[0]),
          datasets: [{
            label: 'FC Replacements',
            data: sortedWatts.map(w => w[1]),
            backgroundColor: sortedWatts.map(w => getWattageColor(w[0])),
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
          },
          plugins: { legend: { display: false } }
        }
      });
    }

    // 4. FC Zone Distribution Donut Chart
    if (fcZoneChartRef.current && activeTab === 'fc_centric') {
      const ctx = fcZoneChartRef.current.getContext('2d');
      const sortedZones = Object.entries(metrics.fcZones).sort((a, b) => b[1] - a[1]);

      chartInstances.current.fcZone = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: sortedZones.map(z => z[0]),
          datasets: [{
            data: sortedZones.map(z => z[1]),
            backgroundColor: ['#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#10b981'],
            borderColor: '#0f172a',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } } }
          }
        }
      });
    }

    // 5. INWARD ANALYSIS CHARTS
    if (activeTab === 'inward_analysis') {
      // 5.1 Monthly Inward Trend Chart
      if (inwardMonthChartRef.current) {
        const ctx = inwardMonthChartRef.current.getContext('2d');
        const months = Object.keys(inwardMetrics.monthlyMap).sort();
        const recData = months.map(m => inwardMetrics.monthlyMap[m].received);
        const sentData = months.map(m => inwardMetrics.monthlyMap[m].sent);
        const scrapData = months.map(m => inwardMetrics.monthlyMap[m].scrap);

        chartInstances.current.inwardMonth = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: months,
            datasets: [
              { label: 'Received Inward', data: recData, backgroundColor: '#06b6d4', borderRadius: 4 },
              { label: 'Serviced / Sent Back', data: sentData, backgroundColor: '#10b981', borderRadius: 4 },
              { label: 'Scrap Unrecoverable', data: scrapData, backgroundColor: '#f43f5e', borderRadius: 4 }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
              y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
            },
            plugins: {
              legend: { position: 'top', labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } } }
            }
          }
        });
      }

      // 5.2 Inward Wattage Breakdown
      if (inwardWattChartRef.current) {
        const ctx = inwardWattChartRef.current.getContext('2d');
        const sortedWatts = Object.entries(inwardMetrics.wattMap).sort((a,b) => b[1].received - a[1].received).slice(0, 8);
        chartInstances.current.inwardWatt = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: sortedWatts.map(w => w[0]),
            datasets: [{
              data: sortedWatts.map(w => w[1].received),
              backgroundColor: sortedWatts.map(w => getWattageColor(w[0])),
              borderColor: '#0f172a',
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
              legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 12, padding: 8, font: { family: 'Inter', size: 10 } } }
            }
          }
        });
      }

      // 5.3 Inward Make Ranking
      if (inwardMakeChartRef.current) {
        const ctx = inwardMakeChartRef.current.getContext('2d');
        const sortedMakes = Object.entries(inwardMetrics.makeMap).sort((a,b) => b[1].received - a[1].received).slice(0, 8);
        const labels = sortedMakes.map(m => m[0]);
        const rec = sortedMakes.map(m => m[1].received);
        const scr = sortedMakes.map(m => m[1].scrap);

        chartInstances.current.inwardMake = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [
              { label: 'Received Qty', data: rec, backgroundColor: '#3b82f6', borderRadius: 4 },
              { label: 'Scrapped Qty', data: scr, backgroundColor: '#f43f5e', borderRadius: 4 }
            ]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
              y: { ticks: { color: '#94a3b8' }, grid: { display: false } }
            },
            plugins: {
              legend: { position: 'top', labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } } }
            }
          }
        });
      }

      // 5.4 Cross-Comparison: FC Field Demand vs Service Inward vs Serviced Returned (Grouped Multi-Bar)
      if (comparisonWattChartRef.current) {
        const ctx = comparisonWattChartRef.current.getContext('2d');
        // Analysis of ALL lamp wattages in descending order of Inward Received
        const allWatts = crossComparisonMetrics.wattageMatrix;
        const labels = allWatts.map(x => x.wattage);
        const fcData = allWatts.map(x => x.fcDemand);
        const inwData = allWatts.map(x => x.inwRecv);
        const sentData = allWatts.map(x => x.inwServiced);

        chartInstances.current.compWatt = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [
              { label: '⚡ Field FC Tickets Demanded', data: fcData, backgroundColor: '#f59e0b', borderRadius: 4 },
              { label: '📥 Service Inward Received', data: inwData, backgroundColor: '#06b6d4', borderRadius: 4 },
              { label: '🚚 Serviced & Sent Back', data: sentData, backgroundColor: '#10b981', borderRadius: 4 }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            categoryPercentage: 0.85,
            barPercentage: 0.9,
            scales: {
              x: { 
                ticks: { color: '#94a3b8', maxRotation: 45, minRotation: 0, font: { family: 'Inter', size: 11, weight: '600' } }, 
                grid: { display: false } 
              },
              y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
            },
            plugins: {
              legend: { position: 'top', labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } } },
              tooltip: {
                callbacks: {
                  title: (items) => `Lamp Wattage: ${items[0].label}`,
                  afterBody: (items) => {
                    const idx = items[0].dataIndex;
                    const item = allWatts[idx];
                    return item ? `Net Buffer / Gap: ${item.netBuffer >= 0 ? '+' : ''}${item.netBuffer}\nWaiting for Service: ${item.inwWaiting}\nScrap: ${item.inwScrap}` : '';
                  }
                }
              }
            }
          }
        });
      }

      // 5.5 Cross-Comparison Monthly Trend Chart
      if (comparisonMonthChartRef.current) {
        const ctx = comparisonMonthChartRef.current.getContext('2d');
        const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
        const monthLabels = ['Jan \'26', 'Feb \'26', 'Mar \'26', 'Apr \'26', 'May \'26', 'Jun \'26', 'Jul \'26', 'Aug \'26', 'Sep \'26'];
        const fcMonthly = months.map(m => crossComparisonMetrics.fcMonthMap[m] || 0);
        const inwMonthly = months.map(m => inwardMetrics.monthlyMap[m]?.received || 0);
        const sentMonthly = months.map(m => inwardMetrics.monthlyMap[m]?.sent || 0);

        chartInstances.current.compMonth = new Chart(ctx, {
          type: 'line',
          data: {
            labels: monthLabels,
            datasets: [
              { 
                label: '⚡ Field FC Tickets Demanded', 
                data: fcMonthly, 
                borderColor: '#f59e0b', 
                backgroundColor: 'rgba(245, 158, 11, 0.15)', 
                borderWidth: 3, 
                tension: 0.35, 
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: '#f59e0b',
                fill: false 
              },
              { 
                label: '📥 Inward Received for Service', 
                data: inwMonthly, 
                borderColor: '#06b6d4', 
                backgroundColor: 'rgba(6, 182, 212, 0.15)', 
                borderWidth: 3, 
                tension: 0.35, 
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: '#06b6d4',
                fill: false 
              },
              { 
                label: '🚚 Serviced & Sent Back', 
                data: sentMonthly, 
                borderColor: '#10b981', 
                backgroundColor: 'rgba(16, 185, 129, 0.15)', 
                borderWidth: 3, 
                tension: 0.35, 
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: '#10b981',
                fill: false 
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
              x: { ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } }, grid: { display: false } },
              y: { 
                ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } }, 
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                beginAtZero: true
              }
            },
            plugins: {
              legend: { 
                position: 'top', 
                labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, usePointStyle: true, boxWidth: 8 } 
              },
              tooltip: {
                backgroundColor: '#0f172a',
                titleColor: '#fff',
                bodyColor: '#cbd5e1',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                padding: 10
              }
            }
          }
        });
      }
    }

  }, [metrics, inwardMetrics, crossComparisonMetrics, activeTab, loading, inwardSelectedRegion, selectedRegion, trendViewMode]);

  // CSV Exporter for FC Tickets
  const exportToCSV = () => {
    const csv = Papa.unparse(filteredTickets);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `FC_Fitting_Changes_${selectedRegion}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Exporter for Inward Register
  const exportInwardToCSV = () => {
    const csv = Papa.unparse(filteredInward);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `LED_Inward_FC_Return_${inwardSelectedRegion}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1600px', margin: '0 auto' }}>
      
      {/* TOP HEADER */}
      <header className="glass-panel" style={{ padding: '1.2rem 1.8rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '6px', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.7)', border: '1px solid var(--border-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(6, 182, 212, 0.3)' }}>
            <img src="schnell_logo.png" alt="Schnell Logo" style={{ height: '44px', width: 'auto', borderRadius: '8px', objectFit: 'contain' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: '800', letterSpacing: '-0.02em', background: 'linear-gradient(to right, #fff, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Fitting Change (FC) Analytics & AppSheet Hub
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Dedicated Command Center for Fitting Changes (FC) • Lamp Wattage, Materials & Multi-Region Google Sheets Auto-Sync
            </p>
          </div>
        </div>

        {/* Region & Source Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          
          {/* FC FOCUS TOGGLE BUTTON */}
          <button 
            onClick={() => setFcFocusOnly(!fcFocusOnly)}
            className="btn"
            style={{ 
              background: fcFocusOnly ? 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))' : 'rgba(30, 41, 59, 0.8)',
              color: '#fff',
              border: fcFocusOnly ? 'none' : '1px solid var(--border-color)',
              boxShadow: fcFocusOnly ? '0 4px 14px rgba(6, 182, 212, 0.4)' : 'none'
            }}
          >
            <i data-lucide="filter" style={{ width: '16px', height: '16px' }}></i>
            {fcFocusOnly ? '⚡ FC Focus Mode: ON' : 'All Complaints View'}
          </button>

          {/* Region Switcher Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.75)', padding: '0.4rem 0.85rem', borderRadius: '10px', border: '1px solid var(--accent-cyan)', boxShadow: '0 2px 10px rgba(6, 182, 212, 0.2)' }}>
            <i data-lucide="map-pin" style={{ color: 'var(--accent-cyan)', width: '16px', height: '16px' }}></i>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700' }}>Region:</span>
            <select 
              value={selectedRegion} 
              onChange={(e) => handleGlobalRegionChange(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.88rem', fontWeight: '700', outline: 'none', cursor: 'pointer' }}
            >
              <option value="all" style={{ background: '#0f172a' }}>🌐 All Integrated Regions (Consolidated)</option>
              {regions.filter(r => r.id !== 'all').map(reg => (
                <option key={reg.id} value={reg.id} style={{ background: '#0f172a' }}>
                  📍 {reg.name}
                </option>
              ))}
            </select>
          </div>

          <button className="btn btn-primary" onClick={() => setShowConfigModal(true)}>
            <i data-lucide="cloud-lightning" style={{ width: '16px', height: '16px' }}></i>
            Connect Sheet / AppSheet
          </button>
        </div>
      </header>

      {/* NAVIGATION TABS */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        {[
          { id: 'fc_centric', label: 'Fitting Change (FC) Command Center', icon: 'zap', badge: `${metrics.fcTotal.toLocaleString()} FCs` },
          { id: 'inward_analysis', label: 'Material Inward & FC Return Analysis', icon: 'truck', badge: '5 Regions' },
          { id: 'materials', label: 'FC Materials & Wattages Matrix', icon: 'package' },
          { id: 'table', label: `FC Ticket Registry (${filteredTickets.length.toLocaleString()})`, icon: 'table' },
          { id: 'appsheet_guide', label: 'AppSheet & Sheets Integration Guide', icon: 'book-open' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`btn ${activeTab === tab.id ? 'btn-secondary' : ''}`}
            style={{ 
              background: activeTab === tab.id ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: activeTab === tab.id ? 'var(--accent-cyan)' : 'var(--text-muted)',
              borderColor: activeTab === tab.id ? 'var(--accent-cyan)' : 'transparent',
              borderRadius: '12px',
              padding: '0.6rem 1.1rem'
            }}
          >
            <i data-lucide={tab.icon} style={{ width: '18px', height: '18px' }}></i>
            {tab.label}
            {tab.badge && <span className="badge badge-info" style={{ marginLeft: '0.4rem' }}>{tab.badge}</span>}
          </button>
        ))}
      </div>

      {/* REGION SWITCH / DATA LOADING PROGRESS BAR */}
      {loading && (
        <div className="glass-panel" style={{ padding: '1.1rem 1.6rem', marginBottom: '1.5rem', border: '1px solid var(--border-glow)', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9))', boxShadow: '0 8px 30px rgba(6, 182, 212, 0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.7rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="glow-dot animate-pulse-glow" style={{ background: 'var(--accent-cyan)' }}></span>
              <span style={{ fontSize: '0.92rem', fontWeight: '700', color: '#fff' }}>
                Fetching Tickets for <span style={{ color: 'var(--accent-cyan)' }}>{regions.find(r => r.id === selectedRegion)?.name || selectedRegion}</span>...
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(15, 23, 42, 0.6)', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                Resetting dashboard to 0
              </span>
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
              {loadingProgress}%
            </span>
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${loadingProgress}%` }}></div>
          </div>
        </div>
      )}

      {/* REGION UNCONFIGURED OR EMPTY STATUS NOTICE */}
      {!loading && regionStatusMsg && (
        <div className="glass-panel" style={{ padding: '1.1rem 1.6rem', marginBottom: '1.5rem', border: '1px solid var(--accent-amber)', background: 'rgba(245, 158, 11, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <i data-lucide="alert-triangle" style={{ color: 'var(--accent-amber)', width: '24px', height: '24px' }}></i>
            <div>
              <span style={{ fontWeight: '700', color: '#fbbf24', fontSize: '0.95rem' }}>
                {regions.find(r => r.id === selectedRegion)?.name || 'Region'}: {regionStatusMsg}
              </span>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                Tickets are reset to 0. Connect a valid Google Sheet or AppSheet table to populate live records.
              </p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowConfigModal(true)} style={{ fontSize: '0.8rem', padding: '0.45rem 1rem' }}>
            <i data-lucide="settings" style={{ width: '14px', height: '14px' }}></i>
            Configure Google Sheet
          </button>
        </div>
      )}

      {/* ACTIVE DATE / MONTH FOCUS BANNER */}
      {activeTab !== 'appsheet_guide' && (Boolean(filterFromDate || filterToDate) || filterMonth !== 'ALL') && (
        <div className="glass-panel" style={{ padding: '0.85rem 1.4rem', marginBottom: '1.2rem', background: 'linear-gradient(90deg, rgba(6,182,212,0.18), rgba(99,102,241,0.18))', border: '1px solid var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <i data-lucide="calendar" style={{ color: 'var(--accent-cyan)', width: '22px', height: '22px' }}></i>
            <div>
              <span style={{ fontWeight: '800', fontSize: '0.98rem', color: '#fff' }}>
                {filterFromDate || filterToDate ? (
                  <>
                    Active Date Range Filter: <span style={{ color: 'var(--accent-cyan)' }}>{filterFromDate || 'Start'}</span> ➔ <span style={{ color: 'var(--accent-cyan)' }}>{filterToDate || 'Today'}</span>
                    <span className="badge badge-info" style={{ marginLeft: '0.6rem', fontSize: '0.75rem' }}>
                      {filteredTickets.length.toLocaleString()} FC Tickets Found
                    </span>
                  </>
                ) : (
                  <>
                    Active Month Analytics Focus: <span style={{ color: 'var(--accent-cyan)' }}>{filterMonth}</span>
                    <span className="badge badge-info" style={{ marginLeft: '0.6rem', fontSize: '0.75rem' }}>
                      {filteredTickets.length.toLocaleString()} FC Tickets Found
                    </span>
                  </>
                )}
              </span>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                All KPI metrics, trend charts, wattage breakdowns, zone distributions, materials matrix, and registry table are filtered specifically for this period.
              </p>
            </div>
          </div>
          <button 
            onClick={() => { setFilterFromDate(''); setFilterToDate(''); setFilterMonth('ALL'); setDatePreset('all'); setCurrentPage(1); }} 
            className="btn btn-secondary" 
            style={{ fontSize: '0.75rem', padding: '0.4rem 0.9rem', borderRadius: '8px' }}
          >
            ✕ Reset to Full View
          </button>
        </div>
      )}

      {/* KPI METRIC CARDS - FC CENTRIC */}
      {activeTab !== 'appsheet_guide' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
          
          {/* Card 1: Total Fault Tickets */}
          <div className="glass-panel" style={{ padding: '1.4rem', borderLeft: '4px solid var(--accent-blue)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {(filterFromDate || filterToDate) ? `Total Tickets (${filterFromDate || 'Start'} to ${filterToDate || 'Today'})` : (filterMonth === 'ALL' ? 'Total Tickets' : `Total Tickets (${filterMonth})`)}
                </span>
                <h3 style={{ fontSize: '2rem', fontWeight: '800', margin: '0.4rem 0 0 0', color: '#fff' }}>
                  {loading ? '0' : metrics.total.toLocaleString()}
                </h3>
              </div>
              <div style={{ padding: '0.6rem', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)' }}>
                <i data-lucide="clipboard-list" style={{ width: '24px', height: '24px' }}></i>
              </div>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.6rem' }}>
              {loading ? 'Loading tickets...' : ((filterFromDate || filterToDate) ? `All complaint types logged within date filter` : (filterMonth === 'ALL' ? 'All fault ticket entries logged' : `Fault tickets logged in ${filterMonth}`))}
            </p>
          </div>

          {/* Card 2: Fitting Change (FC) Tickets */}
          <div className="glass-panel" style={{ padding: '1.4rem', borderLeft: '4px solid var(--accent-cyan)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {(filterFromDate || filterToDate) ? `FC Tickets (${filterFromDate || 'Start'} to ${filterToDate || 'Today'})` : (filterMonth === 'ALL' ? 'FC (Fitting Change) Tickets' : `FC Tickets (${filterMonth})`)}
                </span>
                <h3 style={{ fontSize: '2rem', fontWeight: '800', margin: '0.4rem 0 0 0', color: '#38bdf8' }}>
                  {loading ? '0' : metrics.fcTotal.toLocaleString()}
                </h3>
              </div>
              <div style={{ padding: '0.6rem', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)' }}>
                <i data-lucide="lightbulb" style={{ width: '24px', height: '24px' }}></i>
              </div>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.6rem' }}>
              {loading ? '0% completed' : `${metrics.pctOfTotal}% of period total (${metrics.fcCompleted.toLocaleString()} completed)`}
            </p>
          </div>

          {/* Card 3: FC Pending Material Hold */}
          <div className="glass-panel" style={{ padding: '1.4rem', borderLeft: '4px solid var(--accent-amber)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {(filterFromDate || filterToDate) ? `FC Material Hold (${filterFromDate || 'Start'} to ${filterToDate || 'Today'})` : (filterMonth === 'ALL' ? 'FC Material Hold' : `FC Material Hold (${filterMonth})`)}
                </span>
                <h3 style={{ fontSize: '2rem', fontWeight: '800', margin: '0.4rem 0 0 0', color: '#fbbf24' }}>
                  {loading ? '0' : metrics.fcOnHold.toLocaleString()}
                </h3>
              </div>
              <div style={{ padding: '0.6rem', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)' }}>
                <i data-lucide="package-search" style={{ width: '24px', height: '24px' }}></i>
              </div>
            </div>
            
            {/* On-Hold Lamp Watts Breakdown Pills */}
            <div style={{ marginTop: '0.6rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
              {loading ? (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Fetching status...</span>
              ) : metrics.fcOnHold === 0 ? (
                <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: '600' }}>✓ 0 On Hold (Fittings Available)</span>
              ) : (
                Object.entries(metrics.fcOnHoldWattages).sort((a,b) => b[1]-a[1]).map(([w, cnt]) => {
                  const col = getWattageColor(w);
                  return (
                    <span 
                      key={w} 
                      style={{ 
                        fontSize: '0.72rem', 
                        fontWeight: '800', 
                        padding: '0.18rem 0.45rem', 
                        borderRadius: '6px', 
                        background: `${col}22`, 
                        color: col, 
                        border: `1px solid ${col}55` 
                      }}
                      title={`${cnt} units of ${w} on hold`}
                    >
                      {w}: {cnt}
                    </span>
                  );
                })
              )}
            </div>
          </div>

          {/* Card 4: Top Fitting Wattage */}
          <div className="glass-panel" style={{ padding: '1.4rem', borderLeft: '4px solid var(--accent-purple)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {(filterFromDate || filterToDate) ? `Primary Fitting (${filterFromDate || 'Start'} to ${filterToDate || 'Today'})` : (filterMonth === 'ALL' ? 'Primary Fitting Type' : `Primary Fitting (${filterMonth})`)}
                </span>
                <h3 style={{ fontSize: '1.6rem', fontWeight: '800', margin: '0.4rem 0 0 0', color: '#a78bfa' }}>
                  {loading ? '--' : (metrics.fcTotal === 0 ? 'None' : (Object.entries(metrics.fcWattages).sort((a,b) => b[1]-a[1])[0]?.[0] || 'None'))}
                </h3>
              </div>
              <div style={{ padding: '0.6rem', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-purple)' }}>
                <i data-lucide="zap" style={{ width: '24px', height: '24px' }}></i>
              </div>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.6rem' }}>
              {loading ? '0 units replaced' : `${(Object.entries(metrics.fcWattages).sort((a,b) => b[1]-a[1])[0]?.[1] || 0).toLocaleString()} units replaced`}
            </p>
          </div>

        </div>
      )}

      {/* FILTER & DATE RANGE CONTROL BAR */}
      {activeTab !== 'appsheet_guide' && (
        <div className="glass-panel" style={{ padding: '1.2rem 1.6rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Row 1: Search & Category Dropdowns */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.85rem' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
              <input 
                type="text" 
                placeholder="Search FC ID, technician, wattage, ward, remarks..."
                value={searchQuery}
                onChange={(e) => handleGlobalSearchChange(e.target.value)}
                className="glass-input"
                style={{ width: '100%', paddingLeft: '2.5rem' }}
              />
              <i data-lucide="search" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', width: '18px', height: '18px' }}></i>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              
              {/* Month-Wise Filter */}
              <select 
                value={filterMonth} 
                onChange={(e) => { 
                  setFilterMonth(e.target.value); 
                  if (e.target.value !== 'ALL') {
                    setFilterFromDate('');
                    setFilterToDate('');
                    setDatePreset('all');
                  }
                  setCurrentPage(1); 
                }} 
                className="glass-input"
                style={{ borderColor: filterMonth !== 'ALL' ? 'var(--accent-cyan)' : 'var(--border-color)', fontWeight: filterMonth !== 'ALL' ? '700' : 'normal' }}
              >
                <option value="ALL" style={{ background: '#0f172a' }}>📅 All Months (Full Year)</option>
                {uniqueMonths.map(m => (
                  <option key={m} value={m} style={{ background: '#0f172a' }}>🗓️ {m} Analytics</option>
                ))}
              </select>

              {/* Lamp Wattage Filter */}
              <select value={filterWattage} onChange={(e) => handleGlobalWattageChange(e.target.value)} className="glass-input">
                <option value="ALL" style={{ background: '#0f172a' }}>All Fitting Wattages</option>
                {uniqueWattages.map(w => (
                  <option key={w} value={w} style={{ background: '#0f172a' }}>{w} Fittings</option>
                ))}
              </select>

              {/* Zone Filter */}
              <select value={filterZone} onChange={(e) => { setFilterZone(e.target.value); setCurrentPage(1); }} className="glass-input">
                <option value="ALL" style={{ background: '#0f172a' }}>All Zones</option>
                {uniqueZones.map(z => (
                  <option key={z} value={z} style={{ background: '#0f172a' }}>{z}</option>
                ))}
              </select>

              {/* Work Status Filter */}
              <select value={filterWorkStatus} onChange={(e) => handleGlobalStatusChange(e.target.value)} className="glass-input">
                <option value="ALL" style={{ background: '#0f172a' }}>All Statuses</option>
                <option value="Completed" style={{ background: '#0f172a' }}>Completed FCs</option>
                <option value="On Hold : Materials Required" style={{ background: '#0f172a' }}>On Hold FCs</option>
              </select>
            </div>
          </div>

          {/* Row 2: Date Range Filter (From Date / To Date) & Quick Presets */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
            
            {/* From Date & To Date Inputs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-cyan)', fontSize: '0.82rem', fontWeight: '700' }}>
                <i data-lucide="calendar-range" style={{ width: '16px', height: '16px' }}></i>
                <span>Date Range:</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(15, 23, 42, 0.6)', padding: '0.25rem 0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>FROM</span>
                <input 
                  type="date" 
                  value={filterFromDate}
                  onChange={(e) => {
                    setFilterFromDate(e.target.value);
                    setFilterMonth('ALL');
                    setDatePreset('custom');
                    setCurrentPage(1);
                  }}
                  className="glass-input"
                  style={{ padding: '0.3rem 0.55rem', fontSize: '0.82rem', colorScheme: 'dark', border: 'none', background: 'transparent' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(15, 23, 42, 0.6)', padding: '0.25rem 0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>TO</span>
                <input 
                  type="date" 
                  value={filterToDate}
                  onChange={(e) => {
                    setFilterToDate(e.target.value);
                    setFilterMonth('ALL');
                    setDatePreset('custom');
                    setCurrentPage(1);
                  }}
                  className="glass-input"
                  style={{ padding: '0.3rem 0.55rem', fontSize: '0.82rem', colorScheme: 'dark', border: 'none', background: 'transparent' }}
                />
              </div>

              {(filterFromDate || filterToDate) && (
                <button 
                  onClick={() => { setFilterFromDate(''); setFilterToDate(''); setDatePreset('all'); setCurrentPage(1); }}
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '8px' }}
                  title="Clear Date Filter"
                >
                  ✕ Clear Dates
                </button>
              )}
            </div>

            {/* Quick Range Presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: '600', marginRight: '0.2rem' }}>Presets:</span>
              {[
                { id: 'all', label: 'All Time' },
                { id: 'today', label: 'Today' },
                { id: 'last7', label: 'Last 7 Days' },
                { id: 'last30', label: 'Last 30 Days' },
                { id: 'this_month', label: 'This Month' },
                { id: 'last_month', label: 'Last Month' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => applyDatePreset(p.id)}
                  style={{
                    background: datePreset === p.id && (filterFromDate || filterToDate || p.id === 'all') ? 'rgba(6, 182, 212, 0.2)' : 'rgba(30, 41, 59, 0.6)',
                    color: datePreset === p.id && (filterFromDate || filterToDate || p.id === 'all') ? 'var(--accent-cyan)' : 'var(--text-muted)',
                    border: `1px solid ${datePreset === p.id && (filterFromDate || filterToDate || p.id === 'all') ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                    borderRadius: '6px',
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {p.label}
                </button>
              ))}

              <button 
                onClick={resetAllFilters}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem', borderRadius: '8px', marginLeft: '0.4rem' }}
              >
                ✕ Reset All
              </button>
            </div>

          </div>

        </div>
      )}

      {/* TAB CONTENT 1: FC CENTRIC COMMAND CENTER */}
      {activeTab === 'fc_centric' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
          
          {/* 1. Month-Wise / Week-Wise / Date-Range FC vs Total Ticket Trend */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '0.6rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
                  <i data-lucide="trending-up" style={{ color: 'var(--accent-cyan)', width: '20px', height: '20px' }}></i>
                  {(filterFromDate || filterToDate) 
                    ? `Fitting Change (FC) vs Total Ticket Trend (${filterFromDate || 'Start'} to ${filterToDate || 'Today'})` 
                    : (filterMonth === 'ALL' ? 'Month-Wise Fitting Change (FC) vs Total Tickets' : `Week-Wise FC vs Total Tickets (${filterMonth})`)}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                  {(filterFromDate || filterToDate) 
                    ? `Comparison of Fitting Changes (FC) against Total Fault Tickets from ${filterFromDate || 'Start'} to ${filterToDate || 'Today'}` 
                    : (filterMonth === 'ALL' ? 'Monthly comparison of Fitting Change (FC) tickets vs Total Fault tickets' : `Comparison of Fitting Changes vs Total tickets in ${filterMonth}`)}
                </p>
              </div>

              {/* Dynamic View Mode Toggle Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(15, 23, 42, 0.7)', padding: '0.25rem 0.35rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  onClick={() => setTrendViewMode('both')}
                  style={{
                    padding: '0.25rem 0.55rem',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    borderRadius: '6px',
                    border: 'none',
                    background: trendViewMode === 'both' ? 'var(--accent-cyan)' : 'transparent',
                    color: trendViewMode === 'both' ? '#0f172a' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  title="View both FC and Total tickets"
                >
                  ⚡ FC vs Total
                </button>
                <button
                  type="button"
                  onClick={() => setTrendViewMode('fc')}
                  style={{
                    padding: '0.25rem 0.55rem',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    borderRadius: '6px',
                    border: 'none',
                    background: trendViewMode === 'fc' ? 'var(--accent-cyan)' : 'transparent',
                    color: trendViewMode === 'fc' ? '#0f172a' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  title="View FC tickets only"
                >
                  ⚡ FC Only
                </button>
                <button
                  type="button"
                  onClick={() => setTrendViewMode('total')}
                  style={{
                    padding: '0.25rem 0.55rem',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    borderRadius: '6px',
                    border: 'none',
                    background: trendViewMode === 'total' ? 'var(--accent-indigo)' : 'transparent',
                    color: trendViewMode === 'total' ? '#fff' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  title="View Total tickets only"
                >
                  📋 Total Only
                </button>
              </div>
            </div>

            <div className="chart-container" style={{ minHeight: '300px' }}>
              <canvas ref={fcMonthTrendChartRef}></canvas>
            </div>
          </div>

          {/* 2. Month-Wise / Week-Wise / Date-Range Lamp Watts Breakdown */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i data-lucide="layers" style={{ color: 'var(--accent-indigo)', width: '20px', height: '20px' }}></i>
              {(filterFromDate || filterToDate) ? `Lamp Watts Distribution (${filterFromDate || 'Start'} to ${filterToDate || 'Today'})` : (filterMonth === 'ALL' ? 'Month-Wise Lamp Watts Distribution (40W, 120W, 90W, 70W)' : `Week-Wise Lamp Watts Distribution (${filterMonth})`)}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {(filterFromDate || filterToDate) ? 'Stacked breakdown of replaced fitting wattages in the selected date range' : (filterMonth === 'ALL' ? 'Stacked breakdown of replaced fitting wattages by month' : `Stacked breakdown of replaced fitting wattages by week in ${filterMonth}`)}
            </p>
            <div className="chart-container">
              <canvas ref={fcMonthWattageChartRef}></canvas>
            </div>
          </div>

          {/* 3. Fitting Change Wattage Distribution */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i data-lucide="bar-chart-2" style={{ color: 'var(--accent-cyan)', width: '20px', height: '20px' }}></i>
              FC Count by Lamp Wattage {(filterFromDate || filterToDate) ? `(${filterFromDate || 'Start'} to ${filterToDate || 'Today'})` : (filterMonth !== 'ALL' ? `(${filterMonth})` : '')}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {(filterFromDate || filterToDate) ? 'Fitting replacements in the selected date range by wattage' : (filterMonth === 'ALL' ? 'Total fitting replacements by wattage' : `Fitting replacements in ${filterMonth} by wattage`)}
            </p>
            <div className="chart-container">
              <canvas ref={fcWattageChartRef}></canvas>
            </div>
          </div>

          {/* 4. FC Zone Density */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i data-lucide="pie-chart" style={{ color: 'var(--accent-purple)', width: '20px', height: '20px' }}></i>
              Fitting Change Density by Zone {(filterFromDate || filterToDate) ? `(${filterFromDate || 'Start'} to ${filterToDate || 'Today'})` : (filterMonth !== 'ALL' ? `(${filterMonth})` : '')}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {(filterFromDate || filterToDate) ? 'Zone breakdown of Fitting Changes in the selected date range' : (filterMonth === 'ALL' ? 'Regional breakdown of Fitting Change requirements' : `Zone breakdown of Fitting Changes in ${filterMonth}`)}
            </p>
            <div className="chart-container">
              <canvas ref={fcZoneChartRef}></canvas>
            </div>
          </div>

          {/* FC Technician Leaderboard */}
          <div className="glass-panel" style={{ padding: '1.5rem', gridColumn: 'span 2' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i data-lucide="award" style={{ color: 'var(--accent-amber)', width: '20px', height: '20px' }}></i>
              Top Technicians Executing Fitting Changes {filterMonth !== 'ALL' ? `(${filterMonth})` : ''}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {Object.entries(metrics.fcTechs).sort((a,b) => b[1] - a[1]).slice(0, 6).map(([tech, count], index) => (
                <div key={tech} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1rem', fontWeight: '800', width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.2)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      #{index + 1}
                    </span>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', color: '#fff', fontWeight: '700' }}>{tech}</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Technician</p>
                    </div>
                  </div>
                  <span className="badge badge-success">{count} FC Replaced</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT 2: FC MATERIALS & WATTAGES */}
      {activeTab === 'materials' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.8rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: '#fff' }}>
                Fitting Change (FC) Material Requirements Matrix {(filterFromDate || filterToDate) ? `(${filterFromDate || 'Start'} to ${filterToDate || 'Today'})` : (filterMonth !== 'ALL' ? `(${filterMonth})` : '')}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                Total replacement units required and active stock-out on-hold counts categorized by lamp wattage
              </p>
            </div>
            <span className="badge badge-info" style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem' }}>
              ⚡ {metrics.fcTotal.toLocaleString()} Total FC Demands
            </span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
            {['40W', '120W', '90W', '70W', '20W'].map(watt => {
              const color = WATTAGE_COLORS[watt] || '#06b6d4';
              const count = metrics.fcWattages[watt] || 0;
              const onHoldCount = metrics.fcOnHoldWattages[watt] || 0;
              return (
                <div key={watt} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.2rem', borderRadius: '12px', border: `1px solid ${color}44`, borderLeft: `4px solid ${color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <span className="badge" style={{ background: `${color}22`, color: color, border: `1px solid ${color}55`, fontWeight: '700' }}>
                      {watt} Fitting Replacements
                    </span>
                    {onHoldCount > 0 ? (
                      <span className="badge badge-warning" style={{ fontWeight: '800' }}>
                        ⚠️ {onHoldCount} On Hold
                      </span>
                    ) : (
                      <span className="badge badge-success" style={{ fontWeight: '600' }}>
                        ✓ In Stock
                      </span>
                    )}
                  </div>
                  <h4 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fff' }}>{count.toLocaleString()} Units</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                    {watt === '40W' ? 'Standard street light LED fitting replacement' : 
                     watt === '120W' ? 'High wattage arterial road fitting replacement' :
                     watt === '90W' ? 'Medium-high collector road LED fitting' :
                     watt === '70W' ? 'Commercial & junction fitting replacement' :
                     'Residential & lane LED fitting replacement'}
                  </p>
                </div>
              );
            })}

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.44)', borderLeft: '4px solid var(--accent-amber)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <span className="badge badge-warning">All On-Hold Fittings</span>
                <span className="badge badge-danger">Action Required</span>
              </div>
              <h4 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fbbf24' }}>{metrics.fcOnHold.toLocaleString()} Units</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Awaiting replacement lamp materials across region</p>
            </div>
          </div>

          {/* DEDICATED ON HOLD LAMP WATTS BREAKDOWN MATRIX */}
          <div style={{ marginTop: '2rem', background: 'rgba(15, 23, 42, 0.75)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.35)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)' }}>
                  <i data-lucide="alert-octagon" style={{ width: '22px', height: '22px' }}></i>
                </div>
                <div>
                  <h4 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#fff', margin: 0 }}>
                    On-Hold FC Tickets by Lamp Wattage ({metrics.fcOnHold.toLocaleString()} Total On-Hold)
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                    Specific fitting wattages currently stalled due to material stock-out {(filterFromDate || filterToDate) ? `for ${filterFromDate || 'Start'} to ${filterToDate || 'Today'}` : (filterMonth !== 'ALL' ? `for ${filterMonth}` : '')}
                  </p>
                </div>
              </div>
              <span className="badge badge-warning" style={{ fontSize: '0.82rem', padding: '0.35rem 0.8rem' }}>
                {metrics.fcOnHold > 0 ? `${((metrics.fcOnHold / (metrics.fcTotal || 1)) * 100).toFixed(1)}% of All FC Tickets On Hold` : '0% On Hold'}
              </span>
            </div>

            {Object.keys(metrics.fcOnHoldWattages).length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#34d399', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <i data-lucide="check-circle" style={{ width: '32px', height: '32px', marginBottom: '0.5rem' }}></i>
                <h5 style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>No Fittings Currently On Hold!</h5>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.3rem 0 0 0' }}>All fitting replacement requests have been fulfilled or have adequate stock.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                {Object.entries(metrics.fcOnHoldWattages).sort((a,b) => b[1]-a[1]).map(([w, onHoldCount]) => {
                  const wattColor = getWattageColor(w);
                  const totalForWatt = metrics.fcWattages[w] || onHoldCount;
                  const pctOfHold = ((onHoldCount / (metrics.fcOnHold || 1)) * 100).toFixed(1);
                  return (
                    <div key={w} style={{ background: 'rgba(15, 23, 42, 0.85)', padding: '1.2rem', borderRadius: '12px', border: `1px solid ${wattColor}55`, borderTop: `4px solid ${wattColor}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span className="badge" style={{ background: `${wattColor}22`, color: wattColor, border: `1px solid ${wattColor}55`, fontWeight: '800' }}>
                          {w} Lamp Wattage
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#fbbf24' }}>
                          {pctOfHold}% of Hold
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1.7rem', fontWeight: '800', color: '#fbbf24', margin: '0.3rem 0' }}>
                        {onHoldCount.toLocaleString()} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>Units Required</span>
                      </h3>
                      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '9999px', overflow: 'hidden', margin: '0.6rem 0' }}>
                        <div style={{ width: `${pctOfHold}%`, height: '100%', background: wattColor, borderRadius: '9999px' }}></div>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0 }}>
                        {totalForWatt > 0 ? `${((onHoldCount / totalForWatt) * 100).toFixed(1)}% of total ${w} requests on hold` : 'Awaiting stock'}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: DATA TABLE */}
      {activeTab === 'table' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Fitting Change (FC) Ticket Registry ({filteredTickets.length.toLocaleString()})</h3>
            <button className="btn btn-primary" onClick={exportToCSV}>
              <i data-lucide="download" style={{ width: '16px', height: '16px' }}></i>
              Export Filtered CSV
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '0.8rem 1rem' }}>ID</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Submission Time</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Zone / Ward</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Technician</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Lamp Wattage</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Materials</th>
                  <th style={{ padding: '0.8rem 1rem' }}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTickets.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                      {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
                          <span className="glow-dot animate-pulse-glow" style={{ background: 'var(--accent-cyan)', width: '12px', height: '12px' }}></span>
                          <span style={{ fontWeight: '600', color: '#fff', fontSize: '0.95rem' }}>Fetching tickets for {regions.find(r => r.id === selectedRegion)?.name || selectedRegion}...</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Please wait while live records are synchronized.</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                          <i data-lucide="inbox" style={{ width: '38px', height: '38px', color: 'var(--text-dim)', marginBottom: '0.4rem' }}></i>
                          <span style={{ fontWeight: '700', color: '#fff', fontSize: '0.95rem' }}>No Tickets Available (0)</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', maxWidth: '450px' }}>
                            {regionStatusMsg || 'No tickets found matching the selected region or filter criteria.'}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedTickets.map((ticket, idx) => {
                    const wattColor = getWattageColor(ticket['Lamp Watts']);
                    return (
                      <tr key={ticket.ID || idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '0.8rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{ticket['ID'] || '-'}</td>
                        <td style={{ padding: '0.8rem 1rem', color: 'var(--text-muted)' }}>{ticket['Submission Date/Time'] || '-'}</td>
                        <td style={{ padding: '0.8rem 1rem' }}>
                          <span style={{ fontWeight: '600' }}>{normalizeZone(ticket['Zone'])}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block' }}>Ward {ticket['Ward'] || '-'}</span>
                        </td>
                        <td style={{ padding: '0.8rem 1rem' }}>{ticket['Technician Name'] || '-'}</td>
                        <td style={{ padding: '0.8rem 1rem' }}>
                          <span 
                            className="badge" 
                            style={{ 
                              background: `${wattColor}22`, 
                              color: wattColor, 
                              border: `1px solid ${wattColor}55`,
                              fontWeight: '700'
                            }}
                          >
                            {normalizeWattage(ticket['Lamp Watts'])}
                          </span>
                        </td>
                        <td style={{ padding: '0.8rem 1rem' }}>
                          <span className={`badge ${ticket['Work Status'] === 'Completed' ? 'badge-success' : 'badge-warning'}`}>
                            {ticket['Work Status'] || '-'}
                          </span>
                        </td>
                        <td style={{ padding: '0.8rem 1rem', color: 'var(--text-muted)' }}>{ticket['Materials'] || '-'}</td>
                        <td style={{ padding: '0.8rem 1rem', color: 'var(--text-dim)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ticket['Remarks'] || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Page {currentPage} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="btn btn-secondary" style={{ opacity: currentPage === 1 ? 0.5 : 1 }}>Previous</button>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="btn btn-secondary" style={{ opacity: currentPage === totalPages ? 0.5 : 1 }}>Next</button>
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT: MATERIAL INWARD & FC RETURN ANALYSIS */}
      {activeTab === 'inward_analysis' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* TOP CONTROLS & REGION SELECTOR BANNER */}
          <div className="glass-panel" style={{ padding: '1.4rem 1.8rem', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9))', border: '1px solid var(--accent-cyan)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1.2rem', boxShadow: '0 8px 30px rgba(6, 182, 212, 0.2)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="glow-dot animate-pulse-glow" style={{ background: 'var(--accent-cyan)' }}></span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0, color: '#fff', letterSpacing: '-0.02em' }}>
                  FC Tickets vs. Inward Material & Light Count Cross-Analysis
                </h2>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.35rem 0 0 0' }}>
                Reconciling Field Fitting Change (FC) tickets with service center inward materials, repaired dispatches, scrap loss, and wattage-level buffer balances.
              </p>
            </div>

            {/* Header Action & Export */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.7)', padding: '0.45rem 0.85rem', borderRadius: '10px', border: '1px solid rgba(6, 182, 212, 0.4)' }}>
                <i data-lucide="map-pin" style={{ color: 'var(--accent-cyan)', width: '16px', height: '16px' }}></i>
                <span style={{ fontSize: '0.82rem', color: '#fff', fontWeight: '700' }}>
                  {selectedRegion === 'all' || selectedRegion === 'ALL' 
                    ? '🌐 All Integrated Regions (Consolidated)' 
                    : `📍 ${regions.find(r => r.id === selectedRegion)?.name || (inwardSelectedRegion + ' Region')}`}
                </span>
              </div>

              <button 
                onClick={exportInwardToCSV}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.82rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <i data-lucide="download" style={{ width: '16px', height: '16px' }}></i>
                Export Inward CSV
              </button>
            </div>
          </div>

          {/* 5 CROSS-COMPARISON SCORECARD METRIC CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            
            {/* Card 1: Total Field FC Demand */}
            <div className="glass-panel" style={{ padding: '1.3rem', borderLeft: '4px solid var(--accent-amber)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                    Field FC Ticket Demand
                  </span>
                  <h3 style={{ fontSize: '1.85rem', fontWeight: '800', margin: '0.3rem 0 0 0', color: '#fbbf24' }}>
                    {crossComparisonMetrics.totalFcTickets.toLocaleString()} <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 'normal' }}>lights</span>
                  </h3>
                </div>
                <div style={{ padding: '0.6rem', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                  <i data-lucide="zap" style={{ width: '22px', height: '22px' }}></i>
                </div>
              </div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
                {crossComparisonMetrics.fcCompleted.toLocaleString()} completed • {crossComparisonMetrics.fcOnHold} on-hold
              </p>
            </div>

            {/* Card 2: Total Service Inward Received */}
            <div className="glass-panel" style={{ padding: '1.3rem', borderLeft: '4px solid var(--accent-blue)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                    Service Inward Received
                  </span>
                  <h3 style={{ fontSize: '1.85rem', fontWeight: '800', margin: '0.3rem 0 0 0', color: '#38bdf8' }}>
                    {crossComparisonMetrics.inwardRecv.toLocaleString()} <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 'normal' }}>lights</span>
                  </h3>
                </div>
                <div style={{ padding: '0.6rem', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', color: '#38bdf8' }}>
                  <i data-lucide="inbox" style={{ width: '22px', height: '22px' }}></i>
                </div>
              </div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
                Across {inwardMetrics.totalLots.toLocaleString()} recorded inward slips
              </p>
            </div>

            {/* Card 3: Serviced & Dispatched */}
            <div className="glass-panel" style={{ padding: '1.3rem', borderLeft: '4px solid var(--accent-emerald)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                    Serviced & Sent Back
                  </span>
                  <h3 style={{ fontSize: '1.85rem', fontWeight: '800', margin: '0.3rem 0 0 0', color: '#34d399' }}>
                    {crossComparisonMetrics.inwardSent.toLocaleString()} <span style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 'normal' }}>({inwardMetrics.clearanceRate}%)</span>
                  </h3>
                </div>
                <div style={{ padding: '0.6rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                  <i data-lucide="check-circle-2" style={{ width: '22px', height: '22px' }}></i>
                </div>
              </div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
                Tested & returned to field operations
              </p>
            </div>

            {/* Card 4: Tickets to Material Inward Ratio */}
            <div className="glass-panel" style={{ padding: '1.3rem', borderLeft: '4px solid var(--accent-cyan)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                    Tickets to Inward Ratio
                  </span>
                  <h3 style={{ fontSize: '1.85rem', fontWeight: '800', margin: '0.3rem 0 0 0', color: '#06b6d4' }}>
                    {crossComparisonMetrics.inwardToTicketRatio}%
                  </h3>
                </div>
                <div style={{ padding: '0.6rem', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
                  <i data-lucide="percent" style={{ width: '22px', height: '22px' }}></i>
                </div>
              </div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
                {crossComparisonMetrics.inwardRecv.toLocaleString()} Inward Received vs {crossComparisonMetrics.totalFcTickets.toLocaleString()} Demand
              </p>
            </div>

            {/* Card 5: Pending Service (Waiting on Bench) */}
            <div className="glass-panel" style={{ padding: '1.3rem', borderLeft: '4px solid var(--accent-rose)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                    Pending Service
                  </span>
                  <h3 style={{ fontSize: '1.85rem', fontWeight: '800', margin: '0.3rem 0 0 0', color: '#fb7185' }}>
                    {crossComparisonMetrics.inwardWaiting.toLocaleString()} <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 'normal' }}>lights</span>
                  </h3>
                </div>
                <div style={{ padding: '0.6rem', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185' }}>
                  <i data-lucide="clock" style={{ width: '22px', height: '22px' }}></i>
                </div>
              </div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
                Waiting on bench ({crossComparisonMetrics.inwardScrap.toLocaleString()} scrap • {inwardMetrics.scrapRate}% scrap rate)
              </p>
            </div>

          </div>

          {/* WATTAGE-BY-WATTAGE COMPREHENSIVE RECONCILIATION MATRIX TABLE */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.8rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i data-lucide="layers" style={{ color: 'var(--accent-cyan)', width: '20px', height: '20px' }}></i>
                  Wattage-Wise Material Balance & Deficit Reconciliation Matrix ({inwardSelectedRegion === 'ALL' ? 'All Integrated Regions' : inwardSelectedRegion})
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                  Direct comparison between Field FC Demand (fault tickets count) and Service Center Inward Receipts, Repaired Returns, Scrap, and Net Buffer
                </p>
              </div>
              <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                ⚡ Reconciling {crossComparisonMetrics.wattageMatrix.length} Lamp Wattages
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '0.8rem 1rem' }}>Lamp Wattage</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Field FC Demand</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Inward Received</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Serviced & Sent</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Scrap Qty</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Net Buffer / Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {crossComparisonMetrics.wattageMatrix.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                        No comparative wattage records found.
                      </td>
                    </tr>
                  ) : (
                    crossComparisonMetrics.wattageMatrix.map(row => {
                      const wattCol = getWattageColor(row.wattage);
                      return (
                        <tr key={row.wattage} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span 
                              className="badge" 
                              style={{ 
                                background: `${wattCol}22`, 
                                color: wattCol, 
                                border: `1px solid ${wattCol}55`,
                                fontWeight: '800'
                              }}
                            >
                              {row.wattage}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: '700', color: '#fbbf24' }}>
                            {row.fcDemand.toLocaleString()} FCs
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: '700', color: '#38bdf8' }}>
                            {row.inwRecv.toLocaleString()}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: '700', color: '#34d399' }}>
                            {row.inwServiced.toLocaleString()}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: row.inwScrap > 0 ? '#fb7185' : 'var(--text-dim)' }}>
                            {row.inwScrap}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontWeight: '700', color: row.netBuffer >= 0 ? '#34d399' : '#fb7185' }}>
                            {row.netBuffer >= 0 ? `+${row.netBuffer}` : row.netBuffer}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* DYNAMIC COMPARATIVE CHARTS ROW */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
            
            {/* Chart 1: Field FC Demand vs Inward vs Serviced (Grouped Bar) */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i data-lucide="bar-chart-2" style={{ color: 'var(--accent-amber)', width: '20px', height: '20px' }}></i>
                Field FC Demand vs Service Inward & Returns by Wattage
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Reconciliation across all lamp wattages arranged in descending order of Inward Received volume
              </p>
              <div className="chart-container" style={{ minHeight: '340px' }}>
                <canvas ref={comparisonWattChartRef}></canvas>
              </div>
            </div>

            {/* Chart 2: Monthly Demand vs Supply Flow */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i data-lucide="trending-up" style={{ color: 'var(--accent-cyan)', width: '20px', height: '20px' }}></i>
                Monthly Demand vs Supply Reconciliation Trend
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Monthly trajectory of Field FC Complaints vs Inward Receipts vs Repaired Returns
              </p>
              <div className="chart-container">
                <canvas ref={comparisonMonthChartRef}></canvas>
              </div>
            </div>

            {/* Chart 3: Brand / Make Quality & Scrap Breakdown */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i data-lucide="shield-alert" style={{ color: 'var(--accent-rose)', width: '20px', height: '20px' }}></i>
                Vendor Inward Volume & Scrap Comparison
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Comparison of total units received vs scrapped across major vendors (Philips, Crompton, Schreder, Grandee, Surya)
              </p>
              <div className="chart-container">
                <canvas ref={inwardMakeChartRef}></canvas>
              </div>
            </div>

            {/* Chart 4: Wattage Volume Distribution & Service Center Efficiency / TAT Cockpit (Full-Width Cockpit) */}
            <div className="glass-panel" style={{ padding: '1.6rem', gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.8rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
                    <i data-lucide="gauge" style={{ color: 'var(--accent-purple)', width: '22px', height: '22px' }}></i>
                    Inward Wattage Mix & Service Center TAT Efficiency Cockpit
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                    Luminaire volume mix combined with repair turnaround velocity, recovery rates & bench performance benchmarks
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                  <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.3)', fontWeight: '700', fontSize: '0.78rem' }}>
                    ⚡ {inwardMetrics.avgTat !== '--' ? `Avg TAT: ${inwardMetrics.avgTat} Days` : 'TAT Active'}
                  </span>
                  <span className="badge badge-success" style={{ fontSize: '0.78rem' }}>
                    ✓ {inwardMetrics.clearanceRate}% Clearance
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) 1fr', gap: '1.8rem', alignItems: 'center', marginTop: '1rem' }}>
                
                {/* Left: Inward Wattage Doughnut / Pie Chart in original position */}
                <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '1.2rem', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Inward Wattage Mix</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', fontWeight: '800' }}>{inwardMetrics.totalReceived.toLocaleString()} Total Units</span>
                  </div>
                  <div className="chart-container" style={{ height: '280px', position: 'relative' }}>
                    <canvas ref={inwardWattChartRef}></canvas>
                  </div>
                </div>

                {/* Right: Service Center Efficiency & TAT Cockpit filling the entire empty space on the right */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', background: 'rgba(15, 23, 42, 0.65)', padding: '1.4rem', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <i data-lucide="activity" style={{ color: 'var(--accent-emerald)', width: '18px', height: '18px' }}></i>
                      Service Center Operational Efficiency & Turnaround Cockpit
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Based on {inwardMetrics.totalLots.toLocaleString()} inward slips
                    </span>
                  </div>

                  {/* 4 Scorecard KPI Blocks */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.85rem' }}>
                    
                    {/* KPI 1: Turnaround Time */}
                    <div style={{ background: 'rgba(30, 41, 59, 0.75)', padding: '0.9rem 1rem', borderRadius: '12px', borderLeft: '4px solid var(--accent-cyan)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', fontWeight: '700', textTransform: 'uppercase' }}>Avg Turnaround</span>
                      <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#38bdf8', marginTop: '0.2rem' }}>
                        {inwardMetrics.avgTat !== '--' ? `${inwardMetrics.avgTat} Days` : '--'}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Assign date to mail date</span>
                    </div>

                    {/* KPI 2: Recovery / Clearance */}
                    <div style={{ background: 'rgba(30, 41, 59, 0.75)', padding: '0.9rem 1rem', borderRadius: '12px', borderLeft: '4px solid var(--accent-emerald)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', fontWeight: '700', textTransform: 'uppercase' }}>Clearance Rate</span>
                      <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#34d399', marginTop: '0.2rem' }}>
                        {inwardMetrics.clearanceRate}%
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{inwardMetrics.totalServiced.toLocaleString()} units restored</span>
                    </div>

                    {/* KPI 3: Scrap & Rejection */}
                    <div style={{ background: 'rgba(30, 41, 59, 0.75)', padding: '0.9rem 1rem', borderRadius: '12px', borderLeft: '4px solid var(--accent-rose)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', fontWeight: '700', textTransform: 'uppercase' }}>Scrap Loss</span>
                      <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#fb7185', marginTop: '0.2rem' }}>
                        {inwardMetrics.scrapRate}%
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{inwardMetrics.totalScrap.toLocaleString()} unrecoverable</span>
                    </div>

                    {/* KPI 4: Bench WIP Backlog */}
                    <div style={{ background: 'rgba(30, 41, 59, 0.75)', padding: '0.9rem 1rem', borderRadius: '12px', borderLeft: '4px solid var(--accent-amber)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', fontWeight: '700', textTransform: 'uppercase' }}>Bench WIP Queue</span>
                      <div style={{ fontSize: '1.45rem', fontWeight: '800', color: '#fbbf24', marginTop: '0.2rem' }}>
                        {inwardMetrics.totalWaiting.toLocaleString()}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Waiting for repair</span>
                    </div>

                  </div>

                  {/* Top Lamp Wattage Clearance Breakdown Velocity Bars */}
                  <div style={{ background: 'rgba(30, 41, 59, 0.45)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Top Wattages Repair vs Scrap Velocity
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Restored vs Received</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.8rem' }}>
                      {Object.entries(inwardMetrics.wattMap)
                        .sort((a, b) => b[1].received - a[1].received)
                        .slice(0, 4)
                        .map(([watt, val]) => {
                          const clRate = val.received > 0 ? Math.round((val.sent / val.received) * 100) : 0;
                          const color = getWattageColor(watt);
                          return (
                            <div key={watt} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: `1px solid ${color}33` }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', fontSize: '0.75rem' }}>
                                <span style={{ fontWeight: '800', color: color }}>{watt} Lamp</span>
                                <span style={{ fontWeight: '800', color: '#fff' }}>{clRate}% Cleared</span>
                              </div>
                              <div style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                                <div style={{ width: `${clRate}%`, background: color, height: '100%', borderRadius: '4px' }}></div>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem', fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                                <span>{val.sent.toLocaleString()} sent</span>
                                <span>{val.received.toLocaleString()} received ({val.scrap || 0} scrap)</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                </div>

              </div>

            </div>

          </div>

          {/* INWARD REGISTRY TABLE WITH FILTERS & SEARCH */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            
            {/* Table Control Bar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.9rem', marginBottom: '1.2rem' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
                <input 
                  type="text" 
                  placeholder="Search Slip No, description, make, wattage, remarks..."
                  value={inwardSearch}
                  onChange={(e) => handleGlobalSearchChange(e.target.value)}
                  className="glass-input"
                  style={{ width: '100%', paddingLeft: '2.5rem' }}
                />
                <i data-lucide="search" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', width: '18px', height: '18px' }}></i>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                {/* Status Filter */}
                <select 
                  value={inwardStatusFilter} 
                  onChange={(e) => handleGlobalStatusChange(e.target.value)}
                  className="glass-input"
                  style={{ borderColor: inwardStatusFilter !== 'ALL' ? 'var(--accent-cyan)' : 'var(--border-color)', fontWeight: inwardStatusFilter !== 'ALL' ? '700' : 'normal' }}
                >
                  <option value="ALL" style={{ background: '#0f172a' }}>All Service Statuses</option>
                  <option value="COMPLETED" style={{ background: '#0f172a' }}>Completed & Returned</option>
                  <option value="PENDING" style={{ background: '#0f172a' }}>Pending / In Service</option>
                </select>

                {/* Wattage Filter */}
                <select 
                  value={inwardWattFilter} 
                  onChange={(e) => handleGlobalWattageChange(e.target.value)}
                  className="glass-input"
                >
                  <option value="ALL" style={{ background: '#0f172a' }}>All Wattages</option>
                  {uniqueInwardWatts.map(w => (
                    <option key={w} value={w} style={{ background: '#0f172a' }}>{w}</option>
                  ))}
                </select>

                {/* Make Filter */}
                <select 
                  value={inwardMakeFilter} 
                  onChange={(e) => { setInwardMakeFilter(e.target.value); setInwardPage(1); }}
                  className="glass-input"
                >
                  <option value="ALL" style={{ background: '#0f172a' }}>All Makes / Brands</option>
                  {uniqueInwardMakes.map(m => (
                    <option key={m} value={m} style={{ background: '#0f172a' }}>{m}</option>
                  ))}
                </select>

                {(inwardSearch || inwardStatusFilter !== 'ALL' || inwardWattFilter !== 'ALL' || inwardMakeFilter !== 'ALL') && (
                  <button 
                    onClick={() => {
                      setInwardSearch('');
                      setInwardStatusFilter('ALL');
                      setInwardWattFilter('ALL');
                      setInwardMakeFilter('ALL');
                      setInwardPage(1);
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem', borderRadius: '8px' }}
                  >
                    ✕ Reset Filters
                  </button>
                )}
              </div>
            </div>

            {/* Inward Slips Data Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '0.8rem 1rem' }}>Slip No</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Region</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Inward Date</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Mail / Sent Date</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Make & Model</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Wattage</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Received</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Serviced</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Scrap</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Waiting</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Remarks / Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInward.length === 0 ? (
                    <tr>
                      <td colSpan="12" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                        <i data-lucide="inbox" style={{ width: '36px', height: '36px', color: 'var(--text-dim)', marginBottom: '0.4rem' }}></i>
                        <p style={{ fontWeight: '700', color: '#fff', margin: '0.2rem 0' }}>No Inward Records Found</p>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Try changing the search keywords or filters.</span>
                      </td>
                    </tr>
                  ) : (
                    paginatedInward.map((row, idx) => (
                      <tr key={row['S-No'] || idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '0.8rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontWeight: '700' }}>
                          {row['Slip No'] || `S-${row['S-No']}`}
                        </td>
                        <td style={{ padding: '0.8rem 1rem' }}>
                          <span style={{ fontWeight: '600', color: '#fff' }}>{row['Location']}</span>
                        </td>
                        <td style={{ padding: '0.8rem 1rem', color: 'var(--text-muted)' }}>
                          {row['Assigning Date'] || '-'}
                        </td>
                        <td style={{ padding: '0.8rem 1rem', color: 'var(--text-muted)' }}>
                          {row['Mail Date'] || '-'}
                        </td>
                        <td style={{ padding: '0.8rem 1rem' }}>
                          <span style={{ fontWeight: '600' }}>{row['Make']}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row['Drawing Number & Description'] || ''}
                          </span>
                        </td>
                        <td style={{ padding: '0.8rem 1rem' }}>
                          <span className="badge badge-info" style={{ fontWeight: '700' }}>
                            {normalizeWattage(row['Wattage'])}
                          </span>
                        </td>
                        <td style={{ padding: '0.8rem 1rem', fontWeight: '700', color: '#fff' }}>
                          {row['Received Qty']}
                        </td>
                        <td style={{ padding: '0.8rem 1rem', color: '#34d399', fontWeight: '700' }}>
                          {row['Serviced / Sent Qty']}
                        </td>
                        <td style={{ padding: '0.8rem 1rem', color: Number(row['Scrap Qty']) > 0 ? '#fb7185' : 'var(--text-dim)' }}>
                          {row['Scrap Qty'] || 0}
                        </td>
                        <td style={{ padding: '0.8rem 1rem', color: Number(row['Waiting for Service Qty']) > 0 ? '#fbbf24' : 'var(--text-dim)' }}>
                          {row['Waiting for Service Qty'] || 0}
                        </td>
                        <td style={{ padding: '0.8rem 1rem' }}>
                          <span className={`badge ${row['Service Status'] === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`}>
                            {row['Service Status'] === 'COMPLETED' ? 'Completed' : 'Pending WIP'}
                          </span>
                        </td>
                        <td style={{ padding: '0.8rem 1rem', color: 'var(--text-dim)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row['Remarks / Reason'] || ''}>
                          {row['Remarks / Reason'] || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Page {inwardPage} of {totalInwardPages} ({filteredInward.length.toLocaleString()} matching records)
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  disabled={inwardPage === 1} 
                  onClick={() => setInwardPage(p => Math.max(1, p - 1))} 
                  className="btn btn-secondary" 
                  style={{ opacity: inwardPage === 1 ? 0.5 : 1 }}
                >
                  Previous
                </button>
                <button 
                  disabled={inwardPage === totalInwardPages} 
                  onClick={() => setInwardPage(p => Math.min(totalInwardPages, p + 1))} 
                  className="btn btn-secondary" 
                  style={{ opacity: inwardPage === totalInwardPages ? 0.5 : 1 }}
                >
                  Next
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB CONTENT 4: APPSHEET INTEGRATION GUIDE */}
      {activeTab === 'appsheet_guide' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '1rem' }}>AppSheet & Google Sheets Integration Guide</h2>
            <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
              Follow these simple steps to auto-sync your region's Fitting Change (FC) data from Google Sheets or AppSheet API directly to this dashboard.
            </p>
          </div>
        </div>
      )}

      {/* CONFIG MODAL - REGIONAL GOOGLE SHEETS MANAGER */}
      {showConfigModal && (
        <div className="modal-overlay" onClick={() => setShowConfigModal(false)}>
          <div className="modal-content" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#fff' }}>⚡ Live Regional Google Sheets Manager</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Configure Google Sheet URLs for your regions or add new regions dynamically.</p>
              </div>
              <button onClick={() => setShowConfigModal(false)} className="btn btn-secondary">✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '1.5rem', borderRadius: '14px', border: '1px solid var(--accent-cyan)', boxShadow: '0 4px 20px rgba(6, 182, 212, 0.15)' }}>
                
                {/* Modal Actions Header Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span className="badge badge-info">100% Automatic Live Sync</span>
                  <button 
                    className="btn btn-accent" 
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
                    onClick={() => setShowAddRegionForm(!showAddRegionForm)}
                  >
                    <i data-lucide="plus-circle" style={{ width: '15px', height: '15px' }}></i>
                    {showAddRegionForm ? 'Close Form' : '+ Add New Region'}
                  </button>
                </div>

                {/* ADD NEW REGION INLINE FORM */}
                {showAddRegionForm && (
                  <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--accent-cyan)', marginBottom: '1.2rem' }}>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)', fontWeight: '700', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <i data-lucide="plus-circle" style={{ width: '16px', height: '16px' }}></i> Add New Region & Spreadsheet URL
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem', fontWeight: '600' }}>
                          Region Name
                        </label>
                        <input 
                          type="text" 
                          placeholder="e.g. Salem Region / Trichy Division"
                          value={newRegionName}
                          onChange={(e) => setNewRegionName(e.target.value)}
                          className="glass-input"
                          style={{ width: '100%', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem', fontWeight: '600' }}>
                          Google Spreadsheet URL or Sheet ID
                        </label>
                        <input 
                          type="text" 
                          placeholder="Paste Google Sheet URL (e.g. https://docs.google.com/spreadsheets/d/19hEpNy...)"
                          value={newRegionUrl}
                          onChange={(e) => setNewRegionUrl(e.target.value)}
                          className="glass-input"
                          style={{ width: '100%', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.3rem' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ fontSize: '0.78rem', padding: '0.35rem 0.8rem' }}
                          onClick={() => {
                            setShowAddRegionForm(false);
                            setNewRegionName('');
                            setNewRegionUrl('');
                          }}
                        >
                          Cancel
                        </button>
                        <button 
                          className="btn btn-primary" 
                          style={{ fontSize: '0.78rem', padding: '0.35rem 1rem' }}
                          onClick={handleAddRegion}
                        >
                          ✓ Add Region
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* REGIONS LIST */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.2rem', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
                  {regions.map((reg, idx) => (
                    <div key={reg.id} style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '0.9rem 1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input 
                            type="text"
                            value={reg.name}
                            onChange={(e) => {
                              const updated = [...regions];
                              updated[idx].name = e.target.value;
                              setRegions(updated);
                            }}
                            className="glass-input"
                            style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', fontWeight: '700', padding: '0.2rem 0.5rem', background: 'transparent', border: '1px transparent solid' }}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {reg.id === selectedRegion && (
                            <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Active Selected Region</span>
                          )}
                          {regions.length > 1 && (
                            <button 
                              onClick={() => handleDeleteRegion(reg.id)}
                              title="Delete Region"
                              style={{ background: 'transparent', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', fontSize: '0.9rem', padding: '0.2rem' }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                      <input 
                        type="text" 
                        placeholder="Paste Google Sheet URL or ID (e.g. https://docs.google.com/spreadsheets/d/...)"
                        value={reg.sheetId || reg.url || ''}
                        onChange={(e) => {
                          const updated = [...regions];
                          const val = e.target.value;
                          updated[idx].url = val;
                          const match = val.match(/\/d\/([a-zA-Z0-9-_]+)/);
                          updated[idx].sheetId = (match && match[1]) ? match[1] : val;
                          setRegions(updated);
                        }}
                        className="glass-input"
                        style={{ width: '100%', fontSize: '0.82rem' }}
                      />
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end' }}>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => setShowConfigModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn btn-primary" 
                    style={{ padding: '0.6rem 1.4rem' }}
                    disabled={isSyncing}
                    onClick={() => {
                      localStorage.setItem('appsheet_fc_4_regions', JSON.stringify(regions));
                      const currentReg = regions.find(r => r.id === selectedRegion);
                      if (currentReg) {
                        fetchGoogleSheetData(currentReg.sheetId || currentReg.url, true);
                      }
                      setShowConfigModal(false);
                    }}
                  >
                    <i data-lucide="refresh-cw" style={{ width: '16px', height: '16px' }}></i>
                    {isSyncing ? 'Syncing...' : 'Save & Sync Live Data'}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
setTimeout(() => { if (window.lucide) window.lucide.createIcons(); }, 100);
