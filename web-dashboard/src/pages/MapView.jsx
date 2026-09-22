import { useState, useEffect } from 'react';
import Header from '../components/Header';
import GeoMap from '../components/GeoMap';
import axios from 'axios';
import './MapView.css';

export default function MapView() {
    const [images, setImages] = useState([]);
    const [center, setCenter] = useState([28.6139, 77.209]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchImages = async () => {
            try {
                const token = localStorage.getItem('token');
                const headers = token ? { Authorization: `Bearer ${token}` } : {};
                const res = await axios.get('/api/images?limit=100', { headers });
                const fetchedImages = res.data.images || [];
                setImages(fetchedImages);

                // Auto-center map on the most recent geostamped image
                const firstWithCoords = fetchedImages.find(
                    (img) => img.location?.coordinates && img.location.coordinates.length === 2
                );
                if (firstWithCoords) {
                    setCenter([
                        firstWithCoords.location.coordinates[1],
                        firstWithCoords.location.coordinates[0],
                    ]);
                }
            } catch (err) {
                console.error('Failed to load map images:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchImages();
    }, []);

    return (
        <>
            <Header title="Map View" />
            <div className="page-content map-page">
                {loading ? (
                    <div className="loading-state">Loading map and geotagged photos...</div>
                ) : (
                    <GeoMap center={center} zoom={13} images={images} />
                )}
                <p className="map-note">
                    📍 Showing your verified GeoStamped photos plotted on OpenStreetMap.
                </p>
            </div>
        </>
    );
}
