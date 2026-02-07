import React, { useEffect, useState, useRef } from 'react';
import { animate } from 'animejs';
import './LogoAnimation.css';

const LogoAnimation = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isHidden, setIsHidden] = useState(false);
  const logoIconRef = useRef(null);
  const logoTextRef = useRef(null);
  const logoSplashRef = useRef(null);
  const logoContainerRef = useRef(null);
  const hasAnimatedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  // Keep onComplete ref updated without causing re-renders
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Prevent animation from running multiple times
    if (hasAnimatedRef.current) return;
    
    // Use requestAnimationFrame to ensure DOM is ready and avoid layout thrashing
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const logoIcon = logoIconRef.current;
        const logoText = logoTextRef.current;
        const logoSplash = logoSplashRef.current;
        const logoContainer = logoContainerRef.current;

        if (!logoContainer || !logoSplash || !logoIcon || !logoText) return;
        
        // Mark as animated immediately to prevent re-runs
        hasAnimatedRef.current = true;

        // Sequence of animations with optimized timing
        const animationSequence = () => {
          // 1. Logo appears with scale and rotation (use cubic easing instead of elastic for better performance)
          animate(logoIcon, {
            scale: [0, 1],
            rotate: [0, 360],
            opacity: [0, 1],
            duration: 500,
            easing: 'easeOutCubic'
          });

          // 2. Logo text fades in after icon starts
          setTimeout(() => {
            animate(logoText, {
              opacity: [0, 1],
              translateY: [20, 0],
              duration: 350,
              easing: 'easeOutCubic'
            });
          }, 100);

          // 3. Wait for animations to complete before starting fade out
          setTimeout(() => {
            // 4. Logo content zooms out
            animate(logoSplash, {
              scale: [1, 0],
              opacity: [1, 0],
              duration: 350,
              easing: 'easeInCubic'
            });

            // 5. Container background fades out
            animate(logoContainer, {
              opacity: [1, 0],
              duration: 300,
              easing: 'easeInCubic',
              delay: 50
            });

            // 6. Start main content animation before logo fully disappears
            setTimeout(() => {
              if (onCompleteRef.current) {
                onCompleteRef.current();
              }
            }, 150);

            // 7. Wait for container to fade out, then hide
            setTimeout(() => {
              setIsHidden(true);
              setTimeout(() => {
                setIsVisible(false);
              }, 200);
            }, 350);
          }, 600);
        };

        // Start animation sequence
        animationSequence();
      });
    });
  }, []); // Empty dependency array - animation runs only once on mount

  if (!isVisible) return null;

  return (
    <div ref={logoContainerRef} className={`logo-splash-container ${isHidden ? 'logo-hidden' : ''}`}>
      <div ref={logoSplashRef} className="logo-splash">
        <div ref={logoIconRef} className="logo-icon">
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
        <div ref={logoTextRef} className="logo-text">Survey</div>
      </div>
    </div>
  );
};

export default LogoAnimation;
