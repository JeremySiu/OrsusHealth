import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import LoadingScreen from '../components/LoadingScreen';

function AuthCallback() {
  const navigate = useNavigate();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [destination, setDestination] = useState(null); // '/dashboard' or '/'
  const [fadeOut, setFadeOut] = useState(false);

  // Minimum 1.5-second display
  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Resolve the auth session (but don't navigate yet)
  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Auth callback error:', error.message);
        setDestination('/');
        return;
      }

      if (session) {
        setDestination('/dashboard');
      } else {
        // Session not ready yet — listen for it
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            if (event === 'SIGNED_IN' && session) {
              subscription.unsubscribe();
              setDestination('/dashboard');
            }
          }
        );

        // Timeout fallback — if no session after 5s, go home
        setTimeout(() => {
          subscription.unsubscribe();
          setDestination('/');
        }, 5000);
      }
    };

    handleAuthCallback();
  }, []);

  // Navigate only after BOTH the 3-second minimum AND auth resolution
  useEffect(() => {
    if (minTimeElapsed && destination) {
      setFadeOut(true);
      const timer = setTimeout(() => {
        navigate(destination, { replace: true });
      }, 600); // matches CSS fade-out duration
      return () => clearTimeout(timer);
    }
  }, [minTimeElapsed, destination, navigate]);

  return <LoadingScreen fadeOut={fadeOut} />;
}

export default AuthCallback;
