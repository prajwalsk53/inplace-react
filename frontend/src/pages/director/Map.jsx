import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../api/axios';

const SECTOR_COLORS = ['#0c1b33', '#2563eb', '#059669', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#65a30d', '#dc2626', '#374151'];

function coloredIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export default function DirectorMap() {
  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/director/map').then(({ data }) => setData(data));
  }, []);

  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;
    const map = L.map(mapElRef.current, { center: [52.8, -1.8], zoom: 6 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors', maxZoom: 18 }).addTo(map);
    setTimeout(() => map.invalidateSize(), 100);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !data) return;
    markersRef.current.forEach((m) => mapRef.current.removeLayer(m));
    markersRef.current = [];

    const sectorColorMap = {};
    data.sectorCounts.forEach(([sector], i) => { sectorColorMap[sector] = SECTOR_COLORS[i % SECTOR_COLORS.length]; });

    const bounds = [];
    data.placements.forEach((p) => {
      const lat = Number(p.latitude), lng = Number(p.longitude);
      if (!lat || !lng) return;
      const color = sectorColorMap[p.sector || 'Unknown'] || '#0c1b33';
      const marker = L.marker([lat, lng], { icon: coloredIcon(color) }).addTo(mapRef.current);
      marker.bindPopup(`
        <div style="min-width:200px;font-family:'DM Sans',sans-serif;">
          <p style="font-weight:700;color:#0c1b33;margin:0 0 0.25rem;">${p.companyName}</p>
          <p style="font-size:0.8rem;color:#6b7a8d;margin:0 0 0.5rem;">${p.city || ''}</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:0.5rem 0;">
          <p style="font-size:0.85rem;margin:0.2rem 0;"><strong>Student:</strong> ${p.studentName}</p>
          <p style="font-size:0.85rem;margin:0.2rem 0;"><strong>Role:</strong> ${p.roleTitle || '—'}</p>
          <p style="font-size:0.85rem;margin:0.2rem 0;"><strong>Sector:</strong> ${p.sector || '—'}</p>
          <p style="font-size:0.85rem;margin:0.2rem 0;"><strong>Tutor:</strong> ${p.tutorName || '—'}</p>
          <p style="font-size:0.85rem;margin:0.2rem 0;"><strong>Year:</strong> ${p.academicYear || '—'}</p>
        </div>
      `);
      markersRef.current.push(marker);
      bounds.push([lat, lng]);
    });
    if (bounds.length > 0) mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
  }, [data]);

  const withoutCoords = data ? data.placements.length - data.withCoordsCount : 0;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="panel" style={{ marginBottom: 0, padding: '1.25rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.4rem' }}>Active Placements</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.875rem', color: 'var(--navy)' }}>{data?.placements.length ?? '—'}</h3>
        </div>
        <div className="panel" style={{ marginBottom: 0, padding: '1.25rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.4rem' }}>On Map</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.875rem', color: 'var(--success)' }}>{data?.withCoordsCount ?? '—'}</h3>
        </div>
        <div className="panel" style={{ marginBottom: 0, padding: '1.25rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.4rem' }}>Sectors</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.875rem', color: 'var(--info)' }}>{data?.sectorCounts.length ?? '—'}</h3>
        </div>
        <div className="panel" style={{ marginBottom: 0, padding: '1.25rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.4rem' }}>No Coords</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.875rem', color: 'var(--warning)' }}>{withoutCoords}</h3>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.5rem', alignItems: 'start' }}>
        <div className="panel" style={{ marginBottom: 0, padding: 0, overflow: 'hidden' }}>
          <div ref={mapElRef} style={{ height: 580, width: '100%', borderRadius: 'var(--radius)' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="panel" style={{ marginBottom: 0 }}>
            <div className="panel-header"><h3>By Sector</h3></div>
            <div style={{ padding: '0.5rem 0' }}>
              {(data?.sectorCounts ?? []).map(([sec, cnt], i) => (
                <div key={sec} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: SECTOR_COLORS[i % SECTOR_COLORS.length], flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: '0.8125rem' }}>{sec}</span>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{cnt}</span>
                </div>
              ))}
            </div>
          </div>

          {withoutCoords > 0 && (
            <div className="panel" style={{ marginBottom: 0, background: '#fffbeb', border: '1px solid #fde68a' }}>
              <div style={{ padding: '1rem 1.25rem' }}>
                <p style={{ fontWeight: 600, color: '#92400e', marginBottom: '0.25rem' }}>⚠️ {withoutCoords} without coordinates</p>
                <p style={{ fontSize: '0.8125rem', color: '#78350f' }}>These placements cannot be shown on the map. Coordinates are added when students use the address autocomplete.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
