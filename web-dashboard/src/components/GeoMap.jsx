import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './GeoMap.css';

// Fix Leaflet's default icon paths in bundled environments
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function RecenterAuto({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (center && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1])) {
            map.setView(center, zoom || 13);
        }
    }, [center, zoom, map]);
    return null;
}

export default function GeoMap({ center = [28.6139, 77.209], zoom = 12, images = [] }) {
    const validCenter = center && !isNaN(center[0]) && !isNaN(center[1]) ? center : [28.6139, 77.209];

    return (
        <div className="geomap-container glass">
            <MapContainer
                center={validCenter}
                zoom={zoom}
                scrollWheelZoom={true}
                className="geomap-leaflet"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <RecenterAuto center={validCenter} zoom={zoom} />
                
                {images.map((img) => {
                    const coords = img.location?.coordinates;
                    if (!coords || coords.length < 2) return null;
                    // GeoJSON format is [lng, lat] -> Leaflet requires [lat, lng]
                    const lat = coords[1];
                    const lng = coords[0];

                    return (
                        <Marker key={img._id || `${lat}-${lng}`} position={[lat, lng]}>
                            <Popup className="geomap-popup">
                                <div className="geomap-popup-content">
                                    {img._id ? (
                                        <img
                                            src={`/api/images/${img._id}/thumb`}
                                            alt={img.originalName || 'Photo'}
                                            className="geomap-thumb"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                            }}
                                        />
                                    ) : null}
                                    <div className="geomap-info">
                                        <strong>{img.address || 'GeoStamped Photo'}</strong>
                                        <p className="coords-text">
                                            {lat.toFixed(5)}, {lng.toFixed(5)}
                                        </p>
                                        {img.capturedAt && (
                                            <small>{new Date(img.capturedAt).toLocaleString()}</small>
                                        )}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
