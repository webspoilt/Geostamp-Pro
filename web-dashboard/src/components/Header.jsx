import { useAuth } from '../context/AuthContext';
import './Header.css';

export default function Header({ title }) {
    const { user } = useAuth();

    return (
        <header className="header">
            <h1 className="header-title">{title}</h1>

            <div className="header-actions">
                <button className="btn-icon" title="Notifications">🔔</button>
                <div className="header-avatar">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
            </div>
        </header>
    );
}
