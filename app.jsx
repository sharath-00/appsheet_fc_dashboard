const { useState, useEffect, useMemo, useRef } = React;

// 4 Integrated Regional Google Sheets Configuration (Coimbatore, Erode, Vellore, Tiruppur)
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
  }
];

// Fixed Brand & Semantic Color Mapping for each Lamp Wattage
const WATTAGE_COLORS = {
  '40W': '#06b6d4',       // 40W -> Cyan
  '120W': '#3b82f6',      // 120W -> Royal Blue
  '90W': '#8b5cf6',       // 90W -> Purple
  '70W': '#f59e0b',       // 70W -> Amber / Orange
  '20W': '#10b981',       // 20W -> Emerald Green
  '150W': '#ec4899',      // 150W -> Pink
  '250W': '#f43f5e',      // 250W -> Rose
  '24W': '#14b8a6',       // 24W -> Teal
  '60W': '#6366f1',       // 60W -> Indigo
  'Unspecified': '#64748b'// Unspecified / Other -> Slate Gray
};

const getWattageColor = (wattStr) => {
  if (!wattStr) return '#64748b';
  const clean = String(wattStr).trim().toUpperCase();
  if (clean.includes('40')) return WATTAGE_COLORS['40W'];
  if (clean.includes('120')) return WATTAGE_COLORS['120W'];
  if (clean.includes('90')) return WATTAGE_COLORS['90W'];
  if (clean.includes('70')) return WATTAGE_COLORS['70W'];
  if (clean.includes('20') && !clean.includes('120')) return WATTAGE_COLORS['20W'];
  if (clean.includes('150')) return WATTAGE_COLORS['150W'];
  if (clean.includes('250')) return WATTAGE_COLORS['250W'];
  if (clean.includes('24')) return WATTAGE_COLORS['24W'];
  if (clean.includes('60')) return WATTAGE_COLORS['60W'];
  return WATTAGE_COLORS[clean] || '#64748b';
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
  const [filterMonth, setFilterMonth] = useState('ALL');
  const [filterComplaintType, setFilterComplaintType] = useState('ALL');
  const [filterWorkStatus, setFilterWorkStatus] = useState('ALL');
  const [filterZone, setFilterZone] = useState('ALL');
  const [filterWattage, setFilterWattage] = useState('ALL');
  
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

  // Chart Refs
  const fcMonthTrendChartRef = useRef(null);
  const fcMonthWattageChartRef = useRef(null);
  const fcWattageChartRef = useRef(null);
  const fcZoneChartRef = useRef(null);
  const complaintChartRef = useRef(null);
  const materialChartRef = useRef(null);

  const chartInstances = useRef({});

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
  }, [showConfigModal, showAddRegionForm, loading, regionStatusMsg, activeTab]);

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

      // Dropdown Filters
      const monthMatch = filterMonth === 'ALL' || getMonthKey(item['Submission Date/Time']) === filterMonth;
      const complaintMatch = filterComplaintType === 'ALL' || cType === String(filterComplaintType).trim().toUpperCase();
      const statusMatch = filterWorkStatus === 'ALL' || String(item['Work Status'] || '').includes(filterWorkStatus);
      const zoneMatch = filterZone === 'ALL' || normalizeZone(item['Zone']) === filterZone;
      const wattageMatch = filterWattage === 'ALL' || String(item['Lamp Watts'] || '').startsWith(filterWattage);

      return searchMatch && monthMatch && complaintMatch && statusMatch && zoneMatch && wattageMatch;
    });
  }, [rawTickets, searchQuery, filterMonth, filterComplaintType, filterWorkStatus, filterZone, filterWattage]);

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

      // Dropdown Filters
      const monthMatch = filterMonth === 'ALL' || getMonthKey(item['Submission Date/Time']) === filterMonth;
      const complaintMatch = filterComplaintType === 'ALL' || cType === String(filterComplaintType).trim().toUpperCase();
      const statusMatch = filterWorkStatus === 'ALL' || String(item['Work Status'] || '').includes(filterWorkStatus);
      const zoneMatch = filterZone === 'ALL' || normalizeZone(item['Zone']) === filterZone;
      const wattageMatch = filterWattage === 'ALL' || String(item['Lamp Watts'] || '').startsWith(filterWattage);

      return searchMatch && monthMatch && complaintMatch && statusMatch && zoneMatch && wattageMatch;
    });
  }, [rawTickets, fcFocusOnly, searchQuery, filterMonth, filterComplaintType, filterWorkStatus, filterZone, filterWattage]);

  // Overall & FC Specific Metrics
  const metrics = useMemo(() => {
    // FC Tickets in the active filtered dataset
    const fcTickets = filteredTickets.filter(t => {
      const cType = String(t['Complaint Type'] || '').trim().toUpperCase();
      return cType === 'FC' || cType.includes('FITTING');
    });

    // All FC tickets in raw dataset for monthly trends chart
    const allFcTickets = rawTickets.filter(t => {
      const cType = String(t['Complaint Type'] || '').trim().toUpperCase();
      return cType === 'FC' || cType.includes('FITTING');
    });

    const fcCompleted = fcTickets.filter(t => (t['Work Status'] || '').includes('Completed')).length;
    const fcOnHold = fcTickets.filter(t => (t['Work Status'] || '').includes('On Hold')).length;
    const fcCompletionRate = fcTickets.length > 0 ? ((fcCompleted / fcTickets.length) * 100).toFixed(1) : 0;

    // Period FC Counts & Wattage Breakdown (Month-wise if ALL, Week-wise if specific month selected)
    const fcPeriodCounts = {};
    const fcPeriodWattages = {};

    if (filterMonth === 'ALL') {
      allFcTickets.forEach(t => {
        const mKey = getMonthKey(t['Submission Date/Time']);
        fcPeriodCounts[mKey] = (fcPeriodCounts[mKey] || 0) + 1;

        if (!fcPeriodWattages[mKey]) {
          fcPeriodWattages[mKey] = { '40W': 0, '120W': 0, '90W': 0, '70W': 0, '20W': 0 };
        }
        const rawWatts = String(t['Lamp Watts'] || '').trim();
        if (rawWatts.startsWith('40')) fcPeriodWattages[mKey]['40W']++;
        else if (rawWatts.startsWith('120')) fcPeriodWattages[mKey]['120W']++;
        else if (rawWatts.startsWith('90')) fcPeriodWattages[mKey]['90W']++;
        else if (rawWatts.startsWith('70')) fcPeriodWattages[mKey]['70W']++;
        else if (rawWatts.startsWith('20')) fcPeriodWattages[mKey]['20W']++;
      });
    } else {
      const WEEK_KEYS = ['Week 1 (Day 1-7)', 'Week 2 (Day 8-14)', 'Week 3 (Day 15-21)', 'Week 4 (Day 22-28)', 'Week 5 (Day 29-31)'];
      WEEK_KEYS.forEach(w => {
        fcPeriodCounts[w] = 0;
        fcPeriodWattages[w] = { '40W': 0, '120W': 0, '90W': 0, '70W': 0, '20W': 0 };
      });

      fcTickets.forEach(t => {
        const wKey = getWeekKey(t['Submission Date/Time']);
        fcPeriodCounts[wKey] = (fcPeriodCounts[wKey] || 0) + 1;

        if (!fcPeriodWattages[wKey]) {
          fcPeriodWattages[wKey] = { '40W': 0, '120W': 0, '90W': 0, '70W': 0, '20W': 0 };
        }
        const rawWatts = String(t['Lamp Watts'] || '').trim();
        if (rawWatts.startsWith('40')) fcPeriodWattages[wKey]['40W']++;
        else if (rawWatts.startsWith('120')) fcPeriodWattages[wKey]['120W']++;
        else if (rawWatts.startsWith('90')) fcPeriodWattages[wKey]['90W']++;
        else if (rawWatts.startsWith('70')) fcPeriodWattages[wKey]['70W']++;
        else if (rawWatts.startsWith('20')) fcPeriodWattages[wKey]['20W']++;
      });
    }

    // FC Wattage Distribution (For active filtered month/zone)
    const fcWattages = {};
    fcTickets.forEach(t => {
      const w = t['Lamp Watts'] ? `${t['Lamp Watts']}W` : 'Unspecified';
      fcWattages[w] = (fcWattages[w] || 0) + 1;
    });

    // FC Zone Breakdown (Normalized for active filtered month)
    const fcZones = {};
    fcTickets.forEach(t => {
      const z = normalizeZone(t['Zone']);
      fcZones[z] = (fcZones[z] || 0) + 1;
    });

    // FC Technician Leaderboard (For active filtered month)
    const fcTechs = {};
    fcTickets.forEach(t => {
      const tech = t['Technician Name'] || 'Unassigned';
      fcTechs[tech] = (fcTechs[tech] || 0) + 1;
    });

    // FC On Hold Wattage Breakdown (Which wattages are waiting on hold)
    const fcOnHoldWattages = {};
    fcTickets.filter(t => (t['Work Status'] || '').includes('On Hold')).forEach(t => {
      const rawW = t['Lamp Watts'] ? String(t['Lamp Watts']).trim() : '';
      const w = rawW ? (rawW.endsWith('W') ? rawW : `${rawW}W`) : 'Unspecified';
      fcOnHoldWattages[w] = (fcOnHoldWattages[w] || 0) + 1;
    });

    // Global Metrics (Total = ALL ticket types in month/filters; FC = FC tickets specifically)
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
      fcPeriodCounts,
      fcPeriodWattages,
      pctOfTotal: total > 0 ? ((fcTickets.length / total) * 100).toFixed(1) : 0
    };
  }, [rawTickets, filteredTickets, allTypeFilteredTickets, filterMonth]);

  const uniqueZones = useMemo(() => Array.from(new Set(rawTickets.map(t => normalizeZone(t['Zone'])).filter(Boolean))).sort(), [rawTickets]);
  const uniqueWattages = ['40', '120', '90', '70', '20'];
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

  // Chart Rendering Engine
  useEffect(() => {
    if (loading || activeTab === 'appsheet_guide') return;

    Object.values(chartInstances.current).forEach(c => c && c.destroy());

    // 1. Month-Wise / Week-Wise FC Count Line Chart
    if (fcMonthTrendChartRef.current && activeTab === 'fc_centric') {
      const ctx = fcMonthTrendChartRef.current.getContext('2d');
      const periods = Object.keys(metrics.fcPeriodCounts);
      const counts = Object.values(metrics.fcPeriodCounts);

      chartInstances.current.fcMonthTrend = new Chart(ctx, {
        type: 'line',
        data: {
          labels: periods,
          datasets: [{
            label: filterMonth === 'ALL' ? 'Monthly FC Tickets' : `Weekly FC Tickets (${filterMonth})`,
            data: counts,
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.15)',
            borderWidth: 3,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#38bdf8',
            pointRadius: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
            y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
          },
          plugins: { legend: { display: false } }
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

    // 3. FC Fitting Wattages Chart (Bar with Fixed Colors per Wattage)
    if (fcWattageChartRef.current && activeTab === 'fc_centric') {
      const ctx = fcWattageChartRef.current.getContext('2d');
      const sortedWattages = Object.entries(metrics.fcWattages).sort((a, b) => b[1] - a[1]).slice(0, 8);

      chartInstances.current.fcWattage = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: sortedWattages.map(w => w[0]),
          datasets: [{
            label: 'Fitting Changes (Count)',
            data: sortedWattages.map(w => w[1]),
            backgroundColor: sortedWattages.map(w => getWattageColor(w[0])),
            borderRadius: 8
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

    // 4. FC Zone Distribution Chart (Doughnut)
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

  }, [metrics, activeTab, loading]);

  // CSV Exporter
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.6)', padding: '0.4rem 0.8rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <i data-lucide="map-pin" style={{ color: 'var(--accent-cyan)', width: '16px', height: '16px' }}></i>
            <select 
              value={selectedRegion} 
              onChange={(e) => {
                const val = e.target.value;
                setRawTickets([]);
                setLoading(true);
                setLoadingProgress(15);
                setRegionStatusMsg(null);
                setSelectedRegion(val);
              }}
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.85rem', fontWeight: '600', outline: 'none', cursor: 'pointer' }}
            >
              {regions.map(reg => (
                <option key={reg.id} value={reg.id} style={{ background: '#0f172a' }}>
                  {reg.name}
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

      {/* ACTIVE MONTH FOCUS BANNER */}
      {activeTab !== 'appsheet_guide' && filterMonth !== 'ALL' && (
        <div className="glass-panel" style={{ padding: '0.8rem 1.4rem', marginBottom: '1.2rem', background: 'linear-gradient(90deg, rgba(6,182,212,0.18), rgba(99,102,241,0.18))', border: '1px solid var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <i data-lucide="calendar" style={{ color: 'var(--accent-cyan)', width: '22px', height: '22px' }}></i>
            <div>
              <span style={{ fontWeight: '800', fontSize: '1rem', color: '#fff' }}>
                Active Month Analytics Focus: <span style={{ color: 'var(--accent-cyan)' }}>{filterMonth}</span>
              </span>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>All KPI cards, wattage charts, zone densities, and material requirements below are filtered specifically for {filterMonth}</p>
            </div>
          </div>
          <button 
            onClick={() => setFilterMonth('ALL')} 
            className="btn btn-secondary" 
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.9rem', borderRadius: '8px' }}
          >
            ✕ Reset to Full Year View
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
                  {filterMonth === 'ALL' ? 'Total Tickets' : `Total Tickets (${filterMonth})`}
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
              {loading ? 'Loading tickets...' : (filterMonth === 'ALL' ? 'All fault ticket entries logged' : `Fault tickets logged in ${filterMonth}`)}
            </p>
          </div>

          {/* Card 2: Fitting Change (FC) Tickets */}
          <div className="glass-panel" style={{ padding: '1.4rem', borderLeft: '4px solid var(--accent-cyan)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {filterMonth === 'ALL' ? 'FC (Fitting Change) Tickets' : `FC Tickets (${filterMonth})`}
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
              {loading ? '0% completed' : `${metrics.pctOfTotal}% of ${filterMonth === 'ALL' ? 'all tickets' : filterMonth} (${metrics.fcCompleted.toLocaleString()} completed)`}
            </p>
          </div>

          {/* Card 3: FC Pending Material Hold */}
          <div className="glass-panel" style={{ padding: '1.4rem', borderLeft: '4px solid var(--accent-amber)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {filterMonth === 'ALL' ? 'FC Material Hold' : `FC Material Hold (${filterMonth})`}
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
                  {filterMonth === 'ALL' ? 'Primary Fitting Type' : `Primary Fitting (${filterMonth})`}
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

      {/* FILTER BAR */}
      {activeTab !== 'appsheet_guide' && (
        <div className="glass-panel" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
            <input 
              type="text" 
              placeholder="Search FC ID, technician, wattage, ward, remarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass-input"
              style={{ width: '100%', paddingLeft: '2.5rem' }}
            />
            <i data-lucide="search" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', width: '18px', height: '18px' }}></i>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            
            {/* Month-Wise Filter */}
            <select 
              value={filterMonth} 
              onChange={(e) => setFilterMonth(e.target.value)} 
              className="glass-input"
              style={{ borderColor: filterMonth !== 'ALL' ? 'var(--accent-cyan)' : 'var(--border-color)', fontWeight: filterMonth !== 'ALL' ? '700' : 'normal' }}
            >
              <option value="ALL" style={{ background: '#0f172a' }}>📅 All Months (Full Year)</option>
              {uniqueMonths.map(m => (
                <option key={m} value={m} style={{ background: '#0f172a' }}>🗓️ {m} Analytics</option>
              ))}
            </select>

            {/* Lamp Wattage Filter */}
            <select value={filterWattage} onChange={(e) => setFilterWattage(e.target.value)} className="glass-input">
              <option value="ALL" style={{ background: '#0f172a' }}>All Fitting Wattages</option>
              {uniqueWattages.map(w => (
                <option key={w} value={w} style={{ background: '#0f172a' }}>{w}W Fittings</option>
              ))}
            </select>

            {/* Zone Filter */}
            <select value={filterZone} onChange={(e) => setFilterZone(e.target.value)} className="glass-input">
              <option value="ALL" style={{ background: '#0f172a' }}>All Zones</option>
              {uniqueZones.map(z => (
                <option key={z} value={z} style={{ background: '#0f172a' }}>{z}</option>
              ))}
            </select>

            {/* Work Status Filter */}
            <select value={filterWorkStatus} onChange={(e) => setFilterWorkStatus(e.target.value)} className="glass-input">
              <option value="ALL" style={{ background: '#0f172a' }}>All Statuses</option>
              <option value="Completed" style={{ background: '#0f172a' }}>Completed FCs</option>
              <option value="On Hold : Materials Required" style={{ background: '#0f172a' }}>On Hold FCs</option>
            </select>
          </div>
        </div>
      )}

      {/* TAB CONTENT 1: FC CENTRIC COMMAND CENTER */}
      {activeTab === 'fc_centric' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
          
          {/* 1. Month-Wise / Week-Wise FC Ticket Trend */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i data-lucide="trending-up" style={{ color: 'var(--accent-cyan)', width: '20px', height: '20px' }}></i>
              {filterMonth === 'ALL' ? 'Month-Wise Fitting Change (FC) Ticket Volume' : `Week-Wise Fitting Change (FC) Ticket Volume (${filterMonth})`}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {filterMonth === 'ALL' ? 'Monthly trend of Fitting Changes logged across the region' : `Weekly trend of Fitting Changes logged in ${filterMonth}`}
            </p>
            <div className="chart-container">
              <canvas ref={fcMonthTrendChartRef}></canvas>
            </div>
          </div>

          {/* 2. Month-Wise / Week-Wise Lamp Watts Breakdown */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i data-lucide="layers" style={{ color: 'var(--accent-indigo)', width: '20px', height: '20px' }}></i>
              {filterMonth === 'ALL' ? 'Month-Wise Lamp Watts Distribution (40W, 120W, 90W, 70W)' : `Week-Wise Lamp Watts Distribution (${filterMonth})`}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {filterMonth === 'ALL' ? 'Stacked breakdown of replaced fitting wattages by month' : `Stacked breakdown of replaced fitting wattages by week in ${filterMonth}`}
            </p>
            <div className="chart-container">
              <canvas ref={fcMonthWattageChartRef}></canvas>
            </div>
          </div>

          {/* 3. Fitting Change Wattage Distribution */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i data-lucide="bar-chart-2" style={{ color: 'var(--accent-cyan)', width: '20px', height: '20px' }}></i>
              FC Count by Lamp Wattage {filterMonth !== 'ALL' ? `(${filterMonth})` : ''}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {filterMonth === 'ALL' ? 'Total fitting replacements by wattage' : `Fitting replacements in ${filterMonth} by wattage`}
            </p>
            <div className="chart-container">
              <canvas ref={fcWattageChartRef}></canvas>
            </div>
          </div>

          {/* 4. FC Zone Density */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i data-lucide="pie-chart" style={{ color: 'var(--accent-purple)', width: '20px', height: '20px' }}></i>
              Fitting Change Density by Zone {filterMonth !== 'ALL' ? `(${filterMonth})` : ''}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {filterMonth === 'ALL' ? 'Regional breakdown of Fitting Change requirements' : `Zone breakdown of Fitting Changes in ${filterMonth}`}
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
                Fitting Change (FC) Material Requirements Matrix {filterMonth !== 'ALL' ? `(${filterMonth})` : ''}
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
                    Specific fitting wattages currently stalled due to material stock-out {filterMonth !== 'ALL' ? `for ${filterMonth}` : ''}
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
                            {ticket['Lamp Watts'] ? `${ticket['Lamp Watts']}W` : 'FC'}
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
