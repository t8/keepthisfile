import { MAX_FILE_BYTES } from './constants';

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
  const data = await response.json();
  
  // Normalize response format - API returns { authenticated, user } directly
  // but we expect { data: { authenticated, user } }
  if (data.authenticated !== undefined) {
    return { data: data };
  }
  
  return data;
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
  const maxMB = Math.round(MAX_FILE_BYTES / (1024 * 1024));
  if (file.size > MAX_FILE_BYTES) {
    return { error: `File too large. Maximum upload size is ${maxMB}MB.` };
  }

  try {
    console.log('Converting file to base64...', { name: file.name, size: file.size, type: file.type });
    
    // Convert file to base64 (handle large files properly)
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunkSize = 8192; // Process in chunks to avoid stack overflow
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(uint8Array.slice(i, i + chunkSize)));
    }
    const base64 = btoa(binary);
    const fileData = `data:${file.type || 'application/octet-stream'};base64,${base64}`;
    
    console.log('File converted, base64 length:', fileData.length);
    console.log('Starting upload request to:', `${API_BASE}/upload/free`);
    
    // Get auth token if available
    const token = getAuthToken();
    
    // Wrap the entire operation in a timeout promise race
    // This avoids issues with AbortController signal being checked during body reading
    const timeoutMs = 120000; // 2 minute timeout

    const fetchPromise = (async () => {
      const response = await fetch(`${API_BASE}/upload/free`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          fileData,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
        }),
      });

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
    })();

    const timeoutPromise = new Promise<ApiResponse<any>>((_, reject) => {
      setTimeout(() => reject(new Error('Upload timed out after 2 minutes')), timeoutMs);
    });

    return await Promise.race([fetchPromise, timeoutPromise]);
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
  try {
    const token = localStorage.getItem('auth-token');
    console.log('[API] Creating upload session, sizeBytes:', sizeBytes);
    
    const timeoutMs = 30000; // 30 second timeout
    
    const fetchPromise = (async () => {
      const response = await fetch(`${API_BASE}/payments/create-upload-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ sizeBytes }),
      });
      
      console.log('[API] Response received! Status:', response.status, response.statusText);
      console.log('[API] Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
        console.error('[API] Upload session creation failed:', errorData);
        return { error: errorData.error || `Upload session creation failed with status ${response.status}` };
      }

      // Read as text first, then parse (similar to uploadFree)
      const text = await response.text();
      console.log('[API] Response text:', text);
      
      let jsonResponse;
      try {
        jsonResponse = JSON.parse(text);
      } catch (parseError) {
        console.error('[API] Failed to parse JSON:', parseError, 'Text:', text);
        return { error: 'Invalid response from server' };
      }
      
      console.log('[API] Upload session response received:', jsonResponse);
      return jsonResponse;
    })();

    const timeoutPromise = new Promise<ApiResponse<any>>((_, reject) => {
      setTimeout(() => reject(new Error('Upload session creation timed out after 30 seconds')), timeoutMs);
    });

    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (error: any) {
    console.error('[API] Exception creating upload session:', error);
    return { 
      error: error.message || 'Network error: Failed to create upload session. Please check your connection and try again.' 
    };
  }
}

export async function verifyUploadSession(sessionId: string): Promise<ApiResponse<{
  sessionId: string;
  status: string;
  expectedSizeBytes: number;
  userId: string;
  paymentStatus?: string;
  stripeStatus?: string;
}>> {
  const token = localStorage.getItem('auth-token');
  const response = await fetch(`${API_BASE}/upload/success?session_id=${encodeURIComponent(sessionId)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
    return { error: errorData.error || `Failed to verify session with status ${response.status}` };
  }
  
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
  const maxMB = Math.round(MAX_FILE_BYTES / (1024 * 1024));
  if (file.size > MAX_FILE_BYTES) {
    return { error: `File too large. Maximum upload size is ${maxMB}MB.` };
  }

  try {
    console.log('Converting file to base64 for paid upload...', { name: file.name, size: file.size, type: file.type });

    // Convert file to base64 (handle large files properly)
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunkSize = 8192; // Process in chunks to avoid stack overflow
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(uint8Array.slice(i, i + chunkSize)));
    }
    const base64 = btoa(binary);
    const fileData = `data:${file.type || 'application/octet-stream'};base64,${base64}`;
    
    const token = localStorage.getItem('auth-token');
    
    const response = await fetch(`${API_BASE}/upload/paid`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({
        fileData,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sessionId,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
      return { error: errorData.error || `Upload failed with status ${response.status}` };
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('Paid upload exception:', error);
    return { 
      error: error.message || 'Network error: Failed to upload file. Please check your connection and try again.' 
    };
  }
}

// Files API
export async function getUserFiles(limit?: number, offset?: number): Promise<ApiResponse<{
  files: Array<{
    id: string;
    arweaveTxId: string;
    arweaveUrl: string;
    sizeBytes: number;
    mimeType: string;
    originalFileName: string;
    createdAt: string;
  }>;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}>> {
  const token = localStorage.getItem('auth-token');
  const params = new URLSearchParams();
  if (limit !== undefined) params.append('limit', limit.toString());
  if (offset !== undefined) params.append('offset', offset.toString());
  
  const url = `${API_BASE}/files${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
    return { error: errorData.error || `Failed to get files with status ${response.status}` };
  }
  
  const result = await response.json();
  
  // Normalize response format - API returns { success, files, pagination } but we expect { data: { files, pagination } }
  if (result.files) {
    return {
      success: result.success,
      data: { 
        files: result.files,
        pagination: result.pagination,
      },
    };
  }
  
  return result;
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

// Link files API
export async function linkFilesToUser(arweaveUrls: string[]): Promise<ApiResponse<{
  linkedCount: number;
}>> {
  const token = getAuthToken();
  if (!token) {
    return { error: 'Authentication required' };
  }

  const response = await fetch(`${API_BASE}/files/link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ arweaveUrls }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
    return { error: errorData.error || `Failed to link files with status ${response.status}` };
  }

  return await response.json();
}

// Refund API
export async function requestRefund(sessionId: string): Promise<ApiResponse<{
  refundId: string;
  amount: number;
  status: string;
}>> {
  const token = getAuthToken();
  if (!token) {
    return { error: 'Authentication required' };
  }

  const response = await fetch(`${API_BASE}/payments/refund`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ sessionId }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
    return { error: errorData.error || `Failed to request refund with status ${response.status}` };
  }

  return await response.json();
}


