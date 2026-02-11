import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import './Settings.css';

export default function Settings() {
    const { user, logout } = useAuth();

    return (
        <>
            <Header title="Settings" />
            <div className="page-content">
                <div className="settings">
                    <div className="settings-header">
                        <h1>Settings</h1>
                    </div>

                    <div className="settings-section">
                        <h2>Account</h2>
                        <div className="account-info">
                            <div className="avatar">
                                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div className="account-details">
                                <h3>{user?.name || 'User'}</h3>
                                <p>{user?.email || 'user@example.com'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="settings-section">
                        <h2>About</h2>
                        <div className="about-info">
                            <p><strong>GeoStamp Pro</strong> v1.0.0</p>
                            <p className="app-description">
                                A production‑ready GPS Timestamp Camera & Editor with cloud sync capabilities.
                            </p>
                        </div>
                    </div>

                    <button className="logout-btn" onClick={logout}>
                        Sign Out
                    </button>
                </div>
            </div>
        </>
    );
}
