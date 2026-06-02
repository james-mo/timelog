import Dexie, { type EntityTable } from "dexie";
import dexieCloud from 'dexie-cloud-addon';

type Session = {
    id?: string;
    activity_name: string;
    timestamp: number;
    duration: number;
    rating: number | null;
}

const db = new Dexie('timelog', { addons: [dexieCloud]}) as Dexie & {
    sessions: EntityTable<Session, 'id'>;
};

db.version(1).stores({
    sessions: '@id, activity_name, timestamp'
});

db.cloud.configure({
    databaseUrl: 'https://zi7rpw76n.dexie.cloud',
    requireAuth: true,
});

window.db = db;

const addSession = (s: Omit<Session, 'id'>) => db.sessions.add(s);
const deleteSession = (id: string | undefined) => db.sessions.delete(id);
const fetchAllSessions = () => db.sessions.toArray();
const fetchSessionsSince = (since: number) =>
    db.sessions.where('timestamp').aboveOrEqual(since).toArray();
const getAllActivityNames = async (): Promise<string[]> => {
    const sessions = await db.sessions.toArray();
    return [...new Set(sessions.map(s => s.activity_name))];
};
const updateSession = async (updatedSession: Session): Promise<string | undefined> => {
    return db.sessions.put(updatedSession);
}

export { db, addSession, deleteSession, updateSession, fetchAllSessions, fetchSessionsSince, getAllActivityNames };
export type { Session };