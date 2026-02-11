import './MapPlaceholder.css';

export default function MapPlaceholder({ center }) {
    const lat = center?.[0] ?? 28.6139;
    const lng = center?.[1] ?? 77.209;

    return (
        <div className="map-placeholder glass">
            <div className="map-inner">
                <span className="map-pin">📍</span>
                <p>Map View</p>
                <p className="map-coords">
                    {lat.toFixed(4)}, {lng.toFixed(4)}
                </p>
                <small className="map-hint">
                    Integrate Leaflet or Google Maps here
                </small>
            </div>
        </div>
    );
}
