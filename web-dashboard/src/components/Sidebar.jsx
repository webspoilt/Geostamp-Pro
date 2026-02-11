import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

export default function Sidebar() {
    const { user, logout } = useAuth();

    const navItems = [
        { to: '/', icon: '🏠', label: 'Home', public: true },
        { to: '/upload', icon: '📤', label: 'Upload', public: true },
        { to: '/editor', icon: '✏️', label: 'Editor', public: true },
        // Admin only
        { to: '/dashboard', icon: '📊', label: 'Dashboard', admin: true },
        { to: '/gallery', icon: '🖼️', label: 'Gallery', admin: true },
        { to: '/map', icon: '🗺️', label: 'Map View', admin: true },
        { to: '/settings', icon: '⚙️', label: 'Settings', admin: true },
    ];

    const filteredItems = navItems.filter(item =>
        item.public || (user && item.admin)
    );

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <span className="logo-icon">📍</span>
                <span className="logo-text">GeoStamp Pro</span>
            </div>

            <nav className="sidebar-nav">
                {filteredItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            `nav-item ${isActive ? 'active' : ''}`
                        }
                        end={item.to === '/'}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                {user && (
                    <button className="nav-item logout-btn" onClick={logout}>
                        <span className="nav-icon">🚪</span>
                        <span className="nav-label">Logout</span>
                    </button>
                )}
            </div>
        </aside>
    );
}
