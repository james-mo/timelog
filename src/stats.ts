import { type Session, getAllActivityNames } from "./db";

type totalActivity = {
    activity: string,
    totalSeconds: number
}

export function totalsByActivity(sessions: Session[]): totalActivity[] {
    const acc: Record<string, number> = {};

    for (const session of sessions) {
        acc[session.activity_name] = (acc[session.activity_name] ?? 0) + session.duration;
    }
    return Object.entries(acc).map(([activity, totalSeconds]) => ({ activity, totalSeconds }));
}