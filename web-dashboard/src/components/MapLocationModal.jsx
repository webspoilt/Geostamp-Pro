import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapLocationModal.css';

// Fix leaflet default pin assets
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapClickHandler({ onSelect }) {
    useMapEvents({
        click(e) {
            onSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

const PRESET_CITIES = [
    { name: 'New York', lat: 40.7128, lng: -74.0060 },
    { name: 'London', lat: 51.5074, lng: -0.1278 },
    { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
    { name: 'Paris', lat: 48.8566, lng: 2.3522 },
    { name: 'Sydney', lat: -33.8688, lng: 151.2093 },
    { name: 'Dubai', lat: 25.2048, lng: 55.2708 },
    { name: 'San Francisco', lat: 37.7749, lng: -122.4194 },
    { name: 'New Delhi', lat: 28.6139, lng: 77.2090 },
];

export default function MapLocationModal({ isOpen, onClose, onConfirm, initialLat, initialLng }) {
    if (!isOpen) return null;

    const startLat = parseFloat(initialLat) || 28.6139;
    const startLng = parseFloat(initialLng) || 77.2090;

    const [coords, setCoords] = useState({ lat: startLat, lng: startLng });
    const [address, setAddress] = useState('');
    const [loadingAddress, setLoadingAddress] = useState(false);

    const reverseGeocode = async (lat, lng) => {
        setLoadingAddress(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
                headers: { 'User-Agent': 'GeoStampProWeb/1.0' },
            });
            const data = await res.json();
            if (data && data.display_name) {
                setAddress(data.display_name);
            }
        } catch {
            setAddress('');
        } finally {
            setLoadingAddress(false);
        }
    };

    const handleMapClick = (lat, lng) => {
        setCoords({ lat, lng });
        reverseGeocode(lat, lng);
    };

    const handleConfirm = () => {
        onConfirm({
            lat: coords.lat.toFixed(6),
            lng: coords.lng.toFixed(6),
            address: address,
        });
        onClose();
    };

    const handleCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    setCoords({ lat, lng });
                    reverseGeocode(lat, lng);
                },
                (err) => alert('Unable to fetch current location: ' + err.message)
            );
        }
    };

    return (
        <div className="map-modal-backdrop" onClick={onClose}>
            <div className="map-modal-content glass" onClick={(e) => e.stopPropagation()}>
                <div className="map-modal-header">
                    <h3>📍 Select Location on Map</h3>
                    <button className="modal-close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="map-presets-bar">
                    <button className="preset-btn current-loc-btn" onClick={handleCurrentLocation}>
                        🎯 My Location
                    </button>
                    {PRESET_CITIES.map((city) => (
                        <button
                            key={city.name}
                            className="preset-btn"
                            onClick={() => {
                                setCoords({ lat: city.lat, lng: city.lng });
                                reverseGeocode(city.lat, city.lng);
                            }}
                        >
                            {city.name}
                        </button>
                    ))}
                </div>

                <div className="map-modal-view">
                    <MapContainer
                        center={[coords.lat, coords.lng]}
                        zoom={12}
                        className="modal-leaflet-map"
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <MapClickHandler onSelect={handleMapClick} />
                        <Marker position={[coords.lat, coords.lng]} />
                    </MapContainer>
                </div>

                <div className="map-modal-footer">
                    <div className="coord-preview">
                        <strong>Selected Point:</strong>
                        <span>Lat: {coords.lat.toFixed(6)}, Lng: {coords.lng.toFixed(6)}</span>
                        {loadingAddress ? (
                            <small className="geocoding-text">Resolving address…</small>
                        ) : address ? (
                            <small className="address-text">{address}</small>
                        ) : null}
                    </div>

                    <div className="modal-actions">
                        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleConfirm}>
                            Confirm Coordinates
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
