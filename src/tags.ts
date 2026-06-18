const STORAGE_KEY = 'strata_activity_tags';

export type TagMap = Record<string, string[]>; // activity_name → tags

export function getTagMap(): TagMap {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function saveTagMap(map: TagMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function getAllTags(map: TagMap): string[] {
  return [...new Set(Object.values(map).flat())].sort();
}

export function activitiesForTag(map: TagMap, tag: string): string[] {
  return Object.entries(map)
    .filter(([, tags]) => tags.includes(tag))
    .map(([activity]) => activity);
}
