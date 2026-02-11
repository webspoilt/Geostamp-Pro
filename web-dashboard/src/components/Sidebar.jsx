import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const navItems = [
    { to: '/', icon: '📊', label: 'Dashboard' },
    { to: '/upload', icon: '📤', label: 'Upload' },
    { to: '/editor', icon: '✏️', label: 'Editor' },
    { to: '/gallery', icon: '🖼️', label: 'Gallery' },
    { to: '/map', icon: '🗺️', label: 'Map View' },
    { to: '/settings', icon: '⚙️', label: 'Settings' },
];

export default function Sidebar() {
    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <span className="logo-icon">📍</span>
                <span className="logo-text">GeoStamp Pro</span>
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item) => (
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
                <p>v1.0.0</p>
            </div>
        </aside>
    );
}
