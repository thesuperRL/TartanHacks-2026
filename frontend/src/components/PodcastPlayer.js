import React, { useState, useRef, useEffect } from 'react';
import './PodcastPlayer.css';

const PodcastPlayer = ({ isOpen, onClose, articleTitle, location }) => {
  const [podcastUrl, setPodcastUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Get podcast URL based on location/title
  const getPodcastUrl = () => {
    if (!articleTitle && !location) return null;
    
    const titleLower = (articleTitle || '').toLowerCase();
    const locationLower = (location || '').toLowerCase();
    
    // Helper to create podcast paths
    const createPodcastPath = (...segments) => {
      return '/' + segments.map(seg => encodeURIComponent(seg)).join('/');
    };
    
    // Match Trump/DC/Washington articles
    if (titleLower.includes('trump') || titleLower.includes('ice') || 
        titleLower.includes('immigration') || locationLower.includes('washington') || 
        locationLower.includes('dc')) {
      // Check for .m4a files in trump folder
      return createPodcastPath('podcasts', 'trump', 'Deadly_Raid_Forces_Trump_to_Shift_Tactics.m4a');
    }
    
    // Match London/UK/Wales/Brexit articles
    if (titleLower.includes('london') || titleLower.includes('wales') || 
        titleLower.includes('brexit') || titleLower.includes('reform') ||
        locationLower.includes('london') || locationLower.includes('uk') ||
        locationLower.includes('wales')) {
      return createPodcastPath('podcasts', 'london', 'Reform_s_New_Man_in_Wales.mp4');
    }
    
    // Match New York/NYC articles
    if (titleLower.includes('new york') || titleLower.includes('nycha') ||
        titleLower.includes('mayor') || locationLower.includes('new york') ||
        locationLower.includes('nyc') || locationLower.includes('wall street')) {
      return createPodcastPath('podcasts', 'new york', 'NYCHA_Ditches_Radiators_for_Heat_Pumps.m4a');
    }
    
    return null;
  };

  useEffect(() => {
    if (!isOpen) {
      // Reset when closing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlaying(false);
      setCurrentTime(0);
      return;
    }

    const url = getPodcastUrl();
    if (!url) {
      setError('No podcast available for this article');
      setLoading(false);
      return;
    }

    setPodcastUrl(url);
    setLoading(false);
    setError(null);
  }, [isOpen, articleTitle, location]);

  // Update time as audio plays
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [podcastUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const newTime = percent * duration;
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="podcast-player-overlay" onClick={onClose}>
      <div className="podcast-player-content" onClick={(e) => e.stopPropagation()}>
        <div className="podcast-player-header">
          <h2>Podcast: {articleTitle || location || 'Article'}</h2>
          <button className="podcast-close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="podcast-player-body">
          {error && (
            <div className="podcast-error">
              <p>{error}</p>
            </div>
          )}
          
          {podcastUrl && (
            <div className="podcast-controls">
              <audio
                ref={audioRef}
                src={podcastUrl}
                preload="metadata"
                onError={(e) => {
                  console.error('Error loading podcast:', podcastUrl);
                  setError('Failed to load podcast');
                }}
              />
              
              <button 
                className={`play-pause-button ${isPlaying ? 'playing' : ''}`} 
                onClick={togglePlay}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              
              <div className="podcast-progress-container" onClick={handleSeek}>
                <div className="podcast-progress-bar">
                  <div 
                    className="podcast-progress-fill"
                    style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                  />
                </div>
              </div>
              
              <div className="podcast-time">
                <span>{formatTime(currentTime)}</span>
                <span> / </span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PodcastPlayer;
