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

  try {
    console.log('Starting upload request to:', `${API_BASE}/upload/free`);
    
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
    
    const response = await fetch(`${API_BASE}/upload/free`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    console.log('Response received! Status:', response.status, response.statusText);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
      console.error('Upload failed:', errorData);
      return { error: errorData.error || `Upload failed with status ${response.status}` };
    }

    const text = await response.text();
    console.log('Response text:', text);
    
    let jsonResponse;
    try {
      jsonResponse = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError, 'Text:', text);
      return { error: 'Invalid response from server' };
    }
    
    console.log('Parsed upload response:', jsonResponse);
    return jsonResponse;
  } catch (error: any) {
    console.error('Upload exception:', error);
    return { 
      error: error.message || 'Network error: Failed to upload file. Please check your connection and try again.' 
    };
  }
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

