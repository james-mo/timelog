import { useEffect, useId, useRef, useState } from 'react'
import { getErrorLog, clearErrorLog } from './errors'
import { addSession, deleteSession, type Session, db, getAllActivityNames, updateSession, fetchAllSessions, addActivity, fetchAllActivities, deleteActivityByName } from './db'
import { parseDuration, formatDuration, formatDurationLong, unixTimestamp, formatDurationShort, unixTimestampToDate, formatStopwatch } from './format';
import { totalsByActivity, totalsByDay, totalsByDayMulti, getTotalToday, totalsByDateMap } from './stats';
import { getTagMap, saveTagMap, getAllTags, activitiesForTag, type TagMap } from './tags';

type Filter = { type: 'activity' | 'tag'; value: string } | null;

import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, Legend } from 'recharts';

import './App.css'
import { useLiveQuery } from 'dexie-react-hooks';

navigator.storage.persist().then(granted =>
  console.log(granted ? 'Storage will be persistent' : 'Storage may be cleared')
);

const emptyForm = {
  activity_name: '',
  duration: '',
  timestamp: '',
  rating: 3,
};

export function AddSessionDialog({ activities = [], prefill = null, onClose = undefined }: { 
  activities?: string[], 
  prefill?: {
    duration: number;
    timestamp: number;
  } | null,
  onClose?: () => void,
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState(emptyForm);
  const listId = useId();

  useEffect(() => {
    if (!prefill) return;
    setForm(
      {
        activity_name: '',
        duration: formatDuration(prefill.duration),
        timestamp: unixTimestampToDate(prefill.timestamp),
        rating: 3
      }
    )
    dialogRef.current?.showModal();
  }, [prefill])

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    const handler = () => onClose?.();
    d.addEventListener('close', handler);
    return () => d.removeEventListener('close', handler);
  }, [onClose]);

  function open() {
    setForm(emptyForm);
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
    onClose?.();
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const newSession: Omit<Session, 'id'> = {
      activity_name: form.activity_name.trim(),
      timestamp: unixTimestamp(form.timestamp),
      duration: parseDuration(form.duration),
      rating: form.rating,
    };
    await addSession(newSession);
    closeDialog();
  }

  return (
    <>
      <button onClick={open} className='add-session'>+ Add manual session</button>
      <dialog ref={dialogRef}>
        <form onSubmit={handleSubmit} method="dialog">
          <h2>Add session</h2>

          <label>
            Activity
            <input
              value={form.activity_name}
              onChange={e => setForm({ ...form, activity_name: e.target.value })}
              list={listId}
              required
            />
            <datalist id={listId}>
              {activities.map(a => <option key={a} value={a} />)}
            </datalist>
          </label>

          <label>
            Timestamp
            <input
              value={form.timestamp}
              onChange={e => setForm({...form, timestamp: e.target.value})}
              type="datetime-local"
            />
          </label>

          <label>
            Duration (hh:mm:ss)
            <input
              value={form.duration}
              onChange={e => setForm({ ...form, duration: e.target.value })}
              pattern="\d{1,2}:\d{2}:\d{2}"
              required
            />
          </label>

          <label>
            Rating
            <input
              type="number"
              min={1}
              max={5}
              value={form.rating}
              onChange={e => setForm({ ...form, rating: Number(e.target.value) })}
            />
          </label>

          <div>
            <button type="button" onClick={closeDialog}>Cancel</button>
            <button type="submit">Add</button>
          </div>
        </form>
      </dialog>
    </>
  )
}

function Export() {

  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    const sessions = await fetchAllSessions();
    const json = JSON.stringify(sessions, null, 2);
    const blob = new Blob([json], { type: 'application/json'});
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `strata-export-${unixTimestampToDate(Date.now()/1000).slice(0,10)}.json`;
    a.click();

    URL.revokeObjectURL(url);
    setIsExporting(false);
  }

  return (
    <>
      <div id='export-section'>
        <div id='export'><button onClick={handleExport}>{ isExporting ? "Exporting..." : "Export data"}</button></div>
      
      </div>
    </>
  )
}

