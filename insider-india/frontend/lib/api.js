'use client';

import { PUBLIC_API_URL } from './config';
import { useAuth } from '@/store/auth';

export class ApiError extends Error {
  constructor(message, { status = 0, code, errors = [], details } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.details = details;
  }

  fieldErrors() {
    return Object.fromEntries((this.errors || []).map((e) => [e.field, e.message]));
  }
}

let refreshing = null;

export function refreshSession() {
  if (!refreshing) {
    refreshing = fetch(`${PUBLIC_API_URL}/api/v1/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (res.ok && body.success) {
          useAuth.getState().setSession(body.data);
          return true;
        }
        useAuth.getState().clear();
        return false;
      })
      .catch(() => { useAuth.getState().clear(); return false; })
      .finally(() => { setTimeout(() => { refreshing = null; }, 0); });
  }
  return refreshing;
}

export async function api(path, { method = 'GET', body, leadToken, retry = true, signal, headers = {} } = {}) {
  const token = useAuth.getState().accessToken;
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  let res;
  try {
    res = await fetch(`${PUBLIC_API_URL}/api/v1${path}`, {
      method,
      credentials: 'include',
      signal,
      headers: {
        ...(isForm || !body ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(leadToken ? { 'X-Lead-Token': leadToken } : {}),
        ...headers,
      },
      body: isForm ? body : body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('We could not reach the server. Check your connection and try again.', { code: 'NETWORK_ERROR' });
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && retry && ['TOKEN_EXPIRED', 'AUTH_REQUIRED', 'INVALID_TOKEN'].includes(data.code) && token) {
    if (await refreshSession()) return api(path, { method, body, leadToken, retry: false, signal, headers });
  }
  if (!res.ok || data.success === false) {
    throw new ApiError(data.message || 'Something went wrong. Please try again.', { status: res.status, code: data.code, errors: data.errors, details: data.details });
  }
  return data;
}

// Multipart upload with progress (fetch has no upload progress events).
export function uploadFile(file, purpose, { onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append('purpose', purpose);
    fd.append('file', file);
    xhr.open('POST', `${PUBLIC_API_URL}/api/v1/uploads`);
    xhr.withCredentials = true;
    const token = useAuth.getState().accessToken;
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText); } catch { /* ignore */ }
      if (xhr.status >= 200 && xhr.status < 300 && data.success) resolve(data.data.media);
      else reject(new ApiError(data.message || 'Upload failed. Please try again.', { status: xhr.status, code: data.code }));
    };
    xhr.onerror = () => reject(new ApiError('Upload failed. Check your connection and try again.', { code: 'NETWORK_ERROR' }));
    xhr.onabort = () => reject(new ApiError('Upload cancelled', { code: 'ABORTED' }));
    if (signal) signal.addEventListener('abort', () => xhr.abort());
    xhr.send(fd);
  });
}
