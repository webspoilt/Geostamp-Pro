import './StatsCard.css';

export default function StatsCard({ icon, label, value, trend }) {
    return (
        <div className="stats-card glass">
            <div className="stats-icon">{icon}</div>
            <div className="stats-body">
                <p className="stats-label">{label}</p>
                <h3 className="stats-value">{value}</h3>
                {trend !== undefined && (
                    <p className={`stats-trend ${trend >= 0 ? 'up' : 'down'}`}>
                        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
                    </p>
                )}
            </div>
        </div>
    );
}
