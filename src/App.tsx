import { useRef, useState } from 'react'
import { addSession, deleteSession, type Session, fetchAllSessions, db, getAllActivityNames } from './db'
import { parseDuration, formatDuration, unixTimestamp, formatDurationShort } from './format';
import { totalsByActivity } from './stats';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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

export function AddSessionDialog({ activities = [] }: { activities?: string[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState(emptyForm);

  function open() {
    setForm(emptyForm);
    dialogRef.current?.showModal();
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
    dialogRef.current?.close();
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
            <button type="button" onClick={() => dialogRef.current?.close()}>Cancel</button>
            <button type="submit">Add</button>
          </div>
        </form>
      </dialog>
    </>
  )
}



function GetSessions() {
  
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
          <td className='actions'><button className='action-button'>Edit</button><button className='action-button' onClick={() => {
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

function App() {

  const activities = useLiveQuery(getAllActivityNames) ?? [];

  return (
    <>
      <h1 id='app-name'>Time log</h1>
      <AddSessionDialog activities={activities}></AddSessionDialog>
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
          <GetSessions />
        </tbody>
      </table>

      <ActivityChart />
      
    </>
  );
}

export default App
