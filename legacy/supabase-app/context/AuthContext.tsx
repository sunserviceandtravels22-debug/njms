
import React, { createContext, useContext, useState, useEffect } from 'react';
import { APP_CONFIG, ADMIN_CREDENTIALS } from '../config';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const token = sessionStorage.getItem(APP_CONFIG.persistenceKey);
    if (token === 'authorized_session_active') {
      setIsAuthenticated(true);
    }
  }, []);

  const login = (usernameInput: string, passwordInput: string) => {
    if (
      usernameInput === ADMIN_CREDENTIALS.username && 
      passwordInput === ADMIN_CREDENTIALS.password
    ) {
      setIsAuthenticated(true);
      sessionStorage.setItem(APP_CONFIG.persistenceKey, 'authorized_session_active');
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem(APP_CONFIG.persistenceKey);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
