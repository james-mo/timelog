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
    return Object.entries(acc).map(([activity, totalSeconds]) => ({ activity, totalSeconds }));
}

export function totalsByDay(sessions: Session[], activity: string): dateActivity[] {
    const activity_sessions = sessions.filter(s => s.activity_name === activity);

    const acc: Record<string, number> = {};

    for (const session of activity_sessions) {
        const day = new Date(session.timestamp * 1000).toLocaleDateString('en-CA');
        acc[day] = (acc[day] ?? 0) + session.duration;
    }

    const sortedDays = Object.entries(acc).sort(([a], [b]) => a.localeCompare(b));
    console.log(sortedDays);
    let total = 0;

    return sortedDays.map(([date, daySeconds]) => {
        total += daySeconds;
        return { date, totalSeconds: total };
    });
}

export function getTotalToday(sessions: Session[]): number {
    const today = sessions.filter(s => new Date(s.timestamp*1000).toLocaleDateString('en-CA') === new Date().toLocaleDateString('en-CA'));
    return today.reduce((acc, session) => { 
        return acc + session.duration;
    }, 0);
}