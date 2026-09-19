import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  DollarSign, TrendingUp, Clock, AlertCircle, Users, Plus,
  ArrowUpRight, Calendar, ChevronRight, FolderKanban
} from 'lucide-react';
import { statsApi, brandsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, getDeadlineStatus, getStatus, getPlatform } from '../utils/helpers';
import NewDealModal from '../components/NewDealModal';

const PIE_COLORS = ['#4f46e5', '#0ea5e9', '#059669', '#d97706', '#dc2626', '#7c3aed', '#64748b'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{
        background: '#101828',
        border: '1px solid #232b3a',
        borderRadius: 8,
        padding: '10px 14px',
        boxShadow: '0 8px 24px rgba(16,24,40,0.25)'
      }}>
        <div style={{ color: '#98a2b3', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
        <div style={{ color: '#ffffff', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>
          {formatCurrency(payload[0].value)}
        </div>
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
        <div className="spinner" style={{ width: 36, height: 36 }} />
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

  const totalPipelineValue = (stats?.byStatus || []).reduce((sum, s) => sum + (s.value || 0), 0);

  return (
    <div>
      {/* Top Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span>Dashboard</span>
          </h1>
          <p className="page-subtitle">Revenue, pipeline value, and upcoming deliverables</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNewDeal(true)}>
          <Plus size={16} /> New Deal
        </button>
      </div>

      {/* Primary Stat Cards */}
      <div className="grid-4 mb-8">
        <div className="stat-card">
          <div className="stat-icon"><DollarSign size={19} /></div>
          <div className="stat-label">Total Earned</div>
          <div className="stat-value">{formatCurrency(stats?.totalEarned)}</div>
          <div className="stat-change" style={{ color: '#067647' }}>
            <ArrowUpRight size={14} />
            <span>Lifetime payouts</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><TrendingUp size={19} /></div>
          <div className="stat-label">Pipeline Value</div>
          <div className="stat-value">{formatCurrency(stats?.pipelineValue)}</div>
          <div className="stat-change">
            <span>Active negotiations</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><Clock size={19} /></div>
          <div className="stat-label">Outstanding Balance</div>
          <div className="stat-value">{formatCurrency(stats?.outstanding)}</div>
          <div className="stat-change">
            <span>Awaiting payment</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><Users size={19} /></div>
          <div className="stat-label">Total Partnerships</div>
          <div className="stat-value">{stats?.totalDeals ?? 0}</div>
          <div className="stat-change">
            <span>Deals across all stages</span>
          </div>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid-2 mb-8">
        {/* Monthly Revenue Velocity */}
        <div className="chart-card">
          <div className="chart-title">
            <TrendingUp size={16} />
            <span>Monthly revenue</span>
          </div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, bottom: 5, left: -15 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: '#667085', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#667085', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  fill="url(#revenueGrad)"
                  dot={{ r: 3, fill: '#4f46e5', strokeWidth: 2, stroke: '#ffffff' }}
                  activeDot={{ r: 5, fill: '#4f46e5', strokeWidth: 2, stroke: '#ffffff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 230, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No paid deals recorded yet
            </div>
          )}
        </div>

        {/* Deals by Platform */}
        <div className="chart-card">
          <div className="chart-title">
            <FolderKanban size={16} />
            <span>Deals by platform</span>
          </div>
          {platformData.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie 
                  data={platformData} 
                  cx="45%" 
                  cy="50%" 
                  innerRadius={60} 
                  outerRadius={90} 
                  paddingAngle={4} 
                  dataKey="value"
                >
                  {platformData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => [`${v} deals`]}
                  contentStyle={{
                    background: '#101828',
                    border: '1px solid #232b3a',
                    borderRadius: 8,
                    fontSize: 12,
                    color: '#fff'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 230, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No deals added yet
            </div>
          )}
        </div>
      </div>

      {/* Deadlines & Pipeline Summary */}
      <div className="grid-2">
        {/* Upcoming Deliverable Deadlines */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>
              <Calendar size={16} />
              <span>Upcoming deadlines</span>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/pipeline')}
              style={{ fontSize: 12.5 }}
            >
              View Pipeline <ChevronRight size={13} />
            </button>
          </div>

          {(stats?.upcoming || []).length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>
              No upcoming deadlines scheduled
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stats.upcoming.map(d => {
                const dl = getDeadlineStatus(d.deadline);
                return (
                  <div
                    key={d.id}
                    onClick={() => navigate('/pipeline')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '11px 13px',
                      background: 'var(--color-surface-2)',
                      borderRadius: 8,
                      border: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--color-border-hover)';
                      e.currentTarget.style.background = '#fff';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--color-border)';
                      e.currentTarget.style.background = 'var(--color-surface-2)';
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--text-primary)' }}>{d.brand_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {d.title} • {d.platform} • <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(d.deal_value)}</span>
                      </div>
                    </div>
                    <span className={`deadline-badge ${dl?.type}`}>{dl?.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pipeline Summary & Conversion Funnel */}
        <div className="card">
          <div className="section-title">
            <TrendingUp size={16} />
            <span>Pipeline by stage</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(stats?.byStatus || []).map(s => {
              const st = getStatus(s.status);
              const pct = totalPipelineValue > 0 ? ((s.value / totalPipelineValue) * 100).toFixed(0) : 0;
              return (
                <div key={s.status} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: st.color, display: 'inline-block' }} />
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{st.label}</span>
                      <span className="badge" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--text-secondary)', fontSize: 11, padding: '1px 7px' }}>
                        {s.count} deal{s.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(s.value)}
                    </div>
                  </div>
                  {/* Neutral progress bar with stage color */}
                  <div style={{ width: '100%', height: 6, background: 'var(--color-surface-3)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: st.color,
                      borderRadius: 99
                    }} />
                  </div>
                </div>
              );
            })}
          </div>

          {(stats?.overdue || []).length > 0 && (
            <div style={{
              marginTop: 18,
              padding: '12px 14px',
              background: '#fef3f2',
              border: '1px solid #fecdca',
              borderRadius: 8
            }}>
              <div style={{ fontSize: 13, fontWeight: 650, color: '#b42318', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={14} />
                <span>{stats.overdue.length} overdue deliverable{stats.overdue.length !== 1 ? 's' : ''} need attention</span>
              </div>
              {stats.overdue.map(d => (
                <div key={d.id} style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {d.brand_name} — {getDeadlineStatus(d.deadline)?.label}
                </div>
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
