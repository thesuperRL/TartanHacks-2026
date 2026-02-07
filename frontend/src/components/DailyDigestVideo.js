import React, { useState } from 'react';
import './DailyDigestVideo.css';

const DailyDigestVideo = ({ portfolio, stocks, predictions }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [script, setScript] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const handleGenerateVideo = async () => {
    setIsGenerating(true);
    setError(null);
    setProgress(0);
    setVideoUrl(null);

    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5004/api';
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const response = await fetch(`${API_BASE_URL}/video/daily-digest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolio: portfolio || [],
          stocks: stocks || [],
          predictions: predictions || null,
          timestamp: new Date().toISOString()
        })
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        throw new Error('Failed to generate video');
      }

      const data = await response.json();
      
      // Set script and audio/video URLs
      if (data.script) {
        setScript(data.script);
      }
      
      // Set audio URL if available (prefer video if both exist)
      if (data.video_url) {
        setVideoUrl(data.video_url);
      } else if (data.audio_url) {
        setVideoUrl(data.audio_url);
      }
    } catch (err) {
      console.error('Video generation error:', err);
      setError(err.message || 'Failed to generate video. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="daily-digest-video">
      <div className="digest-header">
        <h3>🎙️ Financial Daily Digest Podcast</h3>
        <p className="digest-description">
          Generate a personalized podcast with AI voice narration covering your portfolio performance, 
          market predictions, and key financial insights.
        </p>
      </div>

      <button
        className="generate-video-button"
        onClick={handleGenerateVideo}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <>
            <span className="spinner"></span>
            Generating Podcast...
          </>
        ) : (
          <>
            🎙️ Generate Daily Digest Podcast
          </>
        )}
      </button>

      {isGenerating && (
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="progress-text">{progress}%</div>
        </div>
      )}

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {videoUrl && (
        <div className="video-container">
          {videoUrl.endsWith('.mp3') || videoUrl.includes('audio') ? (
            <audio 
              controls 
              className="digest-audio-player"
              src={videoUrl}
            >
              Your browser does not support the audio tag.
            </audio>
          ) : (
            <video 
              controls 
              className="digest-video-player"
              src={videoUrl}
            >
              Your browser does not support the video tag.
            </video>
          )}
          <div className="video-actions">
            <a 
              href={videoUrl} 
              download={videoUrl.includes('audio') ? "daily-digest.mp3" : "daily-digest.mp4"}
              className="download-button"
            >
              📥 Download {videoUrl.includes('audio') ? 'Audio' : 'Video'}
            </a>
          </div>
        </div>
      )}

      {script && (
        <div className="script-container">
          <h4>Podcast Script:</h4>
          <div className="script-content">
            {script.split('\n').map((line, i) => (
              <p key={i}>{line || '\u00A0'}</p>
            ))}
          </div>
          {!videoUrl && (
            <div className="script-note">
              <small>💡 Audio generation in progress. The script will be converted to speech.</small>
            </div>
          )}
        </div>
      )}

      <div className="digest-info">
        <h4>What's included in your podcast:</h4>
        <ul>
          <li>📊 Portfolio performance summary</li>
          <li>📈 Stock price movements and predictions</li>
          <li>💡 AI-generated market insights</li>
          <li>🌍 Relevant financial news</li>
          <li>🎯 Personalized recommendations</li>
          <li>🎙️ Professional AI voice narration</li>
        </ul>
      </div>
    </div>
  );
};

export default DailyDigestVideo;
