import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Send, RotateCcw } from 'lucide-react';
import Grainient from '../components/react-bits/Grainient';
import GlassSurface from '../components/react-bits/GlassSurface';
import { DashboardAppSidebar } from '../components/DashboardAppSidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '../components/ui/sidebar';
import { TooltipProvider } from '../components/ui/tooltip';
import { DashboardStats } from '../components/DashboardStats';
import AssessmentForm from '../components/AssessmentForm';
import MyReports from '../components/MyReports';
import { useIsMobile } from '../hooks/use-mobile';

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
  const [displayName, setDisplayName] = useState('User');
  const [ttsText, setTtsText] = useState('');
  /** Bumped when TTS audio starts so mustache.gif restarts in sync with speech. */
  const [talkCycle, setTalkCycle] = useState(0);
  const bearContainerRef = useRef(null);
  const [bearWidth, setBearWidth] = useState(350);
  const videoRef = useRef(null);
  const gifRef = useRef(null);
  const audioRef = useRef(null);
  const triggerTtsPlayRef = useRef(null);
  const ttsTextRef = useRef(ttsText);

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatStatus, setChatStatus] = useState('');
  const chatEndRef = useRef(null);

  // Bear thinking animation state
  const [isBearThinking, setIsBearThinking] = useState(false);
  const [isBearThinkingEnd, setIsBearThinkingEnd] = useState(false);
  const pendingReplyRef = useRef(null);
  const thinkingStartRef = useRef(null);
  const thinkingEndRef = useRef(null);
  ttsTextRef.current = ttsText;

  /** One deliberate tap: browsers allow audio only from a user gesture; TTS returns async so we play on tap after the file is ready. */
  const [soundUnlocked, setSoundUnlocked] = useState(false);
  const [ttsGateReady, setTtsGateReady] = useState(false);
  const isMobile = useIsMobile();
  const [showBearOnlyMobile, setShowBearOnlyMobile] = useState(false);

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

  // Set display name and TTS greeting text once user data is loaded
  useEffect(() => {
    if (user) {
      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email ||
        '';
      setDisplayName(name);
      setTtsText(`Hello ${name}! Welcome to OrsusHealth. How can I help you today?`);
    }
  }, [user]);

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

  // Track the size of the Bear container to subtract exactly its pixel width dynamically
  useEffect(() => {
    if (!bearContainerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          // Add a tiny buffer (e.g. 16px) so it doesn't touch exactly the edge of the bear
          setBearWidth(entry.contentRect.width + 16); 
        }
      }
    });
    
    resizeObserver.observe(bearContainerRef.current);
    if (bearContainerRef.current.offsetWidth) {
      setBearWidth(bearContainerRef.current.offsetWidth + 16);
    }
    
    return () => resizeObserver.disconnect();
  }, []);

  const speakResponse = useCallback(
    async (text) => {
      if (!text) return;
      const apiBase = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
      if (!apiBase) return;

      // Stop any existing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      try {
        const res = await fetch(`${apiBase}/tts`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-api-key': import.meta.env.VITE_BACKEND_API_KEY
          },
          body: JSON.stringify({ text }),
        });

        if (!res.ok) throw new Error(`TTS failed: ${res.statusText}`);

        const buf = await res.arrayBuffer();
        const blob = new Blob([buf], { type: 'audio/wav' });
        const objectUrl = URL.createObjectURL(blob);
        const audio = new Audio(objectUrl);
        audioRef.current = audio;

        audio.onplay = () => {
          setTalkCycle((n) => n + 1);
          setSpeechAudioPlaying(true);
          setSpeechEnded(false);
        };

        const cleanup = () => {
          setSpeechAudioPlaying(false);
          setSpeechEnded(true);
          URL.revokeObjectURL(objectUrl);
          if (audioRef.current === audio) {
            audioRef.current = null;
          }
        };

        audio.onended = cleanup;
        audio.onerror = cleanup;

        await audio.play();
      } catch (err) {
        console.warn('TTS Error:', err);
        setSpeechAudioPlaying(false);
        setSpeechEnded(true);
      }
    },
    [user?.id]
  );

  // Fetch initial TTS on load; playback starts only after user taps overlay
  useEffect(() => {
    if (loading || !user || !ttsText) return;

    const apiBase = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
    if (!apiBase) {
      setTtsGateReady(true);
      return;
    }

    setTtsGateReady(false);
    triggerTtsPlayRef.current = null;

    (async () => {
      try {
        const res = await fetch(`${apiBase}/tts`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-api-key': import.meta.env.VITE_BACKEND_API_KEY
          },
          body: JSON.stringify({ text: ttsText }),
        });

        if (!res.ok) throw new Error('Initial TTS failed');
        const buf = await res.arrayBuffer();
        const blob = new Blob([buf], { type: 'audio/wav' });
        const objectUrl = URL.createObjectURL(blob);
        const audio = new Audio(objectUrl);

        triggerTtsPlayRef.current = async () => {
          audioRef.current = audio;
          audio.onplay = () => {
            setTalkCycle((n) => n + 1);
            setSpeechAudioPlaying(true);
            setSpeechEnded(false);
          };
          const cleanup = () => {
            setSpeechAudioPlaying(false);
            setSpeechEnded(true);
            URL.revokeObjectURL(objectUrl);
          };
          audio.onended = cleanup;
          audio.onerror = cleanup;
          await audio.play();
        };

        setTtsGateReady(true);
      } catch (e) {
        console.warn('Initial TTS Load Error:', e);
        setTtsGateReady(true);
      }
    })();

    return () => {
      triggerTtsPlayRef.current = null;
    };
  }, [user?.id, loading, ttsText]);


  useEffect(() => {
    setSoundUnlocked(false);
  }, [user?.id]);

  useEffect(() => {
    if (!isMobile) {
      setShowBearOnlyMobile(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile) return;
    if (!soundUnlocked) {
      setShowBearOnlyMobile(true);
    } else {
      setShowBearOnlyMobile(false);
    }
  }, [isMobile, soundUnlocked]);

  const unlockDashboardSound = useCallback(() => {
    if (!ttsGateReady) return;
    triggerTtsPlayRef.current?.();
    setSoundUnlocked(true);
    videoRef.current?.play?.().catch(() => {});
  }, [ttsGateReady]);

  const handleVideoEnd = useCallback(() => {
    setIntroFinished(true);
  }, []);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Imperatively control thinking-start video playback
  useEffect(() => {
    const vid = thinkingStartRef.current;
    if (!vid) return;
    if (isBearThinking) {
      vid.currentTime = 0;
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [isBearThinking]);

  // Imperatively control thinking-end video playback
  useEffect(() => {
    const vid = thinkingEndRef.current;
    if (!vid) return;
    if (isBearThinkingEnd) {
      vid.currentTime = 0;
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [isBearThinkingEnd]);

  const handleNewChat = useCallback(() => {
    setChatMessages([]);
    setChatStatus('');
    setIsChatLoading(false);
    setIsBearThinking(false);
    setIsBearThinkingEnd(false);
    pendingReplyRef.current = null;
    // Also reset any greeting if desired, or keep it fresh
  }, []);

  const handleThinkingEndVideo = useCallback(() => {
    // legacy logic: now we push messages immediately in handleChatSend
    setIsBearThinkingEnd(false);
  }, []);

  const handleChatSend = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || isChatLoading) return;

    // User message
    const userMsg = { role: 'user', content: text, id: Date.now() };
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setChatInput('');
    setIsChatLoading(true);
    setChatStatus('Dr. Bear is thinking…');

    // Switch bear to thinking animation
    setIsBearThinking(true);
    setIsBearThinkingEnd(false);

    let assistantMsgId = Date.now() + 1;
    let fullContent = '';
    let buffer = '';

    try {
      const apiBase = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
      const res = await fetch(`${apiBase}/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_BACKEND_API_KEY
        },
        body: JSON.stringify({
          user_id: user.id,
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.body) throw new Error('No response body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last partial line in the buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.type === 'tool') {
              const toolMap = {
                get_health_records: 'Checking your health records…',
                get_latest_assessment: 'Looking at your latest assessment…',
                get_clinical_facts: 'Consulting cardiovascular facts…',
              };
              setChatStatus(toolMap[data.name] || `Dr. Bear is using ${data.name}…`);
            } else if (data.type === 'text') {
              fullContent += data.content;
              setChatMessages((prev) => {
                const filtered = prev.filter((m) => m.id !== assistantMsgId);
                return [
                  ...filtered,
                  { role: 'assistant', content: fullContent, id: assistantMsgId },
                ];
              });
            }
          } catch (e) {
            console.error('Failed to parse chunk:', line, e);
          }
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "I'm sorry, I had trouble connecting. Please check your internet and try again!",
          id: Date.now() + 5,
        },
      ]);
    } finally {
      setIsBearThinking(false);
      setIsBearThinkingEnd(true);
      setIsChatLoading(false);
      setChatStatus('');
      
      // Speak the final response
      if (fullContent) {
        speakResponse(fullContent);
      }
    }
  }, [chatInput, user?.id, isChatLoading, speakResponse]);


  if (loading) {
    return (
      <div className="flex h-dvh max-h-dvh items-center justify-center bg-zinc-100 text-zinc-600">
        <p className="text-sm">Loading…</p>
      </div>
    );
  }

  if (!user) return null;

  const showIdleUnderBear =
    introFinished && (speechEnded || !speechAudioPlaying) && !isBearThinking && !isBearThinkingEnd;
  const showMustacheTalking = !speechEnded && speechAudioPlaying;
  const showMobileBearToggle = isMobile;
  const showContentPanel = soundUnlocked && (!isMobile || !showBearOnlyMobile);
  const contentPanelWidth = !soundUnlocked
    ? '0%'
    : isMobile
      ? showBearOnlyMobile
        ? '0%'
        : '100%'
      : `calc(100% - ${bearWidth}px)`;
  const isBearHiddenOnMobile = isMobile && soundUnlocked && !showBearOnlyMobile;
  const bearContainerLeft = !soundUnlocked
    ? '50%'
    : isMobile
      ? showBearOnlyMobile
        ? '50%'
        : '100%'
      : '100%';
  const bearContainerTransform = !soundUnlocked
    ? 'translateX(-50%)'
    : isMobile
      ? showBearOnlyMobile
        ? 'translateX(-50%)'
        : 'translateX(0)'
      : 'translateX(-100%)';

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
            <GlassSurface
              width="100%"
              height="100%"
              borderRadius={16}
              blur={26}
              backgroundOpacity={0.28}
              className="flex size-full min-h-0 flex-col overflow-hidden rounded-2xl !items-stretch !justify-start"
              contentClassName="!h-full !min-h-0 !flex-col !items-stretch !justify-start !p-0"
            >
              <header className="dashboard-mobile-header relative flex h-14 shrink-0 items-center gap-2 border-b border-black/5 px-4 md:px-5">
                <style>
                  {`
                    @property --ai-rot {
                      syntax: '<angle>';
                      inherits: false;
                      initial-value: 0deg;
                    }
                    @keyframes ai-border-rotate {
                      from { --ai-rot: 0deg; }
                      to { --ai-rot: 360deg; }
                    }
                  `}
                </style>
                <div className="flex items-center gap-2">
                  <SidebarTrigger className="ml-0 text-sidebar-foreground hover:bg-black/5 rounded-md p-1.5 md:-ml-1" />
                  <div className="mx-2 h-4 w-px bg-black/10" aria-hidden="true" />
                  <span 
                    className="text-[16px] font-semibold text-zinc-800 tracking-tight"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {getTabTitle(activeTabId)}
                  </span>
                </div>
                {showMobileBearToggle ? (
                  <button
                    type="button"
                    onClick={() => setShowBearOnlyMobile((prev) => !prev)}
                    disabled={!soundUnlocked}
                    className="dashboard-mobile-bear-toggle inline-flex aspect-square items-center justify-center overflow-hidden rounded-full pt-[10%] pr-[16%] pb-[24%] pl-[16%] backdrop-blur lg:hidden"
                    aria-label={soundUnlocked ? (showBearOnlyMobile ? 'Return to dashboard content' : 'Show Dr. Bear view') : 'Unlock dashboard to toggle Dr. Bear view'}
                    style={{
                      position: 'absolute',
                      right: 'clamp(0.35rem, 1.2vw, 0.9rem)',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      height: 'calc(100% - clamp(0.45rem, 1.2vh, 0.8rem))',
                      border: '2px solid transparent',
                      '--ai-rot': '0deg',
                      background:
                        'linear-gradient(rgba(255,255,255,0.92), rgba(255,255,255,0.92)) padding-box, conic-gradient(from var(--ai-rot), rgba(59,130,246,0.95), rgba(99,102,241,0.95), rgba(79,70,229,0.95), rgba(67,56,202,0.95), rgba(59,130,246,0.95)) border-box',
                      animation: 'ai-border-rotate 9s linear infinite',
                      boxShadow:
                        '0 0 0.85rem rgba(59,130,246,0.24), 0 0 1.15rem rgba(99,102,241,0.2), 0 0 1.35rem rgba(79,70,229,0.18)',
                    }}
                  >
                    <img
                      src="/BooHooLogo.png"
                      alt=""
                      className="h-full w-auto object-contain drop-shadow-[0_0_0.35rem_rgba(255,255,255,0.8)]"
                    />
                  </button>
                ) : null}
              </header>

              <section
                className="min-h-0 flex-1 overflow-hidden"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  justifyContent: 'flex-start',
                  padding: 0,
                  minHeight: 0,
                }}
              >
                  <div className="flex min-h-0 w-full flex-1 flex-col">
                    <div
                      className="relative flex min-h-0 flex-1 flex-col items-center justify-center"
                      style={{ minHeight: 0 }}
                    >
                      {introFinished && !soundUnlocked ? (
                        <div className="absolute left-1/2 z-[60] -translate-x-1/2 flex flex-col items-center justify-center" style={{ bottom: '2rem' }}>
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
                            style={{padding: '1rem'}}
                          >
                            Get Started
                          </button>
                        </div>
                      ) : null}

                      {/* CONTENT CONTAINER (Fades in on the left side) */}
                      <div 
                        className="absolute left-0 top-0 h-full flex flex-col justify-center transition-all duration-1000"
                        style={{
                          width: contentPanelWidth,
                          opacity: showContentPanel ? 1 : 0,
                          pointerEvents: showContentPanel ? 'auto' : 'none',
                          overflow: 'hidden',
                          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                      >
                        {showContentPanel && activeTabId === 'overview' && <DashboardStats user={user} />}
                        {showContentPanel && activeTabId === 'assessment' && <AssessmentForm />}
                        {showContentPanel && activeTabId === 'reports' && <MyReports />}
                        {showContentPanel && activeTabId !== 'overview' && activeTabId !== 'assessment' && activeTabId !== 'reports' && (
                          <div className="h-full w-full overflow-y-auto flex flex-col justify-center p-6 md:p-8 rounded-xl">
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
                      </div>

                      {/* DR BEAR ANIMATION CONTAINER */}
                      <div
                        ref={bearContainerRef}
                        className="dashboard-bear-shell"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: bearContainerLeft,
                            transform: bearContainerTransform,
                            transition: 'left 1s cubic-bezier(0.16, 1, 0.3, 1), transform 1s cubic-bezier(0.16, 1, 0.3, 1)',
                            display: 'inline-block',
                            height: '100%',
                            width: 'max-content',
                            maxHeight: '100%',
                            backgroundColor: '#000000',
                            borderRadius: '32px',
                            overflow: 'hidden',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
                            opacity: isBearHiddenOnMobile ? 0 : 1,
                            pointerEvents: isBearHiddenOnMobile ? 'none' : 'auto',
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
                              pointerEvents: introFinished ? 'none' : 'auto',
                              backgroundColor: 'transparent',
                              border: 'none',
                              outline: 'none',
                            }}
                          />

                          {/* Thinking-start: loops while waiting for /chat response */}
                          <video
                            ref={thinkingStartRef}
                            src="/thinking-start.webm"
                            muted
                            playsInline
                            loop
                            preload="auto"
                            autoPlay={isBearThinking}
                            onLoadedData={() => { if (isBearThinking) thinkingStartRef.current?.play?.().catch(() => {}); }}
                            style={{
                              position: 'absolute',
                              inset: 0,
                              height: '100%',
                              width: '100%',
                              objectFit: 'contain',
                              display: 'block',
                              zIndex: 3,
                              transition: BEAR_MEDIA_TRANSITION,
                              opacity: isBearThinking ? 1 : 0,
                              pointerEvents: 'none',
                              backgroundColor: 'transparent',
                            }}
                          />

                          {/* Thinking-end: plays once after response arrives, then back to idle */}
                          <video
                            ref={thinkingEndRef}
                            src="/thinking-end.webm"
                            muted
                            playsInline
                            preload="auto"
                            autoPlay={isBearThinkingEnd}
                            onLoadedData={() => { if (isBearThinkingEnd) thinkingEndRef.current?.play?.().catch(() => {}); }}
                            onEnded={handleThinkingEndVideo}
                            style={{
                              position: 'absolute',
                              inset: 0,
                              height: '100%',
                              width: '100%',
                              objectFit: 'contain',
                              display: 'block',
                              zIndex: 4,
                              transition: BEAR_MEDIA_TRANSITION,
                              opacity: isBearThinkingEnd ? 1 : 0,
                              pointerEvents: 'none',
                              backgroundColor: 'transparent',
                            }}
                          />

                          {/* DR BEAR CHAT PANEL — overlaid on stomach area */}
                          <div
                            className="bear-chat-panel"
                            style={{
                              position: 'absolute',
                              left: '50%',
                              bottom: 0,
                              transform: 'translateX(-50%)',
                              width: '90%',
                              height: '43%',
                              zIndex: 10,
                              opacity: soundUnlocked ? 1 : 0,
                              pointerEvents: soundUnlocked ? 'auto' : 'none',
                              transition: 'opacity 0.6s ease',
                            }}
                          >
                                <div className="bear-chat-card relative">
                                  {/* Header Actions */}
                                  <div className="absolute top-2 right-2 z-20">
                                    <button
                                      onClick={handleNewChat}
                                      className="p-1.5 rounded-full bg-black/5 hover:bg-black/10 text-teal-800 transition-colors"
                                      title="New Chat"
                                    >
                                      <RotateCcw className="size-3.5" />
                                    </button>
                                  </div>

                                  {/* Messages */}
                                  <div className="bear-chat-messages">
                                    {chatMessages.length === 0 && (
                                      <div className="bear-chat-empty">
                                        <p>Ask Dr. Bear anything about heart health!</p>
                                      </div>
                                    )}
                                {chatMessages.map((msg) => (
                                  <div
                                    key={msg.id}
                                    className={`bear-chat-bubble ${
                                      msg.role === 'user' ? 'bear-chat-bubble--user' : 'bear-chat-bubble--assistant'
                                    }`}
                                  >
                                    {msg.content}
                                  </div>
                                ))}
                                </div>

                                {chatStatus && (
                                  <div className="px-3 py-1 text-[10px] text-teal-800/60 font-medium italic animate-pulse flex items-center gap-1.5" style={{marginLeft: "0.5rem"}}>
                                    <div className="size-1 rounded-full bg-teal-500" />
                                    {chatStatus}
                                  </div>
                                )}

                                {/* Input bar */}
                              <form
                                className="bear-chat-input-bar"
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  handleChatSend();
                                }}
                              >
                                <input
                                  type="text"
                                  className="bear-chat-input"
                                  placeholder={isChatLoading ? "Dr. Bear is thinking…" : "Type a message…"}
                                  value={chatInput}
                                  onChange={(e) => setChatInput(e.target.value)}
                                  autoComplete="off"
                                  disabled={isChatLoading}
                                />
                                <button
                                  type="submit"
                                  className="bear-chat-send-btn"
                                  disabled={!chatInput.trim() || isChatLoading}
                                  aria-label="Send message"
                                >
                                  <Send className="size-4" />
                                </button>
                              </form>
                            </div>
                          </div>
                        </div>
                    </div>
                  </div>
              </section>
            </GlassSurface>
          </SidebarInset>
        </TooltipProvider>
      </SidebarProvider>
    </div>
  );
}

export default Dashboard;
