import React, { useState, useEffect, useRef, useCallback } from 'react';
import HeartCanvas from '../components/HeartCanvas';
import Grainient from '../components/Grainient';
import { useAuth } from '../context/AuthContext';

const MAX_RIPPLES = 4;

/** Matches former greyscale-overlay gradient stops (light → dark in shader terms) */
const GRAIN_GREY = { color1: '#3d3d3d', color2: '#2a2a2a', color3: '#1c1c1c' };

/** Same blue sweep as the old .color-layer (cerulean → mid → navy in shader mix) */
const GRAIN_BLUE = { color1: '#0284C7', color2: '#1e3a5f', color3: '#0F172A' };

function lerpByte(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function parseHex(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function lerpHexColor(from, to, t) {
  const [r1, g1, b1] = parseHex(from);
  const [r2, g2, b2] = parseHex(to);
  const r = lerpByte(r1, r2, t);
  const g = lerpByte(g1, g2, t);
  const b = lerpByte(b1, b2, t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function LandingPage() {
  const [ripples, setRipples] = useState([]);
  const targetProgress = useRef(0);
  const currentProgress = useRef(0);
  const rafId = useRef(null);
  const rippleIdCounter = useRef(0);
  const buttonRef = useRef(null);
  const grainColorsRef = useRef(null);
  const { signInWithGoogle } = useAuth();

  // Smoothly animate progress + grain colors + UI using rAF
  useEffect(() => {
    const animate = () => {
      const prev = currentProgress.current;
      currentProgress.current += (targetProgress.current - prev) * 0.03;
      if (currentProgress.current > 1) currentProgress.current = 1;

      const p = currentProgress.current;
      const c1 = lerpHexColor(GRAIN_GREY.color1, GRAIN_BLUE.color1, p);
      const c2 = lerpHexColor(GRAIN_GREY.color2, GRAIN_BLUE.color2, p);
      const c3 = lerpHexColor(GRAIN_GREY.color3, GRAIN_BLUE.color3, p);
      grainColorsRef.current?.setColors(c1, c2, c3);

      if (Math.abs(currentProgress.current - prev) > 0.0005) {
        const btnGrey = Math.max(0, 100 - currentProgress.current * 100);
        if (buttonRef.current) {
          buttonRef.current.style.setProperty('--btn-greyscale', `${btnGrey}%`);
        }
      }

      rafId.current = requestAnimationFrame(animate);
    };
    rafId.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId.current);
  }, []);

  const handlePump = useCallback(() => {
    targetProgress.current = Math.min(targetProgress.current + 0.12, 1);

    rippleIdCounter.current += 1;
    const newRipple = { id: rippleIdCounter.current, createdAt: Date.now() };

    setRipples((prev) => {
      const updated = [...prev, newRipple];
      return updated.length > MAX_RIPPLES ? updated.slice(-MAX_RIPPLES) : updated;
    });
  }, []);

  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setRipples((prev) => prev.filter((r) => now - r.createdAt < 3200));
    }, 1000);
    return () => clearInterval(cleanup);
  }, []);

  return (
    <div className="app-container">
      <div className="grainient-bg" aria-hidden>
        <Grainient
          colorsControllerRef={grainColorsRef}
          color1={GRAIN_GREY.color1}
          color2={GRAIN_GREY.color2}
          color3={GRAIN_GREY.color3}
          grainAnimated
          grainAmount={0.08}
          timeSpeed={0.22}
          saturation={0.85}
          zoom={0.92}
        />
      </div>

      <div className="ripple-container">
        {ripples.map((r) => (
          <div
            key={r.id}
            className="ripple-ring"
            style={{
              left: '72%',
              top: '55%',
              width: '200vmax',
              height: '200vmax',
            }}
          />
        ))}
      </div>

      <div className="content-layer">
        <div className="hero-content">
          <div className="text-container">
            <h1 className="title">OrsusHealth</h1>
            <button
              className="auth-button"
              id="google-signin-btn"
              ref={buttonRef}
              onClick={signInWithGoogle}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" className="google-icon">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign in with Google
            </button>
          </div>

          <div className="canvas-container" id="heart-canvas">
            <HeartCanvas onPump={handlePump} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