function EditSession({session, activities = []}: { session: Session, activities?: string[] }) {

  const dialogRef = useRef<HTMLDialogElement>(null);
  const listId = useId();

  const editForm = {
    id: session.id,
    activity_name: session.activity_name,
    duration: formatDuration(session.duration),
    timestamp: session.timestamp,
    rating: session.rating
  }

  const [form, setForm] = useState(editForm);

  function open() {
    setForm(editForm);
    dialogRef.current?.showModal();
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const updatedSession: Session = {
      id: session.id,
      activity_name: form.activity_name.trim(),
      timestamp: form.timestamp,
      duration: parseDuration(form.duration),
      rating: form.rating,
    };
    await updateSession(updatedSession);
    dialogRef.current?.close();
  }

  return (
    <>
    <button onClick={open}>Edit</button>
      <dialog ref={dialogRef}>
        <form onSubmit={handleSubmit} method="dialog">
          <h2>Edit session</h2>

          <label>
            Activity
            <input
              value={form.activity_name}
              onChange={e => setForm({ ...form, activity_name: e.target.value })}
              list={listId}
              required
            />
            <datalist id={listId}>
              {activities.map(a => <option key={a} value={a} />)}
            </datalist>
          </label>

          <label>
            Timestamp
            <input
              value={unixTimestampToDate(form.timestamp)}
              onChange={e => setForm({...form, timestamp: unixTimestamp(e.target.value)})}
              type="datetime-local"
            />
          </label>

          <label>
            Duration (hh:mm:ss)
            <input
              value={form.duration}
              onChange={e => setForm({ ...form, duration: e.target.value })}
              pattern="\d{1,2}:\d{2}:\d{2}"
              required
            />
          </label>

          <label>
            Rating
            <input
              type="number"
              min={1}
              max={5}
              value={form.rating ?? 3}
              onChange={e => setForm({ ...form, rating: Number(e.target.value) })}
            />
          </label>

          <div>
            <button type="button" onClick={() => dialogRef.current?.close()}>Cancel</button>
            <button type="submit">Save</button>
          </div>
        </form>
      </dialog>
    </>
  )
}

function useTimer() {
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [now, setNow] = useState(0);

  const elapsed = isActive ? now - startTime : 0;

  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 200);
    return () => clearInterval(id);
  }, [isActive]);

  useEffect(() => {
    const saved = localStorage.getItem('strata_timer_start');
    if (saved) {
      setStartTime(Number(saved));
      setNow(Math.floor(Date.now() / 1000));
      setIsActive(true);
    }
  }, []);

  function start() {
    const t = Math.floor(Date.now() / 1000);
    setStartTime(t);
    setNow(t);
    setIsActive(true);
    localStorage.setItem('strata_timer_start', String(t));
  }

  function stop() {
    setIsActive(false);
    localStorage.removeItem('strata_timer_start');
  }

  return { elapsed, isActive, startTime, start, stop };
}

function TimerUI({ elapsed, isActive, onToggle }: {
  elapsed: number;
  isActive: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <button onClick={onToggle}>{isActive ? 'Stop timer' : 'Start timer'}</button>
      <span className='data'>{formatStopwatch(elapsed)}</span>
    </>
  );
}

function GetSessions({activities = []}: { activities?: string[]} ) {

  const sessions = useLiveQuery(() => db.sessions.orderBy('timestamp').reverse().toArray());
  const [pendingDeleteId, setPendingDeleteId] = useState<string | undefined>(undefined);

  if (!sessions) return null;

  return (
    <>
      {sessions.map((session) => (
        <tr key={session.id}>
          <td className='name'>{session.activity_name}</td>
          <td className='data'>{new Date(session.timestamp * 1000).toLocaleString(undefined, {
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: 'numeric', minute: '2-digit',
          })}</td>
          <td className='data'>{formatDurationShort(session.duration)}</td>
          <td>{session.rating}</td>
          <td className='actions'>
            <EditSession session={session} activities={activities} />
            {pendingDeleteId === session.id ? (
              <>
                <button className='action-button' onClick={() => { deleteSession(session.id); setPendingDeleteId(undefined); }}>Confirm</button>
                <button className='action-button' onClick={() => setPendingDeleteId(undefined)}>Cancel</button>
              </>
            ) : (
              <button className='action-button' onClick={() => setPendingDeleteId(session.id)}>Delete</button>
            )}
          </td>
        </tr>
      ))}
    </>
  )
}

