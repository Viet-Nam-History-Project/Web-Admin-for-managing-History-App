export const ADMIN_SESSION_COOKIE = 'history_admin_session';
// Cookie server tồn tại đủ lâu qua nhiều lần tắt/mở máy. Nếu cookie hết hạn,
// Firebase browserLocalPersistence ở trang login sẽ tự tạo lại mà không hỏi mật khẩu.
export const ADMIN_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

export interface AdminSessionPayload {
  uid: string;
  email: string;
  displayName?: string;
  roles: string[];
  exp: number;
}

function encodeBase64Url(value: string | Uint8Array) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}

function decodeBase64Url(value: string) {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signature(input: string, secret: string) {
  if (secret.length < 32) throw new Error('ADMIN_SESSION_SECRET phải có ít nhất 32 ký tự.');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(input)));
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export async function createAdminSessionToken(
  payload: Omit<AdminSessionPayload, 'exp'>,
  secret: string,
) {
  const encodedPayload = encodeBase64Url(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS,
  }));
  const encodedSignature = encodeBase64Url(await signature(encodedPayload, secret));
  return `${encodedPayload}.${encodedSignature}`;
}

export async function verifyAdminSessionToken(token: string, secret: string) {
  const [encodedPayload, encodedSignature, extra] = token.split('.');
  if (!encodedPayload || !encodedSignature || extra) return null;

  try {
    const expected = await signature(encodedPayload, secret);
    const actual = decodeBase64Url(encodedSignature);
    if (!constantTimeEqual(expected, actual)) return null;

    const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(encodedPayload))) as AdminSessionPayload;
    if (!payload.uid || !Array.isArray(payload.roles) || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
