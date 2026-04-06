import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import Grainient from '../components/Grainient';
import { DashboardAppSidebar } from '../components/DashboardAppSidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '../components/ui/sidebar';
import { TooltipProvider } from '../components/ui/tooltip';

const DASHBOARD_GRAIN = {
  color1: '#e2e8f0',
  color2: '#cbd5e1',
  color3: '#94a3b8',
};

// Tweak this variable to change the crossfade speed between the intro, idle, and talking animations
const BEAR_MEDIA_TRANSITION = 'opacity 0.3s ease-in-out';

function looksLikeWav(bytes) {
  return (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x41 &&
    bytes[10] === 0x56 &&
    bytes[11] === 0x45
  );
}

function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTabId, setActiveTabId] = useState('overview');

  // Bear animation state
  const [introFinished, setIntroFinished] = useState(false);
  const [speechEnded, setSpeechEnded] = useState(false);
  /** True only while TTS audio is actually playing (after fetch + play() succeed). */
  const [speechAudioPlaying, setSpeechAudioPlaying] = useState(false);
  const [stopGif, setStopGif] = useState(false);
  const [ttsText, setTtsText] = useState(
    "Hello! Welcome to your dashboard. I'm glad you're here.",
  );
  /** Bumped when TTS audio starts so mustache.gif restarts in sync with speech. */
  const [talkCycle, setTalkCycle] = useState(0);
  const videoRef = useRef(null);
  const gifRef = useRef(null);
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const triggerTtsPlayRef = useRef(null);
  const ttsTextRef = useRef(ttsText);
  ttsTextRef.current = ttsText;

  /** One deliberate tap: browsers allow audio only from a user gesture; TTS returns async so we play on tap after the file is ready. */
  const [soundUnlocked, setSoundUnlocked] = useState(false);
  const [ttsGateReady, setTtsGateReady] = useState(false);
  const [needsManualTtsPlay, setNeedsManualTtsPlay] = useState(false);

  const getTabTitle = (id) => {
    switch (id) {
      case 'overview': return 'Dashboard Overview';
      case 'assessment': return 'New Assessment';
      case 'trends': return 'My Trends';
      case 'reports': return 'My Reports';
      case 'settings': return 'Settings';
      default: return 'Dashboard';
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    document.body.classList.add('dashboard-route');
    return () => document.body.classList.remove('dashboard-route');
  }, []);

  // Preload GIFs so crossfades stay seamless
  useEffect(() => {
    const a = new Image();
    a.src = '/mustache.gif';
    const b = new Image();
    b.src = '/idle.gif';
  }, []);

  // Fetch TTS on load; playback starts only after the user taps the overlay (gesture + audio ready).
  useEffect(() => {
    if (loading || !user) return;

    const text = ttsTextRef.current.trim();
    const apiBase = (import.meta.env.VITE_API_BASE_URL || '')
      .trim()
      .replace(/\/$/, '');

    let cancelled = false;
    let objectUrl = null;
    let pollId = null;

    setTtsGateReady(false);
    setNeedsManualTtsPlay(false);
    triggerTtsPlayRef.current = null;

    /** Detach media from the blob before revoking, or the browser may log ERR_FILE_NOT_FOUND. */
    const revokeBlobUrl = () => {
      const a = audioRef.current;
      if (a) {
        a.pause();
        a.src = '';
        a.load();
        audioRef.current = null;
      }
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
    };

    const endSpeech = () => {
      if (!cancelled) {
        setSpeechAudioPlaying(false);
        setSpeechEnded(true);
      }
    };

    if (!text) {
      endSpeech();
      setTtsGateReady(true);
      return undefined;
    }

    if (!apiBase) {
      endSpeech();
      setTtsGateReady(true);
      return undefined;
    }

    const ac = new AbortController();

    (async () => {
      try {
        const res = await fetch(`${apiBase}/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
          signal: ac.signal,
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(errText || res.statusText);
        }
        const buf = await res.arrayBuffer();
        if (cancelled) return;

        const bytes = new Uint8Array(buf);
        if (!looksLikeWav(bytes)) {
          const preview = new TextDecoder().decode(bytes.slice(0, 240));
          console.warn('TTS: expected WAV (RIFF/WAVE), got:', preview);
          endSpeech();
          if (!cancelled) setTtsGateReady(true);
          return;
        }

        const blob = new Blob([buf], { type: 'audio/wav' });
        objectUrl = URL.createObjectURL(blob);
        const audio = new Audio(objectUrl);
        audio.volume = 1;
        audioRef.current = audio;

        let finished = false;
        const finish = () => {
          if (finished || cancelled) return;
          finished = true;
          if (pollId != null) {
            window.clearInterval(pollId);
            pollId = null;
          }
          revokeBlobUrl();
          endSpeech();
        };

        audio.addEventListener('ended', finish);
        audio.addEventListener('error', finish);
        const onTimeUpdate = () => {
          const d = audio.duration;
          if (Number.isFinite(d) && d > 0 && audio.currentTime >= d - 0.2) {
            finish();
          }
        };
        audio.addEventListener('timeupdate', onTimeUpdate);

        pollId = window.setInterval(() => {
          if (cancelled || finished) return;
          if (audio.ended) finish();
        }, 250);

        const markPlayStarted = () => {
          if (cancelled) return;
          setTalkCycle((n) => n + 1);
          setSpeechAudioPlaying(true);
        };

        const attemptPlay = async () => {
          try {
            await audio.play();
            if (!cancelled) {
              setNeedsManualTtsPlay(false);
              markPlayStarted();
            }
          } catch (e) {
            if (e?.name === 'NotAllowedError' && !cancelled && !finished) {
              setNeedsManualTtsPlay(true);
            } else {
              console.warn('TTS: audio.play() failed:', e);
              finish();
            }
          }
        };

        triggerTtsPlayRef.current = () => {
          void attemptPlay();
        };

        if (!cancelled) setTtsGateReady(true);
      } catch (e) {
        if (e?.name === 'AbortError') return;
        revokeBlobUrl();
        endSpeech();
        if (!cancelled) setTtsGateReady(true);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
      if (pollId != null) window.clearInterval(pollId);
      triggerTtsPlayRef.current = null;
      setSpeechAudioPlaying(false);
      setNeedsManualTtsPlay(false);
      setTtsGateReady(false);
      revokeBlobUrl();
    };
  }, [user?.id, loading]);

  useEffect(() => {
    setSoundUnlocked(false);
  }, [user?.id]);

  const unlockDashboardSound = useCallback(() => {
    if (!ttsGateReady) return;
    triggerTtsPlayRef.current?.();
    setSoundUnlocked(true);
    videoRef.current?.play?.().catch(() => {});
  }, [ttsGateReady]);

  const retryTtsFromClick = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    void a
      .play()
      .then(() => {
        setNeedsManualTtsPlay(false);
        setTalkCycle((n) => n + 1);
        setSpeechAudioPlaying(true);
      })
      .catch(() => {});
  }, []);

  const handleVideoEnd = useCallback(() => {
    setIntroFinished(true);
  }, []);

  // Freeze the GIF by capturing current frame to a canvas
  useEffect(() => {
    if (stopGif && gifRef.current && canvasRef.current) {
      const img = gifRef.current;
      const canvas = canvasRef.current;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
    }
  }, [stopGif]);

  if (loading) {
    return (
      <div className="flex h-dvh max-h-dvh items-center justify-center bg-zinc-100 text-zinc-600">
        <p className="text-sm">Loading…</p>
      </div>
    );
  }

  if (!user) return null;

  const showIdleUnderBear =
    introFinished && (speechEnded || !speechAudioPlaying);
  const showMustacheTalking = !speechEnded && speechAudioPlaying;

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    'User';
  const avatarUrl =
    user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

  return (
    <div className="dashboard-app relative flex h-dvh max-h-dvh flex-col overflow-hidden">
      <div className="dashboard-grain pointer-events-none" aria-hidden>
        <Grainient
          color1={DASHBOARD_GRAIN.color1}
          color2={DASHBOARD_GRAIN.color2}
          color3={DASHBOARD_GRAIN.color3}
          grainAnimated
          grainAmount={0.065}
          timeSpeed={0.22}
          saturation={0}
          zoom={0.92}
        />
      </div>

      <SidebarProvider
        className="relative z-10 flex min-h-0 w-full flex-1 !min-h-0"
        style={{ '--sidebar-width': '18rem' }}
      >
        <TooltipProvider delayDuration={0}>
          <DashboardAppSidebar
            displayName={displayName}
            email={user.email ?? ''}
            avatarUrl={avatarUrl}
            activeId={activeTabId}
            onActiveIdChange={setActiveTabId}
            onSignOut={signOut}
          />
          <SidebarInset 
            className="flex min-h-0 flex-1 flex-col bg-transparent"
            style={{ padding: '0.5rem', backgroundColor: 'transparent' }}
          >
            <div 
              className="flex size-full flex-col overflow-hidden rounded-2xl"
              style={{
                backgroundColor: 'rgba(220, 226, 235, 0.28)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.25), 0 8px 24px -4px rgba(0, 0, 0, 0.1)'
              }}
            >
              <header className="flex h-14 shrink-0 items-center gap-2 border-b border-black/5 px-4 md:px-5">
                <div className="flex items-center gap-2">
                  <SidebarTrigger className="-ml-1 text-sidebar-foreground hover:bg-black/5 rounded-md p-1.5" />
                  <div className="mx-2 h-4 w-px bg-black/10" aria-hidden="true" />
                  <span 
                    className="text-[16px] font-semibold text-zinc-800 tracking-tight"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {getTabTitle(activeTabId)}
                  </span>
                </div>
              </header>

              <section
                className={`min-h-0 flex-1 ${
                  activeTabId === 'overview'
                    ? 'overflow-hidden'
                    : 'overflow-y-auto p-6 md:p-8'
                }`}
                style={
                  activeTabId === 'overview'
                    ? {
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        justifyContent: 'flex-start',
                        padding: 0,
                        minHeight: 0,
                      }
                    : {}
                }
              >
                {activeTabId === 'overview' ? (
                  <div className="flex min-h-0 w-full flex-1 flex-col">
                    <div
                      className="relative flex min-h-0 flex-1 flex-col items-center justify-center"
                      style={{ minHeight: 0 }}
                    >
                      {introFinished && !soundUnlocked ? (
                        <div className="absolute left-1/2 bottom-12 z-[60] -translate-x-1/2 flex flex-col items-center justify-center">
                          <style>
                            {`
                              @keyframes subtle-bounce {
                                0%, 100% { transform: translateY(0); }
                                50% { transform: translateY(-5px); }
                              }
                              .hover-bounce-effect:hover:not(:disabled) {
                                animation: subtle-bounce 2s ease-in-out infinite;
                              }
                            `}
                          </style>
                          <button
                            type="button"
                            disabled={!ttsGateReady}
                            onClick={unlockDashboardSound}
                            className="hover-bounce-effect rounded-full bg-gradient-to-b from-[#14b8a6] to-[#0f766e] px-24 py-10 text-center text-2xl font-semibold tracking-wide text-white shadow-[0_8px_24px_rgba(20,184,166,0.3)] transition-all outline-none focus-visible:ring-2 ring-teal-500/50 disabled:cursor-wait disabled:opacity-70 hover:shadow-[0_12px_32px_rgba(20,184,166,0.5)]"
                          >
                            Get Started
                          </button>
                        </div>
                      ) : soundUnlocked && needsManualTtsPlay ? (
                        <button
                          type="button"
                          onClick={retryTtsFromClick}
                          className="absolute left-1/2 top-1/2 z-[60] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-black/10 bg-white/95 px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-md outline-none ring-zinc-400/30 hover:bg-white focus-visible:ring-2"
                        >
                          Play voice
                        </button>
                      ) : null}
                      {!stopGif ? (
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: soundUnlocked ? '100%' : '50%',
                            transform: soundUnlocked ? 'translateX(-100%)' : 'translateX(-50%)',
                            transition: 'left 1s cubic-bezier(0.16, 1, 0.3, 1), transform 1s cubic-bezier(0.16, 1, 0.3, 1)',
                            display: 'inline-block',
                            height: '100%',
                            width: 'max-content',
                            maxHeight: '100%',
                            backgroundColor: '#000000',
                            borderRadius: '32px',
                            overflow: 'hidden',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
                          }}
                        >
                          {/* Stacked layers: intro.webm on top until it ends; mustache only while TTS plays; idle after intro when not talking. */}
                          <img
                            key={speechEnded ? `idle-${talkCycle}` : 'idle-layer'}
                            src="/idle.gif"
                            alt="Dr. Bear"
                            aria-hidden={!showIdleUnderBear}
                            draggable={false}
                            style={{
                              height: '100%',
                              width: 'auto',
                              maxWidth: '100%',
                              objectFit: 'contain',
                              display: 'block',
                              zIndex: 0,
                              transition: BEAR_MEDIA_TRANSITION,
                              opacity: showIdleUnderBear ? 1 : 0,
                              pointerEvents: 'none',
                            }}
                          />
                          <img
                            ref={gifRef}
                            key={`mustache-${talkCycle}`}
                            src="/mustache.gif"
                            alt="Dr. Bear"
                            aria-hidden={!showMustacheTalking}
                            draggable={false}
                            style={{
                              position: 'absolute',
                              inset: 0,
                              height: '100%',
                              width: '100%',
                              objectFit: 'contain',
                              display: 'block',
                              zIndex: 1,
                              transition: BEAR_MEDIA_TRANSITION,
                              opacity: showMustacheTalking ? 1 : 0,
                              pointerEvents: 'none',
                            }}
                          />
                          <video
                            ref={videoRef}
                            src="/intro.webm"
                            autoPlay
                            muted
                            playsInline
                            preload="auto"
                            onEnded={handleVideoEnd}
                            style={{
                              position: 'absolute',
                              inset: 0,
                              height: '100%',
                              width: '100%',
                              objectFit: 'contain',
                              display: 'block',
                              zIndex: 2,
                              transition: BEAR_MEDIA_TRANSITION,
                              opacity: introFinished ? 0 : 1,
                              backgroundColor: 'transparent',
                              border: 'none',
                              outline: 'none',
                            }}
                          />
                        </div>
                      ) : (
                        <canvas
                          ref={canvasRef}
                          style={{
                            height: '100%',
                            maxWidth: '100%',
                            objectFit: 'contain',
                            display: 'block',
                            backgroundColor: '#transparent',
                          }}
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl">
                    <h2
                      className="text-lg font-semibold tracking-tight text-zinc-900"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {getTabTitle(activeTabId)}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-600">
                      Content for {getTabTitle(activeTabId)} coming soon.
                    </p>
                  </div>
                )}
              </section>
            </div>
          </SidebarInset>
        </TooltipProvider>
      </SidebarProvider>
    </div>
  );
}

export default Dashboard;
