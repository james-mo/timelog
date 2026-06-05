import { useEffect, useRef, useState } from 'react'
import { addSession, deleteSession, type Session, db, getAllActivityNames, updateSession, fetchAllSessions } from './db'
import { parseDuration, formatDuration, formatDurationLong, unixTimestamp, formatDurationShort, unixTimestampToDate, formatStopwatch } from './format';
import { totalsByActivity, totalsByDay, getTotalToday } from './stats';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

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
              list="activity-options"
              required
            />
            <datalist id="activity-options">
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
              list="activity-options"
              required
            />
            <datalist id="activity-options">
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

function Timer({ onStop }: { onStop: (duration: number, startTime: number) => void }) {

  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [now, setNow] = useState(0);

  const elapsed = isActive ? now - startTime : 0;

  useEffect(() => {
    if (!isActive) return;

    const id = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000))
    }, 200);
    return () => {
      clearInterval(id);
    };
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
    onStop(now - startTime, startTime);
    localStorage.removeItem('strata_timer_start');
  }

  return (
    <>
      <div id='timer'>
        <button id='start-timer' onClick={isActive ? stop : start}>{isActive ? "Stop timer" : "Start timer"}</button>
        <span id='elapsed' className='data'>{formatStopwatch(elapsed)}</span>
        
      </div>
    </>
  )
}

function GetSessions({activities = []}: { activities?: string[]} ) {
  
  const sessions = useLiveQuery(() => db.sessions.orderBy('timestamp').reverse().toArray());

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
          <td className='actions'><EditSession session={session} activities={activities}></EditSession><button className='action-button' onClick={() => {
              if (confirm(`Are you sure you want to delete ${session.activity_name}?`)) {
                deleteSession(session.id)
              }
            }}>Delete</button>
          </td>
        </tr>
      ))}
    </>
  )
}

export function ActivityChart({onSelectActivity}: {
  onSelectActivity: (activity: string) => void
}) {
  const sessions = useLiveQuery(() => db.sessions.toArray()) ?? [];
  const data = totalsByActivity(sessions);

  return (
    <ResponsiveContainer height={300}>
      <BarChart data={data}>
        <XAxis dataKey="activity" />
        <YAxis tickFormatter={(seconds) => formatDurationShort(seconds)} />
        <Tooltip formatter={(seconds) => formatDurationShort(Number(seconds))} />
        <Bar dataKey="totalSeconds"
        name="Total time"
        className='bar'
        fill="var(--accent)"
        onClick={(data) => onSelectActivity(data.payload.activity)} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ActivityLineChart({ activity }: {activity: string}) {
  const sessions = useLiveQuery(() => db.sessions.toArray()) ?? [];
  const data = totalsByDay(sessions, activity);
  console.log(sessions);
  console.log(data);

  return (
    <ResponsiveContainer height={300}>
      <LineChart data={data} margin={{top: 10, right: 20, bottom: 20, left: 10}}>
        <XAxis dataKey="date" textAnchor='middle'/>
        <YAxis tickFormatter={(seconds) => formatDurationShort(Number(seconds))} />
        <Tooltip formatter={(seconds) => formatDurationShort(Number(seconds))} />
        <Line dataKey="totalSeconds" isAnimationActive={false} type="linear" name="Total time" stroke="var(--accent)"></Line>
      </LineChart>
    </ResponsiveContainer>
  )
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

function Sidebar() {
 
  return (
    <>
      <div id="menu">
        <Export />
      </div>
    </>
  )
}

function App() {
  const [pending, setPending] = useState<{ duration: number; timestamp: number } | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activities = useLiveQuery(getAllActivityNames) ?? [];

  function handleTimerStop(duration: number, startTime: number) {
    setPending({ duration, timestamp: startTime })
  }

  function handleSidebar() {
    setSidebarOpen(open => !open)
  }

  return (
    <>
      <header className='app-header'>
        <h1 id='app-name'>Strata</h1>
        <TotalToday />
        <nav id="sidebar" onClick={handleSidebar}>
          {sidebarOpen ? '×' : '☰'}
        </nav>
        
      </header>
      {sidebarOpen && <Sidebar></Sidebar>}
      <div id='content'>
        <Timer onStop={handleTimerStop}/>
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
          <ActivityChart onSelectActivity={setSelectedActivity} />
          {selectedActivity && <ActivityLineChart activity={selectedActivity} />}
        </div>
      </div>
    </>
  );
}

export default App
