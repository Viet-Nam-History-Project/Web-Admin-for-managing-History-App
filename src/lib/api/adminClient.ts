'use client';

import { firebaseAuth } from '@/lib/firebase/client';

async function getAuthenticatedUser() {
  // Chờ Firebase đọc phiên đăng nhập từ IndexedDB/local persistence sau khi reload.
  await firebaseAuth.authStateReady();
  return firebaseAuth.currentUser;
}

async function requestWithToken(url: string, init: RequestInit, forceRefresh = false) {
  const user = await getAuthenticatedUser();
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (user) {
    const token = await user.getIdToken(forceRefresh);
    localStorage.setItem('admin_id_token', token);
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(url, {
    ...init,
    headers,
    credentials: 'same-origin',
  });
}

function describeTransportError(error: unknown) {
  if (error instanceof Error && error.name === 'AbortError') {
    return 'Yêu cầu tới Web Admin đã bị hủy. Vui lòng thử lại.';
  }
  if (
    error instanceof TypeError
    || (error instanceof Error && /failed to fetch|fetch failed/i.test(error.message))
  ) {
    return 'Mất kết nối tới Web Admin. Hãy kiểm tra Web đang chạy ở cổng 3000, tải lại trang rồi thử lại.';
  }
  return error instanceof Error ? error.message : 'Không thể kết nối tới Web Admin.';
}

export async function adminFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  try {
    let response = await requestWithToken(url, init);

    // Token Firebase hết hạn sẽ được refresh và thử lại đúng một lần.
    if (response.status === 401) response = await requestWithToken(url, init, true);

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? 'Thao tác thất bại.');
    return data as T;
  } catch (error) {
    throw new Error(describeTransportError(error), { cause: error });
  }
}

export async function adminDownload(
  url: string,
  init: RequestInit = {},
): Promise<{ blob: Blob; filename: string | null }> {
  let response = await requestWithToken(url, init);
  if (response.status === 401) response = await requestWithToken(url, init, true);

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? 'Không thể tải file.');
  }

  const disposition = response.headers.get('Content-Disposition') ?? '';
  const filename = disposition.match(/filename="([^"]+)"/i)?.[1] ?? null;
  return { blob: await response.blob(), filename };
}
