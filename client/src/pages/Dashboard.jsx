import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { DollarSign, TrendingUp, Clock, AlertCircle, Zap, Plus } from 'lucide-react';
import { statsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, getDeadlineStatus, getStatus, getPlatform } from '../utils/helpers';
import NewDealModal from '../components/NewDealModal';
import { brandsApi } from '../api';

const PIE_COLORS = ['#7c3aed', '#a855f7', '#ec4899', '#60a5fa', '#10b981', '#f59e0b', '#f97316'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
        <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
        <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{formatCurrency(payload[0].value)}</div>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [brands, setBrands] = useState([]);

  const load = async () => {
    try {
      const [s, b] = await Promise.all([statsApi.getOverview(token), brandsApi.getAll(token)]);
      setStats(s);
      setBrands(b);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  const monthlyData = (stats?.monthlyRevenue || []).map(r => ({
    month: r.month ? new Date(r.month + '-01').toLocaleDateString('en-US', { month: 'short' }) : r.month,
    value: r.value,
  }));

  const platformData = (stats?.byPlatform || []).map(p => ({
    name: getPlatform(p.platform).label,
    value: p.count,
  }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard 📊</h1>
          <p className="page-subtitle">Your creator business at a glance</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNewDeal(true)}>
          <Plus size={16} /> New Deal
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid-4 mb-8">
        <StatCard
          icon={<DollarSign size={20} />}
          label="Total Earned"
          value={formatCurrency(stats?.totalEarned)}
          sub="All time"
          accent
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Pipeline Value"
          value={formatCurrency(stats?.pipelineValue)}
          sub="Active deals"
        />
        <StatCard
          icon={<Clock size={20} />}
          label="Outstanding"
          value={formatCurrency(stats?.outstanding)}
          sub="Awaiting payment"
        />
        <StatCard
          icon={<Zap size={20} />}
          label="Total Deals"
          value={stats?.totalDeals ?? 0}
          sub="All time"
        />
      </div>

      {/* Charts row */}
      <div className="grid-2 mb-8">
        {/* Monthly Revenue */}
        <div className="chart-card">
          <div className="chart-title">💰 Monthly Revenue</div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: '#535869', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#535869', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="value" stroke="#a855f7" strokeWidth={2} fill="url(#revenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No paid deals yet
            </div>
          )}
        </div>

        {/* Platform Breakdown */}
        <div className="chart-card">
          <div className="chart-title">📱 Deals by Platform</div>
          {platformData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={platformData} cx="45%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {platformData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v} deals`]} contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No deals yet
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid-2">
        {/* Upcoming Deadlines */}
        <div className="card">
          <div className="section-title">⏰ Upcoming Deadlines</div>
          {(stats?.upcoming || []).length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>No upcoming deadlines</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stats.upcoming.map(d => {
                const dl = getDeadlineStatus(d.deadline);
                return (
                  <div
                    key={d.id}
                    onClick={() => navigate('/pipeline')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--color-surface-2)', borderRadius: 8, border: '1px solid var(--color-border)', cursor: 'pointer', transition: 'var(--transition)' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{d.brand_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.platform} · {formatCurrency(d.deal_value)}</div>
                    </div>
                    <span className={`deadline-badge ${dl?.type}`}>{dl?.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Overdue + Pipeline Summary */}
        <div className="card">
          <div className="section-title">📋 Pipeline Summary</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(stats?.byStatus || []).map(s => {
              const st = getStatus(s.status);
              return (
                <div key={s.status} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: 14 }}>{st.emoji}</span>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)' }}>{st.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: st.color }}>{s.count} deal{s.count !== 1 ? 's' : ''}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 70, textAlign: 'right' }}>{formatCurrency(s.value)}</span>
                </div>
              );
            })}
          </div>

          {(stats?.overdue || []).length > 0 && (
            <div style={{ marginTop: 16, padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', marginBottom: 4 }}>
                <AlertCircle size={13} style={{ display: 'inline', marginRight: 4 }} />
                {stats.overdue.length} overdue deal{stats.overdue.length !== 1 ? 's' : ''}
              </div>
              {stats.overdue.map(d => (
                <div key={d.id} style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.brand_name} — {getDeadlineStatus(d.deadline)?.label}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showNewDeal && (
        <NewDealModal
          brands={brands}
          onClose={() => setShowNewDeal(false)}
          onCreated={() => { setShowNewDeal(false); load(); }}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${accent ? 'accent' : ''}`}>{value}</div>
      <div className="stat-change">{sub}</div>
    </div>
  );
}
