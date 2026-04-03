import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase client automatically picks up the tokens from the URL hash.
    // We just need to wait for the session to be established, then redirect.
    const handleAuthCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Auth callback error:', error.message);
        navigate('/');
        return;
      }

      if (session) {
        navigate('/dashboard', { replace: true });
      } else {
        // Session not ready yet — listen for it
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            if (event === 'SIGNED_IN' && session) {
              subscription.unsubscribe();
              navigate('/dashboard', { replace: true });
            }
          }
        );

        // Timeout fallback — if no session after 5s, go home
        setTimeout(() => {
          subscription.unsubscribe();
          navigate('/');
        }, 5000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#1c1c1c',
      color: '#ffffff',
      fontFamily: "'Geist Variable', sans-serif",
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 40,
          height: 40,
          border: '3px solid rgba(255,255,255,0.15)',
          borderTopColor: '#0284C7',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 16px',
        }} />
        <p style={{ opacity: 0.7, fontSize: 14 }}>Signing you in…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

export default AuthCallback;
