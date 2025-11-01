/**
 * Admin Authentication Utilities
 * Handles admin login session management
 */

export interface AdminSession {
  isAuthenticated: boolean;
  adminId: string;
  loginTime: string;
}

/**
 * Check if admin is authenticated
 */
export const isAdminAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    const sessionData = sessionStorage.getItem('adminSession');
    if (!sessionData) return false;
    
    const session: AdminSession = JSON.parse(sessionData);
    
    // Check if session is valid (not expired - 8 hours)
    const loginTime = new Date(session.loginTime);
    const now = new Date();
    const hoursSinceLogin = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLogin > 8) {
      // Session expired
      sessionStorage.removeItem('adminSession');
      return false;
    }
    
    return session.isAuthenticated === true;
  } catch (error) {
    console.error('Error checking admin authentication:', error);
    return false;
  }
};

/**
 * Get current admin session
 */
export const getAdminSession = (): AdminSession | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const sessionData = sessionStorage.getItem('adminSession');
    if (!sessionData) return null;
    
    return JSON.parse(sessionData) as AdminSession;
  } catch (error) {
    console.error('Error getting admin session:', error);
    return null;
  }
};

/**
 * Clear admin session (logout)
 */
export const clearAdminSession = (): void => {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('adminSession');
};

