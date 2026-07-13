'use client';

import { User } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase/client';

async function getAuthenticatedUser(): Promise<User> {
  // Chờ Firebase đọc phiên đăng nhập từ IndexedDB/local persistence sau khi reload.
  await firebaseAuth.authStateReady();
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
  return user;
}

async function requestWithToken(url: string, init: RequestInit, forceRefresh = false) {
  const user = await getAuthenticatedUser();
  const token = await user.getIdToken(forceRefresh);
  localStorage.setItem('admin_id_token', token);
  return fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });
}

export async function adminFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  let response = await requestWithToken(url, init);

  // Token Firebase hết hạn sẽ được refresh và thử lại đúng một lần.
  if (response.status === 401) response = await requestWithToken(url, init, true);

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? 'Thao tác thất bại.');
  return data as T;
}
