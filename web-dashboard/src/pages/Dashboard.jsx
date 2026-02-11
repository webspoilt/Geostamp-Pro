import { useState, useEffect } from 'react';
import Header from '../components/Header';
import StatsCard from '../components/StatsCard';
import PhotoCard from '../components/PhotoCard';
import api from '../services/api';
import './Dashboard.css';

export default function Dashboard() {
    const [images, setImages] = useState([]);
    const [stats, setStats] = useState({ total: 0, locations: 0 });

    useEffect(() => {
        api.get('/images?limit=6').then((res) => {
            setImages(res.data.images || []);
            setStats((s) => ({ ...s, total: res.data.total || 0 }));
        }).catch(() => { });

        api.get('/locations').then((res) => {
            setStats((s) => ({ ...s, locations: res.data.length || 0 }));
        }).catch(() => { });
    }, []);

    return (
        <>
            <Header title="Dashboard" />
            <div className="page-content">
                <div className="stats-grid">
                    <StatsCard icon="📸" label="Total Photos" value={stats.total} trend={12} />
                    <StatsCard icon="📍" label="Locations" value={stats.locations} trend={5} />
                    <StatsCard icon="☁️" label="Synced" value={stats.total} />
                    <StatsCard icon="💾" label="Storage" value="—" />
                </div>

                <section className="recent-section">
                    <h2>Recent Uploads</h2>
                    {images.length === 0 ? (
                        <p className="empty-state">No photos yet. Capture from the mobile app!</p>
                    ) : (
                        <div className="photo-grid">
                            {images.map((img) => (
                                <PhotoCard key={img._id} image={img} />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}
