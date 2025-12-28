const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  data?: T;
}

// Auth API
export async function requestMagicLink(email: string): Promise<ApiResponse<void>> {
  const response = await fetch(`${API_BASE}/auth/magic-link/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return await response.json();
}

export async function getCurrentUser(): Promise<ApiResponse<{
  authenticated: boolean;
  user: {
    email: string;
    userId: string;
    createdAt?: string;
    lastLoginAt?: string;
  } | null;
}>> {
  const token = localStorage.getItem('auth-token');
  const response = await fetch(`${API_BASE}/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  return await response.json();
}

// Upload API
export async function uploadFree(file: File): Promise<ApiResponse<{
  file: {
    id: string;
    txId: string;
    arweaveUrl: string;
    sizeBytes: number;
    fileName: string;
  };
}>> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/upload/free`, {
    method: 'POST',
    body: formData,
  });
  return await response.json();
}

export async function createUploadSession(sizeBytes: number): Promise<ApiResponse<{
  sessionId: string;
  url: string;
  amount: number;
}>> {
  const token = localStorage.getItem('auth-token');
  const response = await fetch(`${API_BASE}/payments/create-upload-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ sizeBytes }),
  });
  return await response.json();
}

export async function uploadPaid(file: File, sessionId: string): Promise<ApiResponse<{
  file: {
    id: string;
    txId: string;
    arweaveUrl: string;
    sizeBytes: number;
    fileName: string;
  };
}>> {
  const token = localStorage.getItem('auth-token');
  const formData = new FormData();
  formData.append('file', file);
  formData.append('sessionId', sessionId);

  const response = await fetch(`${API_BASE}/upload/paid`, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });
  return await response.json();
}

// Files API
export async function getUserFiles(): Promise<ApiResponse<{
  files: Array<{
    id: string;
    arweaveTxId: string;
    arweaveUrl: string;
    sizeBytes: number;
    mimeType: string;
    originalFileName: string;
    createdAt: string;
  }>;
}>> {
  const token = localStorage.getItem('auth-token');
  const response = await fetch(`${API_BASE}/files`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  return await response.json();
}

export function setAuthToken(token: string) {
  localStorage.setItem('auth-token', token);
}

export function clearAuthToken() {
  localStorage.removeItem('auth-token');
}

export function getAuthToken(): string | null {
  return localStorage.getItem('auth-token');
}

