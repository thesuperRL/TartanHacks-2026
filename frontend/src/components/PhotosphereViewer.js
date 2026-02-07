import React, { useState, useEffect } from 'react';
import './PhotosphereViewer.css';

const PhotosphereViewer = ({ isOpen, onClose, articleTitle, location }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const getImages = () => {
        const titleLower = (articleTitle || '').toLowerCase();
        const locationLower = (location || '').toLowerCase();

        if (titleLower.includes('trump') || titleLower.includes('ice') ||
            titleLower.includes('immigration') || locationLower.includes('washington') ||
            locationLower.includes('dc')) {
            return [
                { src: '/images/trump/Gemini_Generated_Image_ohcjcqohcjcqohcj.png', caption: 'Protests outside the Capitol building' },
                { src: '/images/trump/Gemini_Generated_Image_4mr4hf4mr4hf4mr4.png', caption: 'Immigration policy demonstration' }
            ];
        }

        if (titleLower.includes('london') || titleLower.includes('wales') ||
            titleLower.includes('brexit') || titleLower.includes('reform') ||
            locationLower.includes('london') || locationLower.includes('uk') ||
            locationLower.includes('wales')) {
            return [
                { src: '/images/london/susan.png', caption: 'Street scene in London' }
            ];
        }

        if (titleLower.includes('new york') || titleLower.includes('nycha') ||
            titleLower.includes('mayor') || locationLower.includes('new york') ||
            locationLower.includes('nyc') || locationLower.includes('wall street')) {
            return [
                { src: '/images/new york/mamdani.png', caption: 'New York City view' }
            ];
        }

        return [];
    };

    const images = getImages();

    useEffect(() => {
        if (!isOpen) {
            setCurrentIndex(0);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyPress = (e) => {
            if (e.key === 'ArrowLeft') setCurrentIndex(prev => Math.max(0, prev - 1));
            else if (e.key === 'ArrowRight') setCurrentIndex(prev => Math.min(images.length - 1, prev + 1));
            else if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isOpen, onClose, images.length]);

    if (!isOpen) return null;

    if (images.length === 0) {
        return (
            <div className="gallery-overlay" onClick={onClose}>
                <div className="gallery-content" onClick={(e) => e.stopPropagation()}>
                    <button className="gallery-close" onClick={onClose}>×</button>
                    <div className="gallery-error">No images available for this location</div>
                </div>
            </div>
        );
    }

    return (
        <div className="gallery-overlay" onClick={onClose}>
            <div className="gallery-content" onClick={(e) => e.stopPropagation()}>
                <button className="gallery-close" onClick={onClose}>×</button>

                <div className="gallery-main">
                    {images.length > 1 && currentIndex > 0 && (
                        <button className="gallery-nav gallery-prev" onClick={() => setCurrentIndex(prev => prev - 1)}>‹</button>
                    )}

                    <div className="gallery-image-container">
                        <img src={images[currentIndex].src} alt={images[currentIndex].caption} className="gallery-image" />
                        <div className="gallery-caption">{images[currentIndex].caption}</div>
                    </div>

                    {images.length > 1 && currentIndex < images.length - 1 && (
                        <button className="gallery-nav gallery-next" onClick={() => setCurrentIndex(prev => prev + 1)}>›</button>
                    )}
                </div>

                {images.length > 1 && (
                    <div className="gallery-dots">
                        {images.map((_, idx) => (
                            <button
                                key={idx}
                                className={`gallery-dot ${idx === currentIndex ? 'active' : ''}`}
                                onClick={() => setCurrentIndex(idx)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PhotosphereViewer;
