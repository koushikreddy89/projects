
import { ScanRecord, UserProfile } from "../types";

const HISTORY_KEY = 'agrivision_history';
const USER_KEY = 'agrivision_user';
const USERS_DB_KEY = 'agrivision_users_db'; // "Database" of all registered users

// --- History Management ---
export const saveScan = (scan: ScanRecord) => {
  const history = getHistory();
  // Prepend new scan
  const updated = [scan, ...history].slice(50); // Keep max 50
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
};

export const getHistory = (): ScanRecord[] => {
  const data = localStorage.getItem(HISTORY_KEY);
  return data ? JSON.parse(data) : [];
};

// --- Current Session Management ---
export const saveUser = (user: UserProfile) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getUser = (): UserProfile | null => {
  const data = localStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
};

export const logoutUser = () => {
  localStorage.removeItem(USER_KEY);
};

// --- User Database Management (Auth) ---

const getAllUsers = (): UserProfile[] => {
  const data = localStorage.getItem(USERS_DB_KEY);
  return data ? JSON.parse(data) : [];
};

export const findUserByPhone = (phone: string): UserProfile | undefined => {
  const users = getAllUsers();
  return users.find(u => u.phone === phone);
};

export const registerNewUser = (user: UserProfile): boolean => {
  const users = getAllUsers();
  if (users.find(u => u.phone === user.phone)) {
    return false; // User already exists
  }
  users.push(user);
  localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
  return true;
};
