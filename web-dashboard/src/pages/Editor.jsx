import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import ExifReader from 'exifreader';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import api from '../services/api';
import './Editor.css';
// ... (STAMP_FORMATS and DEFAULT_STAMP constants remain unchanged)
export default function Editor() {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const canvasRef = useRef(null);
    const fileRef = useRef(null);
    const imgRef = useRef(null);

    const [imageSrc, setImageSrc] = useState(null);
    const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
    const [meta, setMeta] = useState({
        lat: searchParams.get('lat') || '',
        lng: searchParams.get('lng') || '',
        date: searchParams.get('date') || new Date().toISOString().split('T')[0],
        time: searchParams.get('time') || new Date().toTimeString().slice(0, 5),
        address: searchParams.get('address') || '',
    });

    const [stamp, setStamp] = useState(DEFAULT_STAMP);
    const [tsStamp, setTsStamp] = useState({ ...DEFAULT_STAMP, format: 'dateOnly', x: 20, yOffset: 60 });
    const [dragging, setDragging] = useState(null);
    const [saving, setSaving] = useState(false);
    const [imageId, setImageId] = useState(searchParams.get('id') || null);

    // Load image from gallery if ID provided
    useEffect(() => {
        if (!imageId) return;
        api.get(`/images/${imageId}`).then((res) => {
            const img = res.data;
            const apiBase = (import.meta.env.VITE_API_URL || '').replace('/api', '');
            setImageSrc(`${apiBase}/uploads/${img.filename}`);
            setMeta({
                lat: img.location?.coordinates?.[1]?.toString() || '',
                lng: img.location?.coordinates?.[0]?.toString() || '',
                date: img.createdAt ? img.createdAt.split('T')[0] : meta.date,
                time: img.createdAt ? img.createdAt.split('T')[1]?.slice(0, 5) : meta.time,
                address: img.address || '',
            });
        }).catch(() => { });
    }, [imageId]);

    const handleFile = useCallback(async (f) => {
        if (!f) return;
        setImageSrc(URL.createObjectURL(f));
        setImageId(null);

        try {
            const buffer = await f.arrayBuffer();
            const tags = ExifReader.load(buffer, { expanded: true });
            if (tags.gps?.Latitude && tags.gps?.Longitude) {
                setMeta((prev) => ({
                    ...prev,
                    lat: tags.gps.Latitude.toFixed(6),
                    lng: tags.gps.Longitude.toFixed(6),
                }));
            }
            if (tags.exif?.DateTimeOriginal?.description) {
                const [d, t] = tags.exif.DateTimeOriginal.description.split(' ');
                setMeta((prev) => ({
                    ...prev,
                    date: d.replace(/:/g, '-'),
                    time: t?.slice(0, 5) || prev.time,
                }));
            }
        } catch { }
    }, []);

    // Render canvas
    const renderCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        if (!canvas || !img || !img.complete) return;

        const ctx = canvas.getContext('2d');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        setImgSize({ w: img.naturalWidth, h: img.naturalHeight });

        ctx.drawImage(img, 0, 0);

        const drawStamp = (text, stampCfg, bottomOffset) => {
            if (!stampCfg.enabled || !text.trim()) return;

            ctx.font = `bold ${stampCfg.fontSize}px 'Inter', sans-serif`;

            const lines = text.split('\n');
            const lineHeight = stampCfg.fontSize * 1.4;
            const padding = 12;

            let maxW = 0;
            lines.forEach((line) => {
                const m = ctx.measureText(line);
                if (m.width > maxW) maxW = m.width;
            });

            const boxW = maxW + padding * 2;
            const boxH = lines.length * lineHeight + padding * 2;
            const x = stampCfg.x;
            const y = canvas.height - bottomOffset - boxH;

            // Background
            ctx.fillStyle = `rgba(0,0,0,${stampCfg.bgOpacity / 100})`;
            ctx.beginPath();
            ctx.roundRect(x, y, boxW, boxH, 8);
            ctx.fill();

            // Text
            ctx.fillStyle = stampCfg.color;
            ctx.textBaseline = 'top';
            lines.forEach((line, i) => {
                ctx.fillText(line, x + padding, y + padding + i * lineHeight);
            });
        };

        // Render GPS stamp
        if (stamp.enabled && (meta.lat || meta.lng)) {
            const fn = STAMP_FORMATS[stamp.format] || STAMP_FORMATS.full;
            const text = fn({
                lat: parseFloat(meta.lat) || 0,
                lng: parseFloat(meta.lng) || 0,
                date: meta.date,
                time: meta.time,
                address: meta.address,
            });
            drawStamp(text, stamp, 20);
        }

        // Render timestamp stamp
        if (tsStamp.enabled) {
            const fn = STAMP_FORMATS[tsStamp.format] || STAMP_FORMATS.dateOnly;
            const text = fn({
                lat: parseFloat(meta.lat) || 0,
                lng: parseFloat(meta.lng) || 0,
                date: meta.date,
                time: meta.time,
                address: meta.address,
            });
            drawStamp(text, tsStamp, stamp.enabled ? 100 : 20);
        }
    }, [meta, stamp, tsStamp]);

    // Re-render when anything changes
    useEffect(() => {
        renderCanvas();
    }, [renderCanvas, imageSrc]);

    const handleImageLoad = () => renderCanvas();

    // Download
    const handleDownload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `geostamp-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    // Save to cloud
    const handleSave = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        setSaving(true);

        try {
            const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
            const formData = new FormData();
            formData.append('image', blob, `geostamp-${Date.now()}.png`);
            formData.append('latitude', meta.lat);
            formData.append('longitude', meta.lng);
            formData.append('address', meta.address);

            await api.post('/images', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            alert('✅ Saved to cloud!');
        } catch {
            alert('Save failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Header title="Image Editor" />
            <div className="page-content">
                <div className="editor-layout">
                    {/* Canvas area */}
                    <div className="editor-canvas-area glass">
                        {imageSrc ? (
                            <>
                                <canvas ref={canvasRef} className="editor-canvas" />
                                {/* Hidden image for loading */}
                                <img
                                    ref={imgRef}
                                    src={imageSrc}
                                    alt=""
                                    crossOrigin="anonymous"
                                    onLoad={handleImageLoad}
                                    style={{ display: 'none' }}
                                />
                            </>
                        ) : (
                            <div
                                className="editor-empty"
                                onClick={() => fileRef.current?.click()}
                            >
                                <span>🖼️</span>
                                <p>Load an image to start editing</p>
                                <button className="btn btn-primary">Select Image</button>
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

                    {/* Controls panel */}
                    <div className="editor-controls glass">
                        <button className="btn btn-primary editor-load-btn" onClick={() => fileRef.current?.click()}>
                            📂 Load Image
                        </button>

                        {/* Metadata */}
                        <div className="ctrl-section">
                            <h3>📍 GPS Coordinates</h3>
                            <div className="ctrl-row">
                                <label>Lat <input type="number" step="any" value={meta.lat} onChange={(e) => setMeta({ ...meta, lat: e.target.value })} /></label>
                                <label>Lng <input type="number" step="any" value={meta.lng} onChange={(e) => setMeta({ ...meta, lng: e.target.value })} /></label>
                            </div>
                            <label>Address <input type="text" value={meta.address} onChange={(e) => setMeta({ ...meta, address: e.target.value })} /></label>
                        </div>

                        <div className="ctrl-section">
                            <h3>🕒 Timestamp</h3>
                            <div className="ctrl-row">
                                <label>Date <input type="date" value={meta.date} onChange={(e) => setMeta({ ...meta, date: e.target.value })} /></label>
                                <label>Time <input type="time" value={meta.time} onChange={(e) => setMeta({ ...meta, time: e.target.value })} /></label>
                            </div>
                        </div>

                        {/* Stamp controls */}
                        <div className="ctrl-section">
                            <h3>🏷️ GPS Stamp</h3>
                            <label className="ctrl-check">
                                <input type="checkbox" checked={stamp.enabled} onChange={(e) => setStamp({ ...stamp, enabled: e.target.checked })} />
                                Enable GPS stamp
                            </label>
                            <label>Format
                                <select value={stamp.format} onChange={(e) => setStamp({ ...stamp, format: e.target.value })}>
                                    <option value="full">Full (coords + address + time)</option>
                                    <option value="minimal">Minimal (coords only)</option>
                                    <option value="coordsOnly">Coordinates (DMS)</option>
                                </select>
                            </label>
                            <div className="ctrl-row">
                                <label>Size
                                    <input type="range" min="12" max="48" value={stamp.fontSize} onChange={(e) => setStamp({ ...stamp, fontSize: +e.target.value })} />
                                    <span className="ctrl-val">{stamp.fontSize}px</span>
                                </label>
                                <label>Color
                                    <input type="color" value={stamp.color} onChange={(e) => setStamp({ ...stamp, color: e.target.value })} />
                                </label>
                            </div>
                            <label>BG Opacity
                                <input type="range" min="0" max="100" value={stamp.bgOpacity} onChange={(e) => setStamp({ ...stamp, bgOpacity: +e.target.value })} />
                                <span className="ctrl-val">{stamp.bgOpacity}%</span>
                            </label>
                        </div>

                        <div className="ctrl-section">
                            <h3>📅 Timestamp Stamp</h3>
                            <label className="ctrl-check">
                                <input type="checkbox" checked={tsStamp.enabled} onChange={(e) => setTsStamp({ ...tsStamp, enabled: e.target.checked })} />
                                Enable timestamp stamp
                            </label>
                            <div className="ctrl-row">
                                <label>Size
                                    <input type="range" min="12" max="48" value={tsStamp.fontSize} onChange={(e) => setTsStamp({ ...tsStamp, fontSize: +e.target.value })} />
                                    <span className="ctrl-val">{tsStamp.fontSize}px</span>
                                </label>
                                <label>Color
                                    <input type="color" value={tsStamp.color} onChange={(e) => setTsStamp({ ...tsStamp, color: e.target.value })} />
                                </label>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="ctrl-actions">
                            <button className="btn btn-primary" onClick={handleDownload} disabled={!imageSrc}>
                                💾 Download PNG
                            </button>
                            {user && (
                                <button className="btn btn-ghost" onClick={handleSave} disabled={!imageSrc || saving}>
                                    {saving ? 'Saving…' : '☁️ Save to Cloud'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
