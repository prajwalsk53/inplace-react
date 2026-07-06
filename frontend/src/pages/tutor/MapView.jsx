import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../api/axios';

function pinClass(count) {
  if (count >= 5) return 'pin-red';
  if (count >= 2) return 'pin-gold';
  return 'pin-navy';
}

export default function MapView() {
  const navigate = useNavigate();
  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const routeLayerRef = useRef(null);
  const bannerRef = useRef(null);

  const [placements, setPlacements] = useState([]);
  const [groups, setGroups] = useState({});
  const [modalLoc, setModalLoc] = useState(null);
  const [startQuery, setStartQuery] = useState('');
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [geocodedStart, setGeocodedStart] = useState(null);
  const [geocodeStatus, setGeocodeStatus] = useState('');
  const [destIdx, setDestIdx] = useState(0);
  const [routing, setRouting] = useState(false);
  const suggestTimer = useRef(null);

  useEffect(() => {
    api.get('/tutor/map').then(({ data }) => {
      setPlacements(data);
      const g = {};
      data.forEach((p) => {
        const key = (p.companyAddress || p.companyCity || 'Unknown').trim();
        if (!g[key]) g[key] = [];
        g[key].push(p);
      });
      setGroups(g);
    });
  }, []);

  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;
    const map = L.map(mapElRef.current).setView([54.5, -3.0], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
    setTimeout(() => map.invalidateSize(), 100);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    const allPts = [];
    Object.entries(groups).forEach(([locKey, list]) => {
      const pts = list.map((p) => ({ lat: Number(p.latitude), lng: Number(p.longitude) })).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
      if (pts.length === 0) return;
      const avgLat = pts.reduce((a, b) => a + b.lat, 0) / pts.length;
      const avgLng = pts.reduce((a, b) => a + b.lng, 0) / pts.length;
      const n = list.length;
      const icon = L.divIcon({ className: '', html: `<div class="city-pin ${pinClass(n)}">${n}</div>`, iconSize: [34, 34], iconAnchor: [17, 17] });
      const marker = L.marker([avgLat, avgLng], { icon }).addTo(map);
      marker.on('click', () => openLocationModal(locKey));
      markersRef.current.push(marker);
      pts.forEach((p) => allPts.push([p.lat, p.lng]));
    });

    if (allPts.length >= 1) map.fitBounds(L.latLngBounds(allPts), { padding: [40, 40] });
  }, [groups]);

  const focusLocationOnMap = (locKey) => {
    const list = groups[locKey] || [];
    const pts = list.map((p) => [Number(p.latitude), Number(p.longitude)]).filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
    if (pts.length < 1) { alert('No latitude/longitude saved for this location yet.'); return; }
    mapRef.current.fitBounds(L.latLngBounds(pts).pad(0.35));
  };

  const openLocationModal = (locKey) => {
    setModalLoc(locKey);
    setDestIdx(0);
    setGeocodeStatus(geocodedStart ? `✅ ${geocodedStart.label}` : 'Enter a UK postcode or address above, then click Find.');
  };

  const focusAndOpen = (locKey) => { focusLocationOnMap(locKey); openLocationModal(locKey); };

  const onStartQueryChange = (e) => {
    const q = e.target.value;
    setStartQuery(q);
    clearTimeout(suggestTimer.current);
    if (q.trim().length < 3) { setStartSuggestions([]); return; }
    suggestTimer.current = setTimeout(() => {
      fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=gb&limit=6&q=${encodeURIComponent(q)}`, { headers: { 'Accept-Language': 'en' } })
        .then((r) => r.json()).then((data) => setStartSuggestions(data || [])).catch(() => setStartSuggestions([]));
    }, 350);
  };

  const selectSuggestion = (item) => {
    const start = { lat: parseFloat(item.lat), lng: parseFloat(item.lon), label: item.display_name };
    setGeocodedStart(start);
    setStartQuery(item.display_name);
    setGeocodeStatus(`✅ Found: ${item.display_name}`);
    setStartSuggestions([]);
  };

  const geocodeStart = async () => {
    const q = startQuery.trim();
    if (!q) { setGeocodeStatus('Please enter an address or postcode.'); return; }
    setGeocodeStatus('🔍 Searching...');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=gb&limit=1&q=${encodeURIComponent(q)}`, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      if (!data.length) { setGeocodeStatus('❌ Not found. Try a different postcode or address.'); setGeocodedStart(null); }
      else selectSuggestion(data[0]);
    } catch (e) {
      setGeocodeStatus('❌ Geocoding failed. Check your internet connection.');
    }
  };

  const clearRoute = () => {
    if (routeLayerRef.current) { mapRef.current.removeLayer(routeLayerRef.current); routeLayerRef.current = null; }
    if (bannerRef.current) { bannerRef.current.remove(); bannerRef.current = null; }
  };

  const showRouteInfoBanner = (distanceM, durationS, fromLabel, toLabel) => {
    const km = (distanceM / 1000).toFixed(1);
    const totalMins = Math.round(durationS / 60);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    const timeStr = hrs > 0 ? `${hrs} hr ${mins > 0 ? mins + ' min' : ''}` : `${mins} min`;

    if (bannerRef.current) bannerRef.current.remove();
    const banner = document.createElement('div');
    banner.style.cssText = 'position:absolute;bottom:20px;left:50%;transform:translateX(-50%);z-index:1000;background:white;border-radius:14px;padding:0.875rem 1.5rem;box-shadow:0 8px 30px rgba(0,0,0,0.18);display:flex;align-items:center;gap:1.25rem;border:2px solid var(--navy);min-width:300px;max-width:90%;';
    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:0.5rem;">
        <span style="font-size:1.5rem;">🚗</span>
        <div>
          <div style="font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted);margin-bottom:0.15rem;">Driving route</div>
          <div style="display:flex;gap:1rem;align-items:baseline;">
            <span style="font-size:1.25rem;font-weight:800;color:var(--navy);">${km} km</span>
            <span style="font-size:1rem;font-weight:600;color:var(--text);">≈ ${timeStr}</span>
          </div>
          <div style="font-size:0.78rem;color:var(--muted);margin-top:0.2rem;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${fromLabel} → ${toLabel || ''}</div>
        </div>
      </div>`;
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'margin-left:auto;background:none;border:none;cursor:pointer;font-size:1.1rem;color:var(--muted);padding:0.25rem 0.5rem;';
    closeBtn.onclick = clearRoute;
    banner.appendChild(closeBtn);

    mapElRef.current.style.position = 'relative';
    mapElRef.current.appendChild(banner);
    bannerRef.current = banner;
  };

  const destList = (groups[modalLoc] || [])
    .map((p) => ({ name: p.companyName, lat: Number(p.latitude), lng: Number(p.longitude) }))
    .filter((d) => Number.isFinite(d.lat) && Number.isFinite(d.lng));

  const generateRoute = async () => {
    if (!geocodedStart) { setGeocodeStatus('⚠️ Please find your start location first.'); return; }
    if (!destList.length) { alert('No coordinates found for companies at this location.'); return; }
    const dest = destList[destIdx] || destList[0];
    setRouting(true);
    try {
      const coords = `${geocodedStart.lng},${geocodedStart.lat};${dest.lng},${dest.lat}`;
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true`);
      if (!res.ok) throw new Error('OSRM request failed');
      const data = await res.json();
      if (!data.routes || !data.routes[0]) throw new Error('No route found');
      const route = data.routes[0];
      clearRoute();
      const layer = L.geoJSON(route.geometry, { style: { weight: 5 } }).addTo(mapRef.current);
      routeLayerRef.current = layer;
      mapRef.current.fitBounds(layer.getBounds().pad(0.25));
      showRouteInfoBanner(route.distance, route.duration, geocodedStart.label, dest.name);
      setModalLoc(null);
    } catch (e) {
      alert(`Could not generate route: ${e.message}`);
    } finally {
      setRouting(false);
    }
  };

  const totalPlacements = placements.length;
  const totalRegions = Object.keys(groups).length;

  return (
    <div>
      <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="panel" style={{ flex: 1, marginBottom: 0, padding: '1.25rem 1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '1.75rem' }}>🔵</span>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>Total Placements</p>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.625rem', color: 'var(--navy)' }}>{totalPlacements}</h3>
            </div>
          </div>
        </div>
        <div className="panel" style={{ flex: 1, marginBottom: 0, padding: '1.25rem 1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '1.75rem' }}>📍</span>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>Regions Covered</p>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.625rem', color: 'var(--navy)' }}>{totalRegions}</h3>
            </div>
          </div>
        </div>
        <div className="panel" style={{ flex: 2, marginBottom: 0, padding: '1.25rem 1.75rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.35rem' }}>🧭 Route Planner (OSRM)</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: 0 }}>
            Click a pin or "Focus on Map" → pick a start place → Generate Route. (Needs company latitude/longitude in DB.)
          </p>
        </div>
      </div>

      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div id="map" ref={mapElRef} style={{ height: 560, width: '100%' }} />
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.25rem', color: 'var(--navy)', marginBottom: '1.25rem' }}>Placements by Location</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '1.25rem' }}>
          {Object.entries(groups).map(([locKey, list]) => (
            <div key={locKey} className="panel" style={{ marginBottom: 0 }}>
              <div className="panel-header" style={{ background: 'var(--cream)' }}>
                <h3 style={{ fontSize: '1rem' }}>📍 {locKey} <span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--muted)', marginLeft: '0.5rem' }}>({list.length})</span></h3>
              </div>
              <div style={{ padding: '1rem' }}>
                {list.map((p) => (
                  <div key={p.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.7rem' }}>{p.studentInitials || '??'}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 500, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.studentName}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.companyName}</p>
                      </div>
                      <button className="btn btn-ghost" style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }} onClick={() => navigate(`/tutor/schedule-visit?placementId=${p.id}`)}>🗓</button>
                    </div>
                  </div>
                ))}
                <button className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: '1rem', justifyContent: 'center' }} onClick={() => focusAndOpen(locKey)}>
                  Focus on Map
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modalLoc && (
        <div className="modal-backdrop" onClick={() => setModalLoc(null)}>
          <div className="modal" style={{ maxWidth: 720, maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.375rem', color: 'var(--navy)', marginBottom: '1.25rem' }}>
              📍 {modalLoc} ({(groups[modalLoc] || []).length} placements)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {(groups[modalLoc] || []).map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div className="avatar">{p.studentInitials || '??'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{p.studentName}</p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>{p.companyName}</p>
                    {p.roleTitle && <p style={{ marginTop: '0.25rem' }}><span className="type-chip" style={{ padding: '0.2rem 0.5rem' }}>{p.roleTitle}</span></p>}
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => navigate(`/tutor/schedule-visit?placementId=${p.id}`)}>🗓 Schedule</button>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
              <div style={{ marginBottom: '1rem', position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.5rem' }}>📍 Start place — type any UK address or postcode</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="text" value={startQuery} onChange={onStartQueryChange} placeholder="e.g. LE1 7RH, Derby Station, University of Leicester..." style={{ flex: 1 }} />
                  <button className="btn btn-ghost" onClick={geocodeStart} style={{ whiteSpace: 'nowrap' }}>🔍 Find</button>
                </div>
                {startSuggestions.length > 0 && (
                  <div style={{ position: 'relative', zIndex: 50, background: 'white', border: '1.5px solid var(--border)', borderRadius: 10, marginTop: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', maxHeight: 200, overflowY: 'auto' }}>
                    {startSuggestions.map((item, i) => (
                      <div key={i} onMouseDown={() => selectSuggestion(item)} style={{ padding: '0.7rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '0.875rem', lineHeight: 1.4 }}>
                        📍 {item.display_name}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: '0.8rem', marginTop: '0.4rem', color: 'var(--muted)' }}>{geocodeStatus}</div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.5rem' }}>Destination company</label>
                  <select value={destIdx} onChange={(e) => setDestIdx(Number(e.target.value))}>
                    {destList.length ? destList.map((d, i) => <option key={i} value={i}>{d.name}</option>) : <option value={-1}>No companies with coordinates</option>}
                  </select>
                </div>
                <button className="btn btn-ghost" style={{ height: 44 }} onClick={() => setModalLoc(null)}>Close</button>
                <button className="btn btn-primary" style={{ height: 44 }} disabled={routing} onClick={generateRoute}>{routing ? 'Routing...' : 'Generate Route'}</button>
              </div>
              <p style={{ margin: '0.8rem 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
                {destList.length ? 'Enter your start location above, select the destination, then click Generate Route.' : 'Add latitude/longitude to companies in the database to enable routing.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
