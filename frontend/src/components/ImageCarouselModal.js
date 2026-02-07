import React, { useEffect, useState } from 'react';
import './ImageCarouselModal.css';

const ImageCarouselModal = ({ isOpen, onClose, lat, lng, articleTitle, location, storyContext }) => {
    const [images, setImages] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Get local images based on location/title
    const getLocalImages = () => {
        if (!articleTitle && !location) return [];

        const titleLower = (articleTitle || '').toLowerCase();
        const locationLower = (location || '').toLowerCase();

        // Helper to create image paths - encode each path segment separately
        const createImagePath = (...segments) => {
            return '/' + segments.map(seg => encodeURIComponent(seg)).join('/');
        };

        // Match Trump/DC/Washington articles
        if (titleLower.includes('trump') || titleLower.includes('ice') ||
            titleLower.includes('immigration') || locationLower.includes('washington') ||
            locationLower.includes('dc')) {
            return [
                '/images/trump/Gemini_Generated_Image_ohcjcqohcjcqohcj.png',
                '/images/trump/Gemini_Generated_Image_4mr4hf4mr4hf4mr4.png'
            ];
        }

        // Match London/UK/Wales/Brexit articles
        // if (titleLower.includes('london') || titleLower.includes('wales') ||
        //     titleLower.includes('brexit') || titleLower.includes('reform') ||
        //     locationLower.includes('london') || locationLower.includes('uk') ||
        //     locationLower.includes('wales')) {
        //     return [
        //         createImagePath('images', 'london', 'Gemini_Generated_Image_rzk61srzk61srzk6%20(1).png')
        //     ];
        // }

        // Match New York/NYC articles
        else {
            return [
                createImagePath('images', 'new york', 'mamdani.png')
            ];
        }
    };

    // Load images when modal opens
    useEffect(() => {
        if (!isOpen) return;

        setLoading(true);
        setError(null);

        // Use local images instead of API
        const localImages = getLocalImages();

        if (localImages.length === 0) {
            setError('No images available for this location');
            setLoading(false);
            return;
        }

        // Set images directly
        setImages(localImages);
        setCurrentIndex(0);
        setLoading(false);
    }, [isOpen, articleTitle, location]);

    const nextImage = () => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = () => {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    const goToImage = (index) => {
        setCurrentIndex(index);
    };

    if (!isOpen) return null;

    return (
        <div className="image-carousel-modal-overlay" onClick={onClose}>
            <div className="image-carousel-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="image-carousel-modal-header">
                    <h3>{articleTitle || 'Location Images'}</h3>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                <div className="image-carousel-container">
                    {loading ? (
                        <div className="image-carousel-loading">
                            <p>Loading images...</p>
                            <div className="loading-spinner"></div>
                        </div>
                    ) : error && images.length === 0 ? (
                        <div className="image-carousel-error">
                            <p>{error}</p>
                            <button onClick={onClose} className="error-close-button">Close</button>
                        </div>
                    ) : images.length > 0 ? (
                        <>
                            <div className="image-carousel-main">
                                {images.length > 1 && (
                                    <button className="carousel-nav-button prev" onClick={prevImage}>
                                        ‹
                                    </button>
                                )}
                                <div className="carousel-image-wrapper">
                                    <img
                                        src={images[currentIndex]}
                                        alt={`Location view ${currentIndex + 1}`}
                                        className="carousel-image"
                                        onError={(e) => {
                                            console.error('Failed to load image:', images[currentIndex]);
                                            console.error('Attempted path:', e.target.src);
                                            e.target.style.display = 'none';
                                        }}
                                        onLoad={(e) => {
                                            console.log('Successfully loaded image:', images[currentIndex]);
                                        }}
                                    />
                                </div>
                                {images.length > 1 && (
                                    <button className="carousel-nav-button next" onClick={nextImage}>
                                        ›
                                    </button>
                                )}
                            </div>

                            {images.length > 1 && (
                                <>
                                    <div className="image-carousel-thumbnails">
                                        {images.map((img, index) => (
                                            <div
                                                key={index}
                                                className={`thumbnail ${index === currentIndex ? 'active' : ''}`}
                                                onClick={() => goToImage(index)}
                                            >
                                                <img src={img} alt={`Thumbnail ${index + 1}`} />
                                            </div>
                                        ))}
                                    </div>

                                    <div className="image-carousel-counter">
                                        {currentIndex + 1} / {images.length}
                                    </div>
                                </>
                            )}
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default ImageCarouselModal;
