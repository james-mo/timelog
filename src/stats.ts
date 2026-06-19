import { type Session } from "./db";

type totalActivity = {
    activity: string,
    totalSeconds: number
}

type dateActivity = {
    date: string,
    totalSeconds: number
}

export function totalsByActivity(sessions: Session[]): totalActivity[] {
    const acc: Record<string, number> = {};

    for (const session of sessions) {
        acc[session.activity_name] = (acc[session.activity_name] ?? 0) + session.duration;
    }
    return Object.entries(acc)
        .map(([activity, totalSeconds]) => ({ activity, totalSeconds }))
        .sort((a, b) => b.totalSeconds - a.totalSeconds);
}

export function totalsByDay(sessions: Session[], activity: string): dateActivity[] {
    const activity_sessions = sessions.filter(s => s.activity_name === activity);

    if (activity_sessions.length === 0) return [];

    const acc: Record<string, number> = {};
    for (const session of activity_sessions) {
        const day = new Date(session.timestamp * 1000).toLocaleDateString('en-CA');
        acc[day] = (acc[day] ?? 0) + session.duration;
    }

    const firstDay = Object.keys(acc).sort()[0];
    const today = new Date().toLocaleDateString('en-CA');

    const result: dateActivity[] = [];
    let total = 0;
    const cursor = new Date(`${firstDay}T00:00:00`);
    const end = new Date(`${today}T00:00:00`);

    while (cursor <= end) {
        const dateStr = cursor.toLocaleDateString('en-CA');
        total += acc[dateStr] ?? 0;
        result.push({ date: dateStr, totalSeconds: total });
        cursor.setDate(cursor.getDate() + 1);
    }

    return result;
}

export function totalsByDateMap(sessions: Session[]): Record<string, number> {
    const acc: Record<string, number> = {};
    for (const session of sessions) {
        const day = new Date(session.timestamp * 1000).toLocaleDateString('en-CA');
        acc[day] = (acc[day] ?? 0) + session.duration;
    }
    return acc;
}

export function totalsByDayMulti(
    sessions: Session[],
    activities: string[],
): Array<Record<string, string | number>> {
    if (activities.length === 0 || sessions.length === 0) return [];

    const relevantSessions = sessions.filter(s => activities.includes(s.activity_name));
    if (relevantSessions.length === 0) return [];

    const accByActivity: Record<string, Record<string, number>> = {};
    for (const a of activities) accByActivity[a] = {};

    for (const session of relevantSessions) {
        const day = new Date(session.timestamp * 1000).toLocaleDateString('en-CA');
        accByActivity[session.activity_name][day] =
            (accByActivity[session.activity_name][day] ?? 0) + session.duration;
    }

    const allDays = Object.values(accByActivity).flatMap(acc => Object.keys(acc));
    const firstDay = [...allDays].sort()[0];
    const today = new Date().toLocaleDateString('en-CA');

    const result: Array<Record<string, string | number>> = [];
    const totals: Record<string, number> = {};
    for (const a of activities) totals[a] = 0;

    const cursor = new Date(`${firstDay}T00:00:00`);
    const end = new Date(`${today}T00:00:00`);

    while (cursor <= end) {
        const dateStr = cursor.toLocaleDateString('en-CA');
        const row: Record<string, string | number> = { date: dateStr };
        for (const a of activities) {
            totals[a] += accByActivity[a][dateStr] ?? 0;
            row[a] = totals[a];
        }
        result.push(row);
        cursor.setDate(cursor.getDate() + 1);
    }

    return result;
}

export function getTotalToday(sessions: Session[]): number {
    const today = sessions.filter(s => new Date(s.timestamp*1000).toLocaleDateString('en-CA') === new Date().toLocaleDateString('en-CA'));
    return today.reduce((acc, session) => { 
        return acc + session.duration;
    }, 0);
}