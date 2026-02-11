import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ExifReader from 'exifreader';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import api from '../services/api';
import './Upload.css';

export default function Upload() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const fileRef = useRef(null);
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [form, setForm] = useState({
        latitude: '',
        longitude: '',
        address: '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
    });
    const [exifExtracted, setExifExtracted] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const extractExif = useCallback(async (f) => {
        try {
            const buffer = await f.arrayBuffer();
            const tags = ExifReader.load(buffer, { expanded: true });

            if (tags.gps?.Latitude && tags.gps?.Longitude) {
                setForm((prev) => ({
                    ...prev,
                    latitude: tags.gps.Latitude.toFixed(6),
                    longitude: tags.gps.Longitude.toFixed(6),
                }));
                setExifExtracted(true);
            }

            if (tags.exif?.DateTimeOriginal?.description) {
                const dt = tags.exif.DateTimeOriginal.description;
                const [datePart, timePart] = dt.split(' ');
                if (datePart) {
                    setForm((prev) => ({
                        ...prev,
                        date: datePart.replace(/:/g, '-'),
                        time: timePart?.slice(0, 5) || prev.time,
                    }));
                }
            }
        } catch {
            // No EXIF data – keep manual fields
        }
    }, []);

    const handleFile = useCallback(
        (f) => {
            if (!f || !f.type.startsWith('image/')) return;
            setFile(f);
            setPreview(URL.createObjectURL(f));
            setExifExtracted(false);
            extractExif(f);
        },
        [extractExif]
    );

    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) return;
        setUploading(true);

        try {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('latitude', form.latitude);
            formData.append('longitude', form.longitude);
            formData.append('address', form.address);

            await api.post('/images', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            navigate('/gallery');
        } catch (err) {
            alert(err.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <>
            <Header title="Upload Image" />
            <div className="page-content">
                <div className="upload-layout">
                    {/* Drop zone */}
                    <div
                        className={`drop-zone glass ${dragActive ? 'active' : ''} ${preview ? 'has-preview' : ''}`}
                        onClick={() => fileRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={handleDrop}
                    >
                        {preview ? (
                            <img src={preview} alt="Preview" className="drop-preview" />
                        ) : (
                            <div className="drop-content">
                                <span className="drop-icon">📁</span>
                                <p className="drop-title">Drop image here or click to browse</p>
                                <p className="drop-hint">Supports JPG, PNG, HEIC · Max 20 MB</p>
                            </div>
                        )}
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={(e) => handleFile(e.target.files?.[0])}
                        />
                    </div>

                    {/* Metadata form */}
                    <form className="upload-form glass" onSubmit={handleSubmit}>
                        <h2>Image Details</h2>

                        {exifExtracted && (
                            <div className="exif-badge">✅ GPS extracted from EXIF</div>
                        )}

                        <div className="form-row">
                            <label>
                                Latitude
                                <input
                                    type="number"
                                    step="any"
                                    placeholder="e.g. 28.6139"
                                    value={form.latitude}
                                    onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                                />
                            </label>
                            <label>
                                Longitude
                                <input
                                    type="number"
                                    step="any"
                                    placeholder="e.g. 77.2090"
                                    value={form.longitude}
                                    onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                                />
                            </label>
                        </div>

                        <label>
                            Address
                            <input
                                type="text"
                                placeholder="Optional address / location name"
                                value={form.address}
                                onChange={(e) => setForm({ ...form, address: e.target.value })}
                            />
                        </label>

                        <div className="form-row">
                            <label>
                                Date
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                                />
                            </label>
                            <label>
                                Time
                                <input
                                    type="time"
                                    value={form.time}
                                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                                />
                            </label>
                        </div>

                        <div className="upload-actions">
                            {user ? (
                                <button type="submit" className="btn btn-primary" disabled={!file || uploading}>
                                    {uploading ? 'Uploading…' : '☁️ Upload to Cloud'}
                                </button>
                            ) : (
                                <div className="auth-message">
                                    <p>Login to save to cloud 🔒</p>
                                </div>
                            )}
                            <button
                                type="button"
                                className="btn btn-ghost"
                                disabled={!file}
                                onClick={() =>
                                    navigate(`/editor?local=true&lat=${form.latitude}&lng=${form.longitude}&date=${form.date}&time=${form.time}`)
                                }
                            >
                                ✏️ Open in Editor
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
