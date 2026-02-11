import './PhotoCard.css';

export default function PhotoCard({ image }) {
    const apiBase = import.meta.env.VITE_API_URL || '';
    const src = image?.filename
        ? `${apiBase.replace('/api', '')}/uploads/${image.filename}`
        : 'https://placehold.co/400x300/1a1f2e/444?text=No+Image';

    const coords =
        image?.location?.coordinates?.[1] && image?.location?.coordinates?.[0]
            ? `${image.location.coordinates[1].toFixed(4)}, ${image.location.coordinates[0].toFixed(4)}`
            : 'No GPS data';

    return (
        <div className="photo-card glass">
            <div className="photo-card-img">
                <img src={src} alt={image?.originalName || 'Photo'} loading="lazy" />
            </div>
            <div className="photo-card-info">
                <h4>{image?.originalName || 'Untitled'}</h4>
                <p className="photo-coords">📍 {coords}</p>
                <p className="photo-date">
                    {image?.createdAt
                        ? new Date(image.createdAt).toLocaleDateString()
                        : ''}
                </p>
            </div>
        </div>
    );
}
