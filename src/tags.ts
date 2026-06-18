export type TagMap = Record<string, string[]>; // activity_name → tags

export function getAllTags(map: TagMap): string[] {
  return [...new Set(Object.values(map).flat())].sort();
}

export function activitiesForTag(map: TagMap, tag: string): string[] {
  return Object.entries(map)
    .filter(([, tags]) => tags.includes(tag))
    .map(([activity]) => activity);
}
