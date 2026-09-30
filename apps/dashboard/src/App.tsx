import { useEffect, useMemo, useRef, useState } from 'react';

type User = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
  instituteId?: string | null;
  district?: string;
  state?: string;
};

type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

type InstituteRecord = {
  id: string;
  name: string;
  status: 'Active' | 'Flagged' | 'Suspended';
  schemeType: string;
  address: string;
  lat: number;
  lng: number;
  createdAt: string;
  registeredCameras: Array<{
    id: string;
    label: string;
    status: 'Online' | 'Offline' | 'Tampered';
    streamUrl: string | null;
  }>;
};

type InspectionRecord = {
  id: string;
  instituteId?: string;
  createdAt: string;
  checklistResponses?: Record<string, unknown>;
  gpsLat?: number;
  gpsLng?: number;
};

type AssignmentRecord = {
  id: string;
  instituteId: string;
  inspectorId: string | null;
  scheduledAt: string;
  status: 'Pending' | 'InProgress' | 'Completed' | 'Missed';
  riskScoreAtAssignment: number;
};

type FeedItem = {
  id: string;
  institute: InstituteRecord;
  submittedAt: string;
  status: 'Submitted' | 'Flagged' | 'Pending review';
};

type DashboardData = {
  institutes: InstituteRecord[];
  inspections: InspectionRecord[];
  assignments: AssignmentRecord[];
};

class ApiError extends Error {
  constructor(message: string, readonly statusCode?: number) {
    super(message);
  }
}

const STORAGE_KEY = 'dosje-dashboard-session';
const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000';
const DEMO_PHONE = '9988776655';

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(`Cannot reach the DoSJE API at ${API_BASE}.`);
  }

  const text = await response.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiError('The API returned an invalid response.', response.status);
  }

  if (!response.ok) {
    const errorBody = payload as { message?: string | string[]; detail?: string } | null;
    const message = errorBody?.message ?? errorBody?.detail;
    throw new ApiError(
      Array.isArray(message) ? message.join(', ') : message || `Request failed (${response.status}).`,
      response.status,
    );
  }

  return payload as T;
}

function readSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as AuthSession;
    return value.accessToken && value.refreshToken && value.user ? value : null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function districtOf(institute: InstituteRecord): string {
  const parts = institute.address.split(',').map((part) => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 2] : parts[0] || 'Unknown';
}

function formatRelativeTime(value: string): string {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (elapsedMinutes < 1) return 'Just now';
  if (elapsedMinutes < 60) return `${elapsedMinutes} min ago`;
  const hours = Math.floor(elapsedMinutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} day(s) ago`;
}

function projectCoordinates(institutes: InstituteRecord[]) {
  if (institutes.length === 0) return new Map<string, { x: number; y: number }>();
  const latitudes = institutes.map((item) => item.lat);
  const longitudes = institutes.map((item) => item.lng);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latRange = maxLat - minLat || 1;
  const lngRange = maxLng - minLng || 1;

  return new Map(
    institutes.map((item) => [
      item.id,
      {
        x: 10 + ((item.lng - minLng) / lngRange) * 80,
        y: 90 - ((item.lat - minLat) / latRange) * 80,
      },
    ]),
  );
}

function downloadCsv(data: DashboardData, feed: FeedItem[]) {
  const header = ['Inspection ID', 'Institute', 'Scheme', 'Address', 'Status', 'Submitted at', 'Latitude', 'Longitude'];
  const rows = feed.map((item) => [
    item.id,
    item.institute.name,
    item.institute.schemeType,
    item.institute.address,
    item.status,
    item.submittedAt,
    data.inspections.find((inspection) => inspection.id === item.id)?.gpsLat ?? '',
    data.inspections.find((inspection) => inspection.id === item.id)?.gpsLng ?? '',
  ]);
  const escape = (value: unknown) => `"${String(value).replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'dosje-inspection-report.csv';
  link.click();
  URL.revokeObjectURL(url);
}

const statuses = ['All', 'Active', 'Flagged', 'Pending review'] as const;

