import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div style={styles.container}>
        <p style={styles.loadingText}>Loading…</p>
      </div>
    );
  }

  if (!user) return null;

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    'User';
  const avatarUrl =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    null;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          {avatarUrl && (
            <img
              src={avatarUrl}
              alt={displayName}
              style={styles.avatar}
              referrerPolicy="no-referrer"
            />
          )}
          <div>
            <h1 style={styles.name}>{displayName}</h1>
            <p style={styles.email}>{user.email}</p>
          </div>
        </div>

        <div style={styles.divider} />

        <p style={styles.placeholder}>
          Your dashboard is coming soon. Health metrics, charts, and insights will appear here.
        </p>

        <button onClick={signOut} style={styles.signOutBtn} id="sign-out-btn">
          Sign Out
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0F172A 0%, #1e293b 50%, #0F172A 100%)',
    fontFamily: "'Geist Variable', sans-serif",
    padding: 24,
  },
  card: {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 32,
    maxWidth: 440,
    width: '100%',
    color: '#ffffff',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.15)',
  },
  name: {
    fontSize: 22,
    fontWeight: 600,
    margin: 0,
  },
  email: {
    fontSize: 14,
    opacity: 0.6,
    margin: '4px 0 0',
  },
  divider: {
    height: 1,
    background: 'rgba(255,255,255,0.1)',
    margin: '24px 0',
  },
  placeholder: {
    fontSize: 15,
    opacity: 0.5,
    lineHeight: 1.6,
    margin: '0 0 24px',
  },
  signOutBtn: {
    width: '100%',
    padding: '12px 0',
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
    fontFamily: "'Geist Variable', sans-serif",
  },
  loadingText: {
    color: '#ffffff',
    opacity: 0.7,
    fontFamily: "'Geist Variable', sans-serif",
  },
};

export default Dashboard;
