import Header from '../components/Header';
import MapPlaceholder from '../components/MapPlaceholder';
import './MapView.css';

export default function MapView() {
    return (
        <>
            <Header title="Map View" />
            <div className="page-content map-page">
                <MapPlaceholder center={[28.6139, 77.209]} />
                <p className="map-note">
                    💡 Tip: Upload geo-tagged photos from the mobile app to see them plotted on the map.
                </p>
            </div>
        </>
    );
}
