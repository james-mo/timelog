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

function formatDurationLong(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    
    if (h > 0) {
        return (`${h}h ${m}m`);
    } else {
        return (`${m}m`);
    }
}

function formatStopwatch(seconds: number): string {
    const h = Math.floor(seconds/3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    const h_str = h.toString();
    const m_str = m.toString().padStart(2, '0');
    const s_str = s.toString().padStart(2, '0');

    if (h == 0) {
        return [m_str,s_str].join(':');
    } else {
        return [h_str,m_str,s_str].join(':')
    }

}

function parseDuration(hms: string): number {
    const [h, m, s] = hms.split(':').map(Number);
    return h * 3600 + m * 60 + s;
}

function unixTimestamp(datestring: string): number {
    return Math.floor(new Date(datestring).getTime() / 1000);
}

function unixTimestampToDate(timestamp: number): string {
    const dateObj = new Date(timestamp * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');

    return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}T${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;
}

export { parseDuration, formatDuration, formatDurationShort, formatDurationLong, unixTimestamp, unixTimestampToDate, formatStopwatch }

