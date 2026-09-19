/** Tasks & follow-ups — filterable list with create/edit, status moves, overdue flags. */
import React, { useMemo, useState } from 'react';
import { Plus, Search, Trash2, X, Calendar, Flag, CheckCircle2, Circle, Loader, Ban } from 'lucide-react';
import { useTasks, useCreateTask, useUpdateTask, useSetTaskStatus, useDeleteTask } from '../features/tasks/hooks';
import { useDeals } from '../features/deals/hooks';
import { useToast } from '../context/ToastContext';
import { PageFallback } from '../components/States';
import { formatDate, getDeadlineStatus } from '../utils/helpers';

export const STATUS_META = {
  todo: { label: 'Todo', icon: Circle, color: '#94a3b8' },
  in_progress: { label: 'In Progress', icon: Loader, color: '#60a5fa' },
  completed: { label: 'Completed', icon: CheckCircle2, color: '#22c55e' },
  cancelled: { label: 'Cancelled', icon: Ban, color: '#6b7280' },
};

export const PRIORITY_COLORS = { high: '#f43f5e', medium: '#f59e0b', low: '#6b7280' };

function TaskModal({ task, deals, onClose, onSaved }) {
  const { addToast } = useToast();
  const create = useCreateTask();
  const update = useUpdateTask();
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    due_date: task?.due_date || '',
    priority: task?.priority || 'medium',
    status: task?.status || 'todo',
    deal_id: task?.deal_id ? String(task.deal_id) : '',
    reminder_days_before: task?.reminder_days_before ?? 1,
  });
  const [errors, setErrors] = useState({});
  const saving = create.isPending || update.isPending;
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (form.due_date && Number.isNaN(Date.parse(form.due_date))) errs.due_date = 'Invalid date';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const body = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      due_date: form.due_date || null,
      priority: form.priority,
      status: form.status,
      deal_id: form.deal_id ? Number(form.deal_id) : null,
      reminder_days_before: Number(form.reminder_days_before) || 0,
    };
    try {
      if (task) await update.mutateAsync({ id: task.id, ...body });
      else await create.mutateAsync(body);
      addToast(task ? 'Task updated!' : 'Task created!');
      onSaved();
    } catch (err) {
      addToast(err.message, 'error');
      if (err.fields) setErrors(err.fields);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={task ? 'Edit task' : 'New task'}>
        <div className="modal-header">
          <div className="modal-title">{task ? 'Edit Task' : 'New Task'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <form onSubmit={submit} noValidate>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label" htmlFor="task-title">Title *</label>
              <input id="task-title" className="form-input" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Send follow-up to GlowLab" required />
              {errors.title && <div className="form-error">{errors.title}</div>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="task-desc">Description</label>
              <textarea id="task-desc" className="form-textarea" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Details, links, context..." />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="task-due">Due date</label>
                <input id="task-due" className="form-input" type="date" value={form.due_date} onChange={(e) => set('due_date', e.target.value)} />
                {errors.due_date && <div className="form-error">{errors.due_date}</div>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="task-priority">Priority</label>
                <select id="task-priority" className="form-select" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="task-status">Status</label>
                <select id="task-status" className="form-select" value={form.status} onChange={(e) => set('status', e.target.value)}>
                  <option value="todo">Todo</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="task-deal">Linked deal</label>
                <select id="task-deal" className="form-select" value={form.deal_id} onChange={(e) => set('deal_id', e.target.value)}>
                  <option value="">- None -</option>
                  {(deals || []).map((d) => <option key={d.id} value={d.id}>{d.brand_name} - {d.title}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="task-remind">Remind me (days before due)</label>
              <select id="task-remind" className="form-select" value={form.reminder_days_before} onChange={(e) => set('reminder_days_before', e.target.value)}>
                <option value={0}>No reminder</option>
                <option value={1}>1 day before</option>
                <option value={3}>3 days before</option>
                <option value={7}>7 days before</option>
                <option value={14}>14 days before</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : task ? 'Save changes' : 'Create task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Tasks() {
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const { data: tasks, isLoading, isError, error, refetch } = useTasks();
  const { data: deals } = useDeals();
  const setStatus = useSetTaskStatus();
  const remove = useDeleteTask();
  const list = useMemo(() => {
    let rows = Array.isArray(tasks) ? [...tasks] : [];
    if (statusFilter !== 'all') rows = rows.filter((t) => t.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((t) => (t.title || '').toLowerCase().includes(q)
        || (t.description || '').toLowerCase().includes(q));
    }
    return rows.sort((a, b) => {
      if (!!a.due_date !== !!b.due_date) return a.due_date ? -1 : 1;
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      return (b.id || 0) - (a.id || 0);
    });
  }, [tasks, statusFilter, search]);
  const counts = useMemo(() => {
    const rows = Array.isArray(tasks) ? tasks : [];
    return {
      all: rows.length,
      todo: rows.filter((t) => t.status === 'todo').length,
      in_progress: rows.filter((t) => t.status === 'in_progress').length,
      completed: rows.filter((t) => t.status === 'completed').length,
    };
  }, [tasks]);
  if (isLoading) return <PageFallback />;
  if (isError) {
    return (
      <div className="empty-state" role="alert">
        <div style={{ fontSize: 40 }}>⚠️</div>
        <h3>Could not load tasks</h3>
        <p>{error?.message || 'Something went wrong.'}</p>
        <button className="btn btn-secondary" onClick={() => refetch()}>Retry</button>
      </div>
    );
  }
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks &amp; Follow-ups</h1>
          <p className="page-subtitle">{counts.todo + counts.in_progress} open · {counts.completed} done</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModal({})}>
          <Plus size={15} /> New Task
        </button>
      </div>
      <div className="toolbar">
        <div className="search-wrap">
          <Search size={15} />
          <input className="form-input" placeholder="Search tasks..." value={search}
            onChange={(e) => setSearch(e.target.value)} aria-label="Search tasks" />
        </div>
        <div className="filter-pills" role="tablist" aria-label="Filter by status">
          {['all', 'todo', 'in_progress', 'completed'].map((s) => (
            <button key={s} type="button" role="tab" aria-selected={statusFilter === s}
              className={`pill ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
              {s === 'all' ? `All (${counts.all})` : `${STATUS_META[s].label} (${counts[s] ?? 0})`}
            </button>
          ))}
        </div>
      </div>
      {list.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 44 }}>🎯</div>
          <h3>{search || statusFilter !== 'all' ? 'No tasks match filters' : 'No tasks yet'}</h3>
          <p>Create your first follow-up so no deal slips through.</p>
          {!(search || statusFilter !== 'all') && (
            <button className="btn btn-primary btn-sm" onClick={() => setModal({})}><Plus size={15} /> Create task</button>
          )}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table" aria-label="Tasks">
            <thead>
              <tr><th>Task</th><th>Deal</th><th>Due</th><th>Priority</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
            </thead>
            <tbody>
              {list.map((t) => {
                const dl = getDeadlineStatus(t.due_date);
                return (
                  <tr key={t.id} className={t.status === 'completed' ? 'row-dimmed' : ''}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{t.title}</div>
                      {t.description && <div className="text-muted text-xs truncate" style={{ maxWidth: 320 }}>{t.description}</div>}
                    </td>
                    <td className="text-sm">{t.deal_title ? `${t.brand_name || ''} - ${t.deal_title}`.trim() : '—'}</td>
                    <td>
                      {t.due_date ? (
                        <span className={`due-pill ${dl?.type || ''}`}><Calendar size={12} /> {formatDate(t.due_date)}{dl && dl.type !== 'ok' ? ` · ${dl.label}` : ''}</span>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td><span className="priority-flag" style={{ color: PRIORITY_COLORS[t.priority] || '#888' }}><Flag size={12} /> {t.priority}</span></td>
                    <td>
                      <select className="form-select form-select-sm" value={t.status} aria-label={`Status for ${t.title}`} disabled={setStatus.isPending}
                        onChange={async (e) => {
                          try { await setStatus.mutateAsync({ id: t.id, status: e.target.value }); }
                          catch (err) { addToast(err.message, 'error'); }
                        }}>
                        {Object.entries(STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
                      </select>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setModal({ task: t })}>Edit</button>
                      <button className="btn btn-ghost btn-sm btn-danger-ghost" onClick={() => setConfirmDelete(t)} aria-label={`Delete ${t.title}`}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <TaskModal task={modal.task} deals={deals} onClose={() => setModal(null)} onSaved={() => setModal(null)} />
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-label="Delete task">
            <div className="modal-header"><div className="modal-title">Delete task?</div></div>
            <div className="modal-body">
              <p className="text-sm">This will permanently remove this task. This cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" disabled={remove.isPending} onClick={async () => {
                try { await remove.mutateAsync(confirmDelete.id); addToast('Task deleted'); }
                catch (err) { addToast(err.message, 'error'); }
                finally { setConfirmDelete(null); }
              }}>
                {remove.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
