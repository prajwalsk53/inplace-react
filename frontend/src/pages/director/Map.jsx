import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../api/axios';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function DirectorMap() {
  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const [placements, setPlacements] = useState([]);

  useEffect(() => {
    api.get('/director/map').then(({ data }) => setPlacements(data));
  }, []);

  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;
    const map = L.map(mapElRef.current, { center: [52.6369, -1.1398], zoom: 12 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const markers = placements.map((p) =>
      L.marker([p.company.latitude, p.company.longitude])
        .addTo(mapRef.current)
        .bindPopup(`<strong>${p.student.fullName}</strong><br>${p.company.name}<br>${p.roleTitle}`));
    return () => markers.forEach((m) => mapRef.current?.removeLayer(m));
  }, [placements]);

  return (
    <div className="card">
      <h3 className="section-title">Placements Map</h3>
      <div className="map-container" ref={mapElRef} />
    </div>
  );
}