function HlsPlayer({ url }: { url: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playbackError, setPlaybackError] = useState('');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setPlaybackError('');

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      return () => {
        video.removeAttribute('src');
        video.load();
      };
    }

    let disposed = false;
    let player: import('hls.js').default | undefined;
    void import('hls.js')
      .then(({ default: Hls }) => {
        if (disposed) return;
        if (!Hls.isSupported()) {
          setPlaybackError('HLS playback is not supported by this browser.');
          return;
        }
        player = new Hls();
        player.loadSource(url);
        player.attachMedia(video);
        player.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) setPlaybackError('Stream is currently unavailable.');
        });
      })
      .catch(() => {
        if (!disposed) setPlaybackError('HLS playback could not be initialized.');
      });

    return () => {
      disposed = true;
      player?.destroy();
    };
  }, [url]);

  return (
    <div>
      <video
        ref={videoRef}
        controls
        playsInline
        style={{ width: '100%', maxHeight: 360, background: '#0f172a', borderRadius: 12 }}
      />
      {playbackError && <div role="status" style={{ color: '#be123c', fontSize: 13, marginTop: 6 }}>{playbackError}</div>}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(readSession);
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedScheme, setSelectedScheme] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState<(typeof statuses)[number]>('All');
  const [loginPhone, setLoginPhone] = useState(DEMO_PHONE);
  const [loginOtp, setLoginOtp] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setLoading(true);
    setError('');

    const load = async (token: string): Promise<DashboardData> => {
      const [institutes, inspections, assignments] = await Promise.all([
        apiRequest<InstituteRecord[]>('/institutes', {}, token),
        apiRequest<InspectionRecord[]>('/inspections', {}, token),
        apiRequest<AssignmentRecord[]>('/assignments', {}, token),
      ]);
      return { institutes, inspections, assignments };
    };

    const refreshSession = async () => {
      try {
        const dashboard = await load(session.accessToken);
        if (!cancelled) setData(dashboard);
      } catch (loadError) {
        if (loadError instanceof ApiError && loadError.statusCode === 401) {
          try {
            const tokens = await apiRequest<{ accessToken: string; refreshToken: string }>(
              '/auth/refresh',
              { method: 'POST', body: JSON.stringify({ refreshToken: session.refreshToken }) },
            );
            const refreshed = { ...session, ...tokens };
            const dashboard = await load(refreshed.accessToken);
            if (!cancelled) {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(refreshed));
              setSession(refreshed);
              setData(dashboard);
            }
            return;
          } catch (refreshError) {
            if (refreshError instanceof ApiError && refreshError.statusCode === 401) {
              localStorage.removeItem(STORAGE_KEY);
              if (!cancelled) setSession(null);
            }
            throw refreshError;
          }
        }
        throw loadError;
      }
    };

    void refreshSession()
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard data.');
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.accessToken]);

  const institutes = data?.institutes ?? [];
  const inspections = data?.inspections ?? [];
  const assignments = data?.assignments ?? [];
  const instituteById = useMemo(() => new Map(institutes.map((item) => [item.id, item])), [institutes]);

  const feed = useMemo<FeedItem[]>(() => inspections
    .filter((inspection) => Boolean(inspection.instituteId && instituteById.has(inspection.instituteId)))
    .map((inspection) => {
      const institute = instituteById.get(inspection.instituteId!)!;
      const status: FeedItem['status'] = institute.status === 'Flagged'
        ? 'Flagged'
        : institute.status === 'Suspended'
          ? 'Pending review'
          : 'Submitted';
      return { id: inspection.id, institute, submittedAt: inspection.createdAt, status };
    })
    .sort((first, second) => new Date(second.submittedAt).getTime() - new Date(first.submittedAt).getTime()),
  [inspections, instituteById]);

  const districts = useMemo(
    () => ['All', ...new Set(institutes.map(districtOf))],
    [institutes],
  );
  const schemes = useMemo(
    () => ['All', ...new Set(institutes.map((item) => item.schemeType))],
    [institutes],
  );

  const filteredInstitutes = useMemo(() => institutes.filter((item) => {
    const districtMatch = selectedDistrict === 'All' || districtOf(item) === selectedDistrict;
    const schemeMatch = selectedScheme === 'All' || item.schemeType === selectedScheme;
    const status = item.status === 'Suspended' ? 'Pending review' : item.status;
    const statusMatch = selectedStatus === 'All' || status === selectedStatus;
    return districtMatch && schemeMatch && statusMatch;
  }), [institutes, selectedDistrict, selectedScheme, selectedStatus]);

  const filteredFeed = useMemo(() => feed.filter((item) => {
    const districtMatch = selectedDistrict === 'All' || districtOf(item.institute) === selectedDistrict;
    const schemeMatch = selectedScheme === 'All' || item.institute.schemeType === selectedScheme;
    const statusMatch = selectedStatus === 'All' ||
      (selectedStatus === 'Active' ? item.institute.status === 'Active' : item.status === selectedStatus);
    return districtMatch && schemeMatch && statusMatch;
  }), [feed, selectedDistrict, selectedScheme, selectedStatus]);

  const coordinates = useMemo(() => projectCoordinates(filteredInstitutes), [filteredInstitutes]);
  const today = new Date();
  const inspectionsToday = inspections.filter((item) => {
    const date = new Date(item.createdAt);
    return date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();
  }).length;
  const flaggedCount = institutes.filter((item) => item.status === 'Flagged').length;
  const openAssignments = assignments.filter((item) => item.status === 'Pending' || item.status === 'InProgress').length;
  const cameras = institutes.flatMap((item) => item.registeredCameras ?? []);
  const streamableCameras = institutes.flatMap((institute) =>
    (institute.registeredCameras ?? [])
      .filter((camera) => camera.streamUrl)
      .map((camera) => ({ ...camera, instituteName: institute.name })),
  );
  const onlineCameras = cameras.filter((camera) => camera.status === 'Online').length;
  const cameraAvailability = cameras.length ? `${Math.round((onlineCameras / cameras.length) * 100)}%` : '—';

  const stats = [
    { label: 'Institutions tracked', value: institutes.length.toLocaleString(), tone: '#1f6feb' },
    { label: 'Inspections today', value: inspectionsToday.toLocaleString(), tone: '#198754' },
    { label: 'Flagged institutions', value: flaggedCount.toLocaleString(), tone: '#dc3545' },
    { label: 'Open assignments', value: openAssignments.toLocaleString(), tone: '#6f42c1' },
    { label: 'Camera availability', value: cameraAvailability, tone: '#0d9488' },
  ];

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setData(null);
    setMessage('Signed out.');
  };

  const requestOtp = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await apiRequest<{ message: string; developmentOtp?: string }>('/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: loginPhone }),
      });
      setOtpStep(true);
      if (response.developmentOtp) {
        setLoginOtp(response.developmentOtp);
        setMessage(`${response.message} Code: ${response.developmentOtp}`);
      } else {
        setMessage(response.message);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to send OTP.');
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = async () => {
    setBusy(true);
    setError('');
    try {
      const auth = await apiRequest<AuthSession>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone: loginPhone, otp: loginOtp }),
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
      setSession(auth);
      setOtpStep(false);
      setMessage(`Welcome back, ${auth.user.name}.`);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login failed.');
    } finally {
      setBusy(false);
    }
  };

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #eef6ff 0%, #f6f8fc 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 24, padding: 28, boxShadow: '0 20px 60px rgba(15, 23, 42, 0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ width: 42, height: 42, borderRadius: 14, background: 'linear-gradient(135deg, #1d4ed8, #60a5fa)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 }}>D</div>
            <div>
              <div style={{ fontSize: 11, letterSpacing: 1.6, color: '#5d6b82', textTransform: 'uppercase' }}>DoSJE</div>
              <h1 style={{ margin: 0, fontSize: 28 }}>Monitoring</h1>
            </div>
          </div>

          <div style={{ background: '#eff6ff', border: '1px solid #dbeafe', color: '#1d4ed8', fontSize: 13, borderRadius: 12, padding: '10px 12px', marginBottom: 18 }}>
            Demo phone: {DEMO_PHONE}. In enabled demo mode, request an OTP to receive a temporary development code.
          </div>

          <div style={{ display: 'grid', gap: 14 }}>
            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontWeight: 600, color: '#374151' }}>Phone number</span>
              <input value={loginPhone} onChange={(event) => setLoginPhone(event.target.value)} placeholder="Enter phone number" style={{ border: '1px solid #dfe7f3', borderRadius: 12, padding: '12px 14px', fontSize: 16 }} />
            </label>
            {otpStep && (
              <label style={{ display: 'grid', gap: 8 }}>
                <span style={{ fontWeight: 600, color: '#374151' }}>OTP</span>
                <input value={loginOtp} onChange={(event) => setLoginOtp(event.target.value)} placeholder="Enter OTP" style={{ border: '1px solid #dfe7f3', borderRadius: 12, padding: '12px 14px', fontSize: 16 }} />
              </label>
            )}
            {error && <div style={{ background: '#fff1f2', color: '#be123c', borderRadius: 12, border: '1px solid #fecdd3', padding: '10px 12px', fontSize: 13 }}>{error}</div>}
            {message && <div style={{ background: '#ecfdf5', color: '#065f46', borderRadius: 12, border: '1px solid #a7f3d0', padding: '10px 12px', fontSize: 13 }}>{message}</div>}
            <button onClick={otpStep ? handleLogin : requestOtp} disabled={busy} style={{ background: otpStep ? '#111827' : '#1d4ed8', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 16px', fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer' }}>
              {busy ? 'Please wait...' : otpStep ? 'Sign in' : 'Request OTP'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#f4f7fb', minHeight: '100vh', padding: 32 }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: 0, color: '#5d6b82', fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' }}>DoSJE</p>
            <h1 style={{ margin: '6px 0 0', fontSize: 32 }}>Monitoring dashboard</h1>
            <span style={{ color: '#5d6b82', fontSize: 13 }}>{session.user.name} · {session.user.role}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <select aria-label="Filter by district" value={selectedDistrict} onChange={(event) => setSelectedDistrict(event.target.value)} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #dfe7f3', background: '#fff' }}>
              {districts.map((district) => <option key={district} value={district}>{district}</option>)}
            </select>
            <select aria-label="Filter by scheme" value={selectedScheme} onChange={(event) => setSelectedScheme(event.target.value)} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #dfe7f3', background: '#fff' }}>
              {schemes.map((scheme) => <option key={scheme} value={scheme}>{scheme}</option>)}
            </select>
            <select aria-label="Filter by status" value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as (typeof statuses)[number])} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #dfe7f3', background: '#fff' }}>
              {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <button onClick={() => data && downloadCsv(data, filteredFeed)} disabled={!data || filteredFeed.length === 0} style={{ background: '#0d6efd', border: 'none', borderRadius: 10, color: 'white', fontWeight: 600, padding: '10px 16px', cursor: 'pointer' }}>Export report</button>
            <button onClick={logout} style={{ background: '#0f172a', border: 'none', borderRadius: 10, color: 'white', fontWeight: 600, padding: '10px 16px', cursor: 'pointer' }}>Logout</button>
          </div>
        </header>

        {error && <div role="alert" style={{ background: '#fff1f2', color: '#be123c', borderRadius: 12, border: '1px solid #fecdd3', padding: 14, marginBottom: 18 }}>{error}</div>}
        {loading && <div style={{ marginBottom: 18, color: '#58677d' }}>Loading live data from the DoSJE API...</div>}

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 18, marginBottom: 24 }}>
          {stats.map((item) => (
            <div key={item.label} style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 6px 18px rgba(15,23,42,0.06)' }}>
              <div style={{ color: '#5d6b82', fontSize: 13 }}>{item.label}</div>
              <div style={{ color: item.tone, fontSize: 30, fontWeight: 700, marginTop: 10 }}>{loading && !data ? '...' : item.value}</div>
            </div>
          ))}
        </section>

        <main style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 24 }}>
          <section style={{ background: '#fff', borderRadius: 18, padding: 18, boxShadow: '0 6px 18px rgba(15,23,42,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>Institute locations</h2>
              <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 999, padding: '6px 10px', fontSize: 12, fontWeight: 600 }}>
                {filteredInstitutes.length} shown · coordinates from API
              </span>
            </div>
            <div style={{ height: 360, borderRadius: 16, background: 'linear-gradient(135deg, #eaf5ff 0%, #dfe7fb 40%, #e6f7ef 100%)', position: 'relative', overflow: 'hidden', border: '1px solid #e8eef9' }}>
              <div style={{ position: 'absolute', inset: 0, opacity: 0.34, backgroundImage: 'radial-gradient(#9bb8d7 1px, transparent 1px)', backgroundSize: '26px 26px' }} />
              {filteredInstitutes.map((item) => {
                const point = coordinates.get(item.id);
                if (!point) return null;
                const color = item.status === 'Active' ? '#198754' : item.status === 'Flagged' ? '#dc3545' : '#ffb703';
                return (
                  <div key={item.id} style={{ position: 'absolute', left: `${point.x}%`, top: `${point.y}%`, transform: 'translate(-50%, -50%)' }}>
                    <div title={`${item.name} · ${item.lat}, ${item.lng} · ${item.status}`} style={{ width: 18, height: 18, borderRadius: 999, background: color, boxShadow: `0 0 0 8px ${color}22`, border: '2px solid rgba(255,255,255,0.9)' }} />
                  </div>
                );
              })}
              {!loading && filteredInstitutes.length === 0 && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#58677d' }}>No institutes match these filters.</div>}
            </div>
            <div style={{ color: '#7b8ca5', fontSize: 12, marginTop: 8 }}>Relative coordinate plot; marker positions use each institute’s registered latitude and longitude.</div>
          </section>

          <aside style={{ background: '#fff', borderRadius: 18, padding: 18, boxShadow: '0 6px 18px rgba(15,23,42,0.06)' }}>
            <h2 style={{ margin: '0 0 18px', fontSize: 20 }}>Recent inspections</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              {!loading && filteredFeed.length === 0 ? (
                <div style={{ border: '1px solid #e7edf8', borderRadius: 12, padding: 16, color: '#58677d' }}>
                  {feed.length === 0 ? 'No inspection reports have been submitted yet.' : 'No inspections match these filters.'}
                </div>
              ) : (
                filteredFeed.map((item) => (
                  <div key={item.id} style={{ border: '1px solid #e7edf8', borderRadius: 12, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                      <strong>{item.institute.name}</strong>
                      <span style={{ background: item.status === 'Flagged' ? '#fff1f2' : item.status === 'Pending review' ? '#fff7ed' : '#ecfdf5', color: item.status === 'Flagged' ? '#be123c' : item.status === 'Pending review' ? '#c2410c' : '#047857', borderRadius: 999, padding: '4px 8px', fontSize: 11, fontWeight: 700 }}>
                        {item.status}
                      </span>
                    </div>
                    <div style={{ marginTop: 8, color: '#58677d', fontSize: 13 }}>{districtOf(item.institute)} · {item.institute.schemeType}</div>
                    <div style={{ marginTop: 4, color: '#8ca0b8', fontSize: 12 }}>{formatRelativeTime(item.submittedAt)}</div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </main>

        <section style={{ background: '#fff', borderRadius: 18, padding: 18, marginTop: 24, boxShadow: '0 6px 18px rgba(15,23,42,0.06)' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 20 }}>CCTV live streams</h2>
          {streamableCameras.length === 0 ? (
            <div style={{ color: '#58677d' }}>No camera streams are configured for the loaded institutes.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
              {streamableCameras.map((camera) => (
                <details key={camera.id} style={{ border: '1px solid #e7edf8', borderRadius: 12, padding: 12 }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                    {camera.instituteName} · {camera.label} · {camera.status}
                  </summary>
                  {camera.streamUrl && (
                    <div style={{ marginTop: 12 }}>
                      <HlsPlayer url={camera.streamUrl} />
                    </div>
                  )}
                </details>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
