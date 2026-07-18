import { normalizeHistoricalDate } from '@/lib/utils/historicalDate';

type AnyRecord = Record<string, any>;

function list(value: unknown) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

export function periodEditorValues(item: AnyRecord) {
  return {
    title: item.title ?? '', slug: item.slug ?? item.id ?? '',
    startDate: normalizeHistoricalDate(item.startDate), endDate: normalizeHistoricalDate(item.endDate),
    coverMediaRef: item.coverMediaRef ?? '', status: item.status ?? 'draft', sortOrder: item.sortOrder ?? 0,
    tags: list(item.tags), summary: item.summary ?? '', description: item.description ?? '',
  };
}

export function stageEditorValues(item: AnyRecord) {
  return {
    title: item.title ?? '', slug: item.slug ?? item.id ?? '',
    startDate: normalizeHistoricalDate(item.startDate), endDate: normalizeHistoricalDate(item.endDate),
    coverMediaRef: item.coverMediaRef ?? '', status: item.status ?? 'draft', sortOrder: item.sortOrder ?? 0,
    tags: list(item.tags), overview: item.overview ?? '', description: item.description ?? '',
    details: list(item.details), result: list(item.result), impactOnPresent: item.impactOnPresent ?? '',
    relatedPersons: list(item.relatedPersons), relatedLocations: list(item.relatedLocations),
  };
}

export function eventEditorValues(item: AnyRecord) {
  const imageUrls = Array.isArray(item.images) ? item.images.map((entry: AnyRecord | string) => typeof entry === 'string' ? entry : entry?.link).filter(Boolean) : [];
  const videoUrls = Array.isArray(item.videos) ? item.videos.map((entry: AnyRecord | string) => typeof entry === 'string' ? entry : entry?.link).filter(Boolean) : [];
  return {
    title: item.title ?? '', slug: item.slug ?? item.id ?? '', smallTitle: item.smallTitle ?? '',
    startDate: normalizeHistoricalDate(item.startDate), endDate: normalizeHistoricalDate(item.endDate),
    coverMediaRef: item.coverMediaRef ?? '', status: item.status ?? 'draft', sortOrder: item.sortOrder ?? 0,
    tags: list(item.tags), summary: item.summary ?? '', description: item.description ?? '', details: list(item.details),
    warCause: list(item.warCause), objectVn: list(item.object?.vn), objectOpponent: list(item.object?.usAllies),
    forcesVn: list(item.content?.forces?.vn), forcesOpponent: list(item.content?.forces?.usAllies),
    progress: Array.isArray(item.content?.warSummary) ? item.content.warSummary.map((entry: AnyRecord) => entry.detail).filter(Boolean) : [],
    resultVn: list(item.content?.result?.vn), resultOpponent: list(item.content?.result?.usAllies),
    meaning: list(item.meaning), impactOnPresent: item.impactOnPresent ?? '',
    imageUrls, videoUrls, youtubeId: item.youtubeId ?? '',
    relatedPersons: list(item.relatedPersons), relatedEvents: list(item.relatedEvents), relatedLocations: list(item.relatedLocations),
  };
}

export function personPeriodEditorValues(item: AnyRecord) {
  return {
    title: item.title ?? '', slug: item.slug ?? item.id ?? '',
    startDate: normalizeHistoricalDate(item.startDate), endDate: normalizeHistoricalDate(item.endDate),
    coverMediaRef: item.coverMediaRef ?? '', status: item.status ?? 'draft', sortOrder: item.sortOrder ?? 0,
    description: item.description ?? '',
  };
}

export function personEditorValues(item: AnyRecord) {
  return {
    slug: item.slug ?? item.id ?? '', name: item.name ?? '', title: item.title ?? '',
    overview: item.overview ?? '', hometown: item.hometown ?? '',
    birthDate: item.birthDate ?? item.birth_year ?? '', deathDate: item.deathDate ?? item.death_year ?? '',
    coverMediaRef: item.coverMediaRef ?? '', horizontalImage: item.horizontalImage ?? '',
    achievements: list(item.achievements), lifetime: list(item.lifetime),
    videoLink: item.video?.link ?? '', videoContent: item.video?.content ?? '',
    status: item.status ?? 'draft', sortOrder: item.sortOrder ?? 0,
  };
}

export function personEventEditorValues(item: AnyRecord) {
  return {
    slug: item.slug ?? item.id ?? '', title: item.title ?? '', overview: item.overview ?? '',
    role: item.role ?? '', description: item.description ?? '', coverMediaRef: item.coverMediaRef ?? '',
    eventRef: item.eventRef ?? '', status: item.status ?? 'draft', sortOrder: item.sortOrder ?? 0,
  };
}
