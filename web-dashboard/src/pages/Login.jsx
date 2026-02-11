import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
    const { login, register } = useAuth();
    const [isRegister, setIsRegister] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isRegister) {
                await register(form.name, form.email, form.password);
            } else {
                await login(form.email, form.password);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card glass">
                <div className="login-header">
                    <span className="login-logo">📍</span>
                    <h1>GeoStamp Pro</h1>
                    <p>GPS Timestamp Camera & Editor</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {isRegister && (
                        <input
                            type="text"
                            placeholder="Full Name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            required
                        />
                    )}
                    <input
                        type="email"
                        placeholder="Email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                        minLength={6}
                    />

                    {error && <p className="login-error">{error}</p>}

                    <button className="btn btn-primary login-btn" disabled={loading}>
                        {loading ? '...' : isRegister ? 'Create Account' : 'Sign In'}
                    </button>
                </form>

                <p className="login-toggle">
                    {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button onClick={() => setIsRegister(!isRegister)}>
                        {isRegister ? 'Sign In' : 'Register'}
                    </button>
                </p>
            </div>
        </div>
    );
}