function measureTextWidth(texts: string[], font: string): number {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return texts.reduce((max, t) => Math.max(max, t.length * 9), 60);
  ctx.font = font;
  return texts.reduce((max, t) => Math.max(max, Math.ceil(ctx.measureText(t).width)), 60);
}

export function ActivityChart({ filteredActivities, onSelectActivity }: {
  filteredActivities: string[] | null,
  onSelectActivity: (activity: string) => void,
}) {
  const sessions = useLiveQuery(() => db.sessions.toArray()) ?? [];
  const explicitActivities = useLiveQuery(fetchAllActivities) ?? [];

  const statsData = totalsByActivity(sessions);
  const statsMap = new Map(statsData.map(d => [d.activity, d.totalSeconds]));
  const allNames = [...new Set([...statsData.map(d => d.activity), ...explicitActivities.map(a => a.name)])];
  const data = allNames
    .map(activity => ({ activity, totalSeconds: statsMap.get(activity) ?? 0 }))
    .sort((a, b) => b.totalSeconds - a.totalSeconds);

  const yAxisWidth = measureTextWidth(data.map(d => d.activity), '18px "IBM Plex Sans", system-ui, sans-serif') + 12;

  return (
    <ResponsiveContainer height={Math.max(200, data.length * 40)}>
      <BarChart data={data} layout="vertical">
        <XAxis type="number" tickFormatter={(seconds) => formatDurationShort(seconds)} />
        <YAxis type="category" dataKey="activity" width={yAxisWidth} />
        <Tooltip formatter={(seconds) => formatDurationShort(Number(seconds))} />
        <Bar dataKey="totalSeconds" name="Total time" className='bar' fill="var(--accent)"
          onClick={(d) => onSelectActivity(d.payload.activity)}>
          {data.map((entry) => (
            <Cell
              key={entry.activity}
              fillOpacity={filteredActivities && !filteredActivities.includes(entry.activity) ? 0.3 : 1}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

const LINE_COLORS = [
  '#e07842', '#4a8dcc', '#6aac40', '#b94888', '#7b58c8',
  '#c8952a', '#3aaa8a', '#c04848', '#7aaa45', '#9048c8',
];

export function ActivityLineChart({ activities }: { activities: string[] }) {
  const sessions = useLiveQuery(() => db.sessions.toArray()) ?? [];

  if (activities.length === 0) return null;

  // Single activity: area chart
  if (activities.length === 1) {
    const data = totalsByDay(sessions, activities[0]);
    if (data.length === 0) return null;
    return (
      <ResponsiveContainer height={300}>
        <AreaChart data={data} margin={{top: 10, right: 20, bottom: 20, left: 10}}>
          <XAxis dataKey="date" textAnchor='middle'/>
          <YAxis tickFormatter={(s) => formatDurationShort(Number(s))} />
          <Tooltip formatter={(s) => formatDurationShort(Number(s))} />
          <Area dataKey="totalSeconds" isAnimationActive={false} type="bump" name={activities[0]}
            stroke="var(--accent)" fill="var(--accent-bg)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // Multi-activity: only show those with at least one session
  const withSessions = activities.filter(a => sessions.some(s => s.activity_name === a));
  if (withSessions.length === 0) return null;

  if (withSessions.length === 1) {
    const data = totalsByDay(sessions, withSessions[0]);
    if (data.length === 0) return null;
    return (
      <ResponsiveContainer height={300}>
        <AreaChart data={data} margin={{top: 10, right: 20, bottom: 20, left: 10}}>
          <XAxis dataKey="date" textAnchor='middle'/>
          <YAxis tickFormatter={(s) => formatDurationShort(Number(s))} />
          <Tooltip formatter={(s) => formatDurationShort(Number(s))} />
          <Area dataKey="totalSeconds" isAnimationActive={false} type="bump" name={withSessions[0]}
            stroke="var(--accent)" fill="var(--accent-bg)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  const data = totalsByDayMulti(sessions, withSessions);
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer height={300}>
      <LineChart data={data} margin={{top: 10, right: 20, bottom: 20, left: 10}}>
        <XAxis dataKey="date" textAnchor='middle'/>
        <YAxis tickFormatter={(s) => formatDurationShort(Number(s))} />
        <Tooltip formatter={(s) => formatDurationShort(Number(s))} />
        <Legend />
        {withSessions.map((a, i) => (
          <Line key={a} dataKey={a} isAnimationActive={false} type="bump" name={a}
            stroke={LINE_COLORS[i % LINE_COLORS.length]} dot={false} strokeWidth={1.5} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function TotalToday() {

  const sessions = useLiveQuery(fetchAllSessions) ?? [];
  const totalToday = getTotalToday(sessions);

  return (
    <div id='total-today'>
      <span>Today · <span className='data'>{formatDurationLong(totalToday)}</span></span>
    </div>
  )
}

const DAY_LABELS = ['Sun', '', 'Tue', '', 'Thu', '', 'Sat'];

function YearHeatmap({ activityFilter }: { activityFilter?: string[] }) {
  const allSessions = useLiveQuery(() => db.sessions.toArray()) ?? [];
  const sessions = activityFilter
    ? allSessions.filter(s => activityFilter.includes(s.activity_name))
    : allSessions;
  const dateMap = totalsByDateMap(sessions);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toLocaleDateString('en-CA');

  const startDate = new Date(today);
  startDate.setDate(today.getDate() - today.getDay() - 51 * 7);

  const weeks = Array.from({ length: 52 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + w * 7 + d);
      return { date, dateStr: date.toLocaleDateString('en-CA') };
    })
  );

  const monthRow = weeks.map((week, wi) => {
    const m = week[0].date.getMonth();
    const prev = wi > 0 ? weeks[wi - 1][0].date.getMonth() : -1;
    return m !== prev ? week[0].date.toLocaleString('default', { month: 'short' }) : '';
  });

  const nonZeroDays = weeks.flat()
    .filter(({ date }) => date <= today)
    .map(({ dateStr }) => dateMap[dateStr] ?? 0)
    .filter(s => s > 0)
    .sort((a, b) => a - b);
  const q = (p: number) => nonZeroDays[Math.floor(nonZeroDays.length * p)] ?? 0;
  const [t1, t2, t3] = [q(0.25), q(0.5), q(0.75)];

  function level(seconds: number): number {
    if (seconds === 0) return 0;
    if (seconds <= t1) return 1;
    if (seconds <= t2) return 2;
    if (seconds <= t3) return 3;
    return 4;
  }

  return (
    <div className="heatmap-container">
      <div className="heatmap-inner">
        <div className="heatmap-months">
          {monthRow.map((label, i) => <span key={i}>{label}</span>)}
        </div>
        <div className="heatmap-body">
          <div className="heatmap-day-labels">
            {DAY_LABELS.map((label, i) => <span key={i}>{label}</span>)}
          </div>
          <div className="heatmap">
            {weeks.map((week, wi) => (
              <div key={wi} className="heatmap-week">
                {week.map(({ date, dateStr }) => {
                  const seconds = dateMap[dateStr] ?? 0;
                  const isFuture = date > today;
                  const label = isFuture
                    ? dateStr
                    : `${dateStr}${seconds ? ': ' + formatDurationLong(seconds) : ''}`;
                  return (
                    <div
                      key={dateStr}
                      className={`heatmap-day${dateStr === todayStr ? ' today' : ''}`}
                      data-level={isFuture ? 'future' : level(seconds)}
                      data-label={label}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AddActivityForm({ existingNames }: { existingNames: string[] }) {
  const [name, setName] = useState('');

  async function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed || existingNames.includes(trimmed)) return;
    await addActivity(trimmed);
    setName('');
  }

  return (
    <div className="add-activity-form">
      <input
        className="add-activity-input"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
        placeholder="New activity…"
      />
      <button type="button" onClick={handleAdd}>+</button>
    </div>
  );
}

function TagEditorDialog({ activities, tagMap, onSave }: {
  activities: string[];
  tagMap: TagMap;
  onSave: (newMap: TagMap) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  function open() {
    const d: Record<string, string> = {};
    for (const a of activities) d[a] = (tagMap[a] ?? []).join(', ');
    setDraft(d);
    dialogRef.current?.showModal();
  }

  function handleSave() {
    const newMap: TagMap = {};
    for (const [activity, raw] of Object.entries(draft)) {
      const tags = raw.split(',').map(t => t.trim()).filter(Boolean);
      if (tags.length > 0) newMap[activity] = tags;
    }
    onSave(newMap);
    dialogRef.current?.close();
  }

  return (
    <>
      <button type="button" onClick={open}>Tags</button>
      <dialog ref={dialogRef}>
        <h2>Activity tags</h2>
        <div className="tag-editor">
          {activities.map(a => (
            <div key={a} className="tag-editor-row">
              <span className="tag-editor-label">{a}</span>
              <input
                value={draft[a] ?? ''}
                onChange={e => setDraft(prev => ({ ...prev, [a]: e.target.value }))}
                placeholder="tag1, tag2, ..."
              />
            </div>
          ))}
        </div>
        <div className="tag-editor-actions">
          <button type="button" onClick={() => dialogRef.current?.close()}>Cancel</button>
          <button type="button" onClick={handleSave}>Save</button>
        </div>
      </dialog>
    </>
  );
}

function Sidebar({ onClose }: { onClose: () => void }) {
  const [errors, setErrors] = useState(getErrorLog);

  function handleClear() {
    clearErrorLog();
    setErrors([]);
  }

  return (
    <div id="menu">
      <button className="sidebar-close" onClick={onClose}>×</button>
      <Export />
      {errors.length > 0 && (
        <div className="error-indicator">
          <span>⚠ {errors.length} error{errors.length !== 1 ? 's' : ''}</span>
          <button className="clear-errors" onClick={handleClear}>Clear</button>
        </div>
      )}
    </div>
  );
}

function App() {
  const [pending, setPending] = useState<{ duration: number; timestamp: number } | null>(null);
  const [filter, setFilter] = useState<Filter>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ name: string; sessionCount: number } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tagMap, setTagMap] = useState<TagMap>(getTagMap);

  const activities = useLiveQuery(getAllActivityNames) ?? [];
  const allTags = getAllTags(tagMap).filter(tag =>
    activitiesForTag(tagMap, tag).some(a => activities.includes(a))
  );
  const untaggedActivities = activities.filter(a => !tagMap[a] || tagMap[a].length === 0);

  const filteredActivities: string[] | null = filter === null ? null
    : filter.type === 'activity' ? [filter.value]
    : filter.value === '__untagged__' ? untaggedActivities
    : activitiesForTag(tagMap, filter.value);

  function handleClearFilter() {
    setFilter(null);
    setActiveGroup(null);
  }

  function handleTagChipClick(tag: string) {
    if (activeGroup === tag) {
      setActiveGroup(null);
      setFilter(null);
    } else {
      setActiveGroup(tag);
      setFilter({ type: 'tag', value: tag });
    }
  }

  function handleActivityChipClick(activity: string) {
    if (filter?.type === 'activity' && filter.value === activity) {
      setFilter(activeGroup ? { type: 'tag', value: activeGroup } : null);
    } else {
      setFilter({ type: 'activity', value: activity });
    }
  }

  function handleBarClick(activity: string) {
    if (filter?.type === 'activity' && filter.value === activity) {
      setFilter(null);
      setActiveGroup(null);
    } else {
      setFilter({ type: 'activity', value: activity });
      setActiveGroup(tagMap[activity]?.[0] ?? '__untagged__');
    }
  }

  async function handleDeleteActivityClick(name: string) {
    const count = await db.sessions.where('activity_name').equals(name).count();
    if (count === 0) {
      await deleteActivityByName(name);
      if (tagMap[name]) {
        const newMap = { ...tagMap };
        delete newMap[name];
        saveTagMap(newMap);
        setTagMap(newMap);
      }
      if (filter?.type === 'activity' && filter.value === name) setFilter(null);
    } else {
      setPendingDelete({ name, sessionCount: count });
    }
  }

  async function confirmDeleteActivity() {
    if (!pendingDelete) return;
    const { name } = pendingDelete;
    await deleteActivityByName(name);
    if (tagMap[name]) {
      const newMap = { ...tagMap };
      delete newMap[name];
      saveTagMap(newMap);
      setTagMap(newMap);
    }
    if (filter?.type === 'activity' && filter.value === name) {
      setFilter(activeGroup && activeGroup !== '__untagged__' ? { type: 'tag', value: activeGroup } : null);
    }
    setPendingDelete(null);
  }

  function handleTagSave(newMap: TagMap) {
    saveTagMap(newMap);
    setTagMap(newMap);
    if (filter?.type === 'tag' && filter.value !== '__untagged__' && activitiesForTag(newMap, filter.value).length === 0) {
      setFilter(null);
      setActiveGroup(null);
    }
  }

  useEffect(() => {
    if (!activeGroup || activeGroup === '__untagged__') return;
    const stillHasActivities = activitiesForTag(tagMap, activeGroup).some(a => activities.includes(a));
    if (!stillHasActivities) {
      setActiveGroup(null);
      if (filter?.type === 'tag' && filter.value === activeGroup) setFilter(null);
    }
  }, [activities, tagMap]);

  const timer = useTimer();
  const timerRef = useRef<HTMLDivElement>(null);
  const [timerInView, setTimerInView] = useState(true);

  useEffect(() => {
    const el = timerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setTimerInView(entry.isIntersecting),
      { threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  function handleTimerToggle() {
    if (timer.isActive) {
      timer.stop();
      setPending({ duration: timer.elapsed, timestamp: timer.startTime });
    } else {
      timer.start();
    }
  }

  function handleSidebar() {
    setSidebarOpen(open => !open)
  }

  return (
    <>
      <header className='app-header'>
        <h1 id='app-name'>Strata</h1>
        <TotalToday />
        {!sidebarOpen && <nav id="sidebar" onClick={handleSidebar}>☰</nav>}
        
      </header>
      {sidebarOpen && <Sidebar onClose={handleSidebar} />}
      {!timerInView && (
        <div className='timer-float'>
          <TimerUI elapsed={timer.elapsed} isActive={timer.isActive} onToggle={handleTimerToggle} />
        </div>
      )}
      <div id='content' className={timerInView ? '' : 'timer-floating'}>
        <div id='timer' ref={timerRef}>
          <TimerUI elapsed={timer.elapsed} isActive={timer.isActive} onToggle={handleTimerToggle} />
        </div>
        <AddSessionDialog
          activities={activities}
          prefill={pending}
          onClose={() => setPending(null)}
        />
        <div id="log">
          <table className='table'>
            <thead>
              <tr>
                <th className="name">Name</th>
                <th>Timestamp</th>
                <th>Duration<span className="hint">h:mm</span></th>
                <th>Rating (1-5)<span className='tooltip' title="My subjective interpretation of how the session felt.">{"?"}</span></th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="sessions">
              <GetSessions activities={activities}/>
            </tbody>
          </table>
        </div>

        <div id='linechart'>
          <div className="filter-bar">
            <button className={`filter-chip${!filter ? ' active' : ''}`} onClick={handleClearFilter}>All</button>
            {allTags.map(tag => (
              <button key={tag}
                className={`filter-chip${activeGroup === tag ? ' active' : ''}`}
                onClick={() => handleTagChipClick(tag)}>#{tag}</button>
            ))}
            {untaggedActivities.length > 0 && (
              <button
                className={`filter-chip${activeGroup === '__untagged__' ? ' active' : ''}`}
                onClick={() => handleTagChipClick('__untagged__')}>Untagged</button>
            )}
            <TagEditorDialog activities={activities} tagMap={tagMap} onSave={handleTagSave} />
          </div>
          {activeGroup && (
            <div className="filter-activity-row">
              {(activeGroup === '__untagged__' ? untaggedActivities : activitiesForTag(tagMap, activeGroup).filter(a => activities.includes(a))).map(a => (
                <div key={a} className="activity-chip-group">
                  {pendingDelete?.name === a ? (
                    <span className="delete-confirm">
                      {pendingDelete.sessionCount === 1
                        ? `Delete "${a}" and its 1 entry?`
                        : `Delete "${a}" and its ${pendingDelete.sessionCount} entries?`}
                      <button onClick={confirmDeleteActivity}>Yes</button>
                      <button onClick={() => setPendingDelete(null)}>No</button>
                    </span>
                  ) : (
                    <>
                      <button
                        className={`filter-chip filter-activity-chip${filter?.type === 'activity' && filter.value === a ? ' active' : ''}`}
                        onClick={() => handleActivityChipClick(a)}>{a}</button>
                      <button className="activity-delete-btn" onClick={() => handleDeleteActivityClick(a)}>×</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          <AddActivityForm existingNames={activities} />
          <ActivityChart filteredActivities={filteredActivities} onSelectActivity={handleBarClick} />
          <ActivityLineChart activities={filteredActivities ?? activities} />
        </div>
        <YearHeatmap activityFilter={filteredActivities ?? undefined} />
      </div>
    </>
  );
}

export default App
