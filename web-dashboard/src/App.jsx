import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Gallery from './pages/Gallery';
import MapView from './pages/MapView';
import Settings from './pages/Settings';
import Upload from './pages/Upload';
import Editor from './pages/Editor';

import Home from './pages/Home';

function AppRoutes() {
    const { user, loading } = useAuth();

    if (loading) return <div className="loading-screen">Loading...</div>;

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="app-main">
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Home />} />
                    <Route path="/upload" element={<Upload />} />
                    <Route path="/editor" element={<Editor />} />
                    <Route
                        path="/login"
                        element={!user ? <Login /> : <Navigate to="/dashboard" replace />}
                    />

                    {/* Admin Routes */}
                    <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
                    <Route path="/gallery" element={user ? <Gallery /> : <Navigate to="/login" />} />
                    <Route path="/map" element={user ? <MapView /> : <Navigate to="/login" />} />
                    <Route path="/settings" element={user ? <Settings /> : <Navigate to="/login" />} />

                    {/* Catch-all */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>
        </div>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
}
