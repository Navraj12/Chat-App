import { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Chat';

function App() {
  const [user, setUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleRegister = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (user) {
    return <Chat user={user} onLogout={handleLogout} />;
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f0f2f5',
      fontFamily: 'Arial, sans-serif'
    }}>
      {showRegister ? (
        <Register 
          onRegister={handleRegister}
          onSwitchToLogin={() => setShowRegister(false)}
        />
      ) : (
        <Login 
          onLogin={handleLogin}
          onSwitchToRegister={() => setShowRegister(true)}
        />
      )}
    </div>
  );
}

export default App;