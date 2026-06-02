import { act, useEffect, useRef, useState } from 'react'
import { addSession, deleteSession, type Session, fetchAllSessions, db, getAllActivityNames, updateSession } from './db'
import { parseDuration, formatDuration, unixTimestamp, formatDurationShort, unixTimestampToDate, formatStopwatch } from './format';
import { totalsByActivity, totalsByDay } from './stats';

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
      <button onClick={open} className='add-session'>+ Add session</button>
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

function EditSession({session, activities = []}: { session: Session, activities?: string[] }) {

  const dialogRef = useRef<HTMLDialogElement>(null);

  const [form, setForm] = useState(session);

  function open() {
    setForm(session);
    dialogRef.current?.showModal();
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const updatedSession: Session = {
      id: session.id,
      activity_name: form.activity_name.trim(),
      timestamp: form.timestamp,
      duration: form.duration,
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
              value={formatDuration(form.duration)}
              onChange={e => setForm({ ...form, duration: parseDuration(e.target.value) })}
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

  function start() {
    const t = Math.floor(Date.now() / 1000);   
    setStartTime(t);
    setNow(t);
    setIsActive(true);
  }

  function stop() {
    setIsActive(false);
    onStop(now - startTime, startTime);
  }

  return (
    <>
      <div id='timer'>
        <button id='start-timer' onClick={isActive ? stop : start}>{isActive ? "Stop" : "Start"}</button>
        <span id='elapsed'>{formatStopwatch(elapsed)}</span>
        
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
          <td>{new Date(session.timestamp * 1000).toLocaleString(undefined, {
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: 'numeric', minute: '2-digit',
          })}</td>
          <td>{formatDurationShort(session.duration)}</td>
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

export function ActivityChart() {
  const sessions = useLiveQuery(() => db.sessions.toArray()) ?? [];
  const data = totalsByActivity(sessions);

  return (
    <ResponsiveContainer width="90%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="activity" />
        <YAxis tickFormatter={(seconds) => formatDurationShort(seconds)} />
        <Tooltip formatter={(seconds) => formatDurationShort(Number(seconds))} />
        <Bar dataKey="totalSeconds" name="Total time" fill="var(--accent)" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ActivityLineChart({ activity }: {activity: string}) {
  const sessions = useLiveQuery(() => db.sessions.toArray()) ?? [];
  const data = totalsByDay(sessions, activity);

  return (
    <ResponsiveContainer width="90%" height={300}>
      <LineChart data={data}>
        <XAxis dataKey="date" />
        <YAxis tickFormatter={(seconds) => formatDurationShort(Number(seconds))} />
        <Tooltip formatter={(seconds) => formatDurationShort(Number(seconds))} />
        <Line dataKey="totalSeconds" type="monotone" name="Total time" stroke="var(--accent)"></Line>
      </LineChart>
    </ResponsiveContainer>
  )
}

function App() {

  const [pending, setPending] = useState<{ duration: number; timestamp: number } | null>(null);

  const activities = useLiveQuery(getAllActivityNames) ?? [];

  function handleTimerStop(duration: number, startTime: number) {
    setPending({ duration, timestamp: startTime })
  }

  return (
    <>
      <h1 id='app-name'>Time log</h1>
      <Timer onStop={handleTimerStop}/>
      <AddSessionDialog
        activities={activities}
        prefill={pending}
        onClose={() => setPending(null)}
      />
      <table className='table' id='log'>
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

      <ActivityChart />
      <ActivityLineChart activity={activities[0]} />
    </>
  );
}

export default App
