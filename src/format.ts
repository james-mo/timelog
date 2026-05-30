function formatDuration(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

function formatDurationShort(totalSeconds: number): string {
    const h = Math.floor(totalSeconds/3600);
    const m = Math.floor((totalSeconds % 3600) / 60);

    const h_str = h.toString();
    const m_str = m.toString().padStart(2,'0');
    return [h_str, m_str].join(':')
}

function parseDuration(hms: string): number {
    const [h, m, s] = hms.split(':').map(Number);
    return h * 3600 + m * 60 + s;
}

function unixTimestamp(datestring: string): number {
    return Math.floor(new Date(datestring).getTime() / 1000);
}

export { parseDuration, formatDuration, formatDurationShort, unixTimestamp }

