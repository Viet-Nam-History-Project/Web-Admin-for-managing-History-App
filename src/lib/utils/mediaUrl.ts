function extractGoogleDriveId(value: string) {
  const pathMatch = value.match(/drive\.google\.com\/file\/d\/([^/?#]+)/i);
  if (pathMatch?.[1]) return pathMatch[1];

  try {
    const url = new URL(value);
    if (url.hostname.includes('drive.google.com')) {
      return url.searchParams.get('id') || undefined;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export function mediaUrlCandidates(reference?: string | null) {
  const value = reference?.trim();
  if (!value) return [];

  const driveId = extractGoogleDriveId(value);
  if (!driveId) return [value];

  const encodedId = encodeURIComponent(driveId);
  return [
    `https://drive.google.com/thumbnail?id=${encodedId}&sz=w1600`,
    `https://drive.usercontent.google.com/download?id=${encodedId}&export=view&authuser=0`,
    value,
  ];
}

export function resolveMediaUrl(reference?: string | null) {
  return mediaUrlCandidates(reference)[0] ?? '';
}
