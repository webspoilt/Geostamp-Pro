import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import PhotoCard from '../components/PhotoCard';
import api from '../services/api';
import './Gallery.css';

export default function Gallery() {
    const [images, setImages] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        api.get(`/images?page=${page}&limit=12`)
            .then((res) => {
                setImages(res.data.images || []);
                setTotalPages(res.data.pages || 1);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [page]);

    return (
        <>
            <Header title="Gallery" />
            <div className="page-content">
                <div className="gallery-toolbar">
                    <Link to="/upload" className="btn btn-primary">📤 Upload Image</Link>
                    <Link to="/editor" className="btn btn-ghost">✏️ Open Editor</Link>
                </div>
                {loading ? (
                    <p className="gallery-loading">Loading…</p>
                ) : images.length === 0 ? (
                    <div className="gallery-empty">
                        <span>🖼️</span>
                        <p>No photos uploaded yet</p>
                    </div>
                ) : (
                    <>
                        <div className="photo-grid gallery-grid">
                            {images.map((img) => (
                                <PhotoCard key={img._id} image={img} />
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <div className="pagination">
                                <button
                                    className="btn btn-ghost"
                                    disabled={page <= 1}
                                    onClick={() => setPage(page - 1)}
                                >
                                    ← Previous
                                </button>
                                <span className="page-info">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    className="btn btn-ghost"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage(page + 1)}
                                >
                                    Next →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
}
