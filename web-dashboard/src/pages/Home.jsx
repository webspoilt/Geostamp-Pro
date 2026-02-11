import { Link } from 'react-router-dom';
import Header from '../components/Header';
import './Home.css';

export default function Home() {
    return (
        <>
            <Header title="GeoStamp Pro" />
            <div className="home-container">
                <div className="hero-section glass">
                    <div className="hero-content">
                        <h1>GPS Timestamp Camera & Editor</h1>
                        <p>
                            Add GPS coordinates, timestamps, and addresses to your photos.
                            Perfect for field reporting, evidence documentation, and travel memories.
                            <strong> No account required.</strong>
                        </p>
                        <div className="hero-actions">
                            <Link to="/upload" className="btn btn-primary btn-lg">
                                ☁️ Upload & Stamp
                            </Link>
                            <Link to="/editor" className="btn btn-ghost btn-lg">
                                ✏️ Open Editor
                            </Link>
                        </div>
                    </div>
                    <div className="hero-features">
                        <div className="feature-card">
                            <span className="feature-icon">📍</span>
                            <h3>Auto GPS</h3>
                            <p>Extracts location data from your photos automatically.</p>
                        </div>
                        <div className="feature-card">
                            <span className="feature-icon">📅</span>
                            <h3>Timestamp</h3>
                            <p>Add customizable date and time overlays.</p>
                        </div>
                        <div className="feature-card">
                            <span className="feature-icon">🔒</span>
                            <h3>Private</h3>
                            <p>Your data is yours. We don't track you.</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
