import React, { useEffect, useState } from 'react';
import { animate } from 'animejs';
import './LogoAnimation.css';

const LogoAnimation = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const logoIcon = document.querySelector('.logo-icon');
    const logoText = document.querySelector('.logo-text');
    const logoSplash = document.querySelector('.logo-splash');
    const logoContainer = document.querySelector('.logo-splash-container');

    if (!logoContainer || !logoSplash) return;

    // Sequence of animations using setTimeout for reliable timing
    const animationSequence = () => {
      // 1. Logo appears with scale and rotation (600ms - even faster)
      animate(logoIcon, {
        scale: [0, 1],
        rotate: [0, 360],
        opacity: [0, 1],
        duration: 600,
        easing: 'easeOutElastic(1, .6)'
      });

      // 2. Logo text fades in after icon starts (50ms delay + 400ms duration - faster)
      setTimeout(() => {
        animate(logoText, {
          opacity: [0, 1],
          translateY: [20, 0],
          duration: 400,
          easing: 'easeOutCubic'
        });
      }, 150);

      // 3. Brief pause (150ms - much faster) + wait for previous animations
      // Total wait: 600ms (icon) + 150ms (pause) = 750ms
      setTimeout(() => {
        // 4. Logo content zooms out (animate the splash, not the container) - faster
        animate(logoSplash, {
          scale: [1, 0],
          opacity: [1, 0],
          duration: 400,
          easing: 'easeInCubic'
        });

        // 5. Container background fades out separately (faster fade)
        animate(logoContainer, {
          opacity: [1, 0],
          duration: 300,
          easing: 'easeInCubic',
          delay: 100
        });

        // 6. Start main content animation before logo fully disappears (overlap for smooth transition)
        // Start main content at 200ms (before logo fully fades at 400ms)
        setTimeout(() => {
          // Trigger the callback to start main content animation
          if (onComplete) {
            onComplete();
          }
        }, 200);

        // 7. Wait for container to fully fade out, then hide
        // Total fade time: 100ms delay + 300ms duration = 400ms
        setTimeout(() => {
          // Mark as hidden (keeps in DOM to prevent layout shift)
          setIsHidden(true);
          
          // Remove from DOM after main content has had time to appear
          setTimeout(() => {
            setIsVisible(false);
          }, 300);
        }, 400);
      }, 750);
    };

    // Small delay to ensure DOM is ready
    setTimeout(animationSequence, 100);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className={`logo-splash-container ${isHidden ? 'logo-hidden' : ''}`}>
      <div className="logo-splash">
        <div className="logo-icon">
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Globe icon */}
            <circle cx="50" cy="50" r="45" stroke="url(#gradient1)" strokeWidth="3" fill="none"/>
            <circle cx="50" cy="50" r="35" stroke="url(#gradient2)" strokeWidth="2" fill="none"/>
            <path d="M 20 50 Q 50 30 80 50" stroke="url(#gradient1)" strokeWidth="2" fill="none"/>
            <path d="M 20 50 Q 50 70 80 50" stroke="url(#gradient1)" strokeWidth="2" fill="none"/>
            <circle cx="50" cy="50" r="8" fill="url(#gradient1)"/>
            <defs>
              <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4a9eff" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
              <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4a9eff" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#ec4899" stopOpacity="0.6" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="logo-text">Global News Explorer</div>
      </div>
    </div>
  );
};

export default LogoAnimation;
