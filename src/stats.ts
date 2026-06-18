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

export function getTotalToday(sessions: Session[]): number {
    const today = sessions.filter(s => new Date(s.timestamp*1000).toLocaleDateString('en-CA') === new Date().toLocaleDateString('en-CA'));
    return today.reduce((acc, session) => { 
        return acc + session.duration;
    }, 0);
}