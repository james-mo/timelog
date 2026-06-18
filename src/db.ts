import Dexie, { type EntityTable } from "dexie";
import dexieCloud from 'dexie-cloud-addon';

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

const db = new Dexie('timelog', { addons: [dexieCloud]}) as Dexie & {
    sessions: EntityTable<Session, 'id'>;
    activities: EntityTable<Activity, 'id'>;
};

db.version(1).stores({
    sessions: '@id, activity_name, timestamp'
});

db.version(2).stores({
    sessions: '@id, activity_name, timestamp',
    activities: '@id, name',
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

const deleteActivityByName = (name: string) =>
    db.transaction('rw', [db.activities, db.sessions], async () => {
        await db.activities.where('name').equals(name).delete();
        await db.sessions.where('activity_name').equals(name).delete();
    });

export { db, addSession, deleteSession, updateSession, fetchAllSessions, fetchAllActivities, addActivity, deleteActivity, deleteActivityByName, getAllActivityNames };
export type { Session, Activity };
