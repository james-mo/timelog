import Dexie, { type EntityTable } from "dexie";
import dexieCloud from 'dexie-cloud-addon';
import type { TagMap } from './tags';

type Session = {
    id?: string;
    activity_name: string;
    timestamp: number;
    duration: number;
    rating: number | null;
}

type Activity = {
    id?: string;
    name: string;
}

type TagAssignment = {
    id?: string;
    activity_name: string;
    tag: string;
}

type TimerState = {
    id: string;
    startTime: number;
}

const db = new Dexie('timelog', { addons: [dexieCloud]}) as Dexie & {
    sessions: EntityTable<Session, 'id'>;
    activities: EntityTable<Activity, 'id'>;
    tag_assignments: EntityTable<TagAssignment, 'id'>;
    timer_state: EntityTable<TimerState, 'id'>;
};

db.version(1).stores({
    sessions: '@id, activity_name, timestamp'
});

db.version(2).stores({
    sessions: '@id, activity_name, timestamp',
    activities: '@id, name',
});

db.version(3).stores({
    sessions: '@id, activity_name, timestamp',
    activities: '@id, name',
    tag_assignments: '@id, activity_name, tag',
});

db.version(4).stores({
    sessions: '@id, activity_name, timestamp',
    activities: '@id, name',
    tag_assignments: '@id, activity_name, tag',
    timer_state: 'id',
});

db.cloud.configure({
    databaseUrl: import.meta.env.VITE_DEXIE_CLOUD_URL,
    requireAuth: true,
});

const addSession = (s: Omit<Session, 'id'>) => db.sessions.add(s);
const deleteSession = (id: string | undefined) => db.sessions.delete(id);
const fetchAllSessions = () => db.sessions.toArray();
const fetchAllActivities = () => db.activities.toArray();
const addActivity = (name: string) => db.activities.add({ name });
const deleteActivity = (id: string | undefined) => db.activities.delete(id);
const getAllActivityNames = async (): Promise<string[]> => {
    const [sessions, activities] = await Promise.all([
        db.sessions.toArray(),
        db.activities.toArray(),
    ]);
    const names = [
        ...sessions.map(s => s.activity_name),
        ...activities.map(a => a.name),
    ];
    return [...new Set(names)].sort();
};
const updateSession = async (updatedSession: Session): Promise<string | undefined> => {
    return db.sessions.put(updatedSession);
}

const ACTIVE_TIMER_ID = 'active';
const startTimer = (startTime: number) => db.timer_state.put({ id: ACTIVE_TIMER_ID, startTime });
const stopTimer = () => db.timer_state.delete(ACTIVE_TIMER_ID);
const getActiveTimer = () => db.timer_state.get(ACTIVE_TIMER_ID);

const deleteActivityByName = (name: string) =>
    db.transaction('rw', [db.activities, db.sessions, db.tag_assignments], async () => {
        await db.activities.where('name').equals(name).delete();
        await db.sessions.where('activity_name').equals(name).delete();
        await db.tag_assignments.where('activity_name').equals(name).delete();
    });

const saveTagMapToDb = async (newMap: TagMap): Promise<void> => {
    const existing = await db.tag_assignments.toArray();
    const affectedActivities = new Set([
        ...existing.map(a => a.activity_name),
        ...Object.keys(newMap),
    ]);
    await db.transaction('rw', db.tag_assignments, async () => {
        for (const activity_name of affectedActivities) {
            await db.tag_assignments.where('activity_name').equals(activity_name).delete();
            const tags = newMap[activity_name] ?? [];
            if (tags.length > 0) {
                await db.tag_assignments.bulkAdd(tags.map(tag => ({ activity_name, tag })));
            }
        }
    });
};

export { db, addSession, deleteSession, updateSession, fetchAllSessions, fetchAllActivities, addActivity, deleteActivity, deleteActivityByName, getAllActivityNames, saveTagMapToDb, startTimer, stopTimer, getActiveTimer };
export type { Session, Activity, TagAssignment, TimerState };
