import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  DollarSign, TrendingUp, Clock, AlertCircle, Zap, Plus, 
  ArrowUpRight, Sparkles, Calendar, ChevronRight
} from 'lucide-react';
import { statsApi, brandsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, getDeadlineStatus, getStatus, getPlatform } from '../utils/helpers';
import NewDealModal from '../components/NewDealModal';

const PIE_COLORS = ['#8b5cf6', '#06b6d4', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{
        background: 'rgba(20, 23, 38, 0.95)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(139, 92, 246, 0.35)',
        borderRadius: 10,
        padding: '10px 14px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
        <div style={{ color: '#ffffff', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16 }}>
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
            <span style={{ fontSize: 18, color: 'var(--accent-1)', fontWeight: 600, background: 'rgba(139, 92, 246, 0.12)', padding: '2px 10px', borderRadius: 20 }}>
              Live Overview
            </span>
          </h1>
          <p className="page-subtitle">Creator sponsorship performance, revenue velocity, and deal pipelines</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNewDeal(true)}>
          <Plus size={16} /> New Deal
        </button>
      </div>

      {/* Primary Stat Cards */}
      <div className="grid-4 mb-8">
        <div className="stat-card">
          <div className="stat-icon"><DollarSign size={22} /></div>
          <div className="stat-label">Total Earned</div>
          <div className="stat-value accent">{formatCurrency(stats?.totalEarned)}</div>
          <div className="stat-change" style={{ color: '#10b981' }}>
            <ArrowUpRight size={14} />
            <span>Lifetime creator payout</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><TrendingUp size={22} /></div>
          <div className="stat-label">Pipeline Value</div>
          <div className="stat-value">{formatCurrency(stats?.pipelineValue)}</div>
          <div className="stat-change" style={{ color: '#06b6d4' }}>
            <span>Active in-flight negotiations</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><Clock size={22} /></div>
          <div className="stat-label">Outstanding Balance</div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>{formatCurrency(stats?.outstanding)}</div>
          <div className="stat-change">
            <span>Invoiced awaiting wire</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><Zap size={22} /></div>
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
            <TrendingUp size={16} color="var(--accent-1)" />
            <span>Monthly Revenue Velocity</span>
          </div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, bottom: 5, left: -15 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.45} />
                    <stop offset="70%" stopColor="#ec4899" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#a855f7" 
                  strokeWidth={3} 
                  fill="url(#revenueGrad)" 
                  dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#ffffff' }}
                  activeDot={{ r: 6, fill: '#ec4899', strokeWidth: 3, stroke: '#ffffff' }}
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
            <Zap size={16} color="#06b6d4" />
            <span>Deals by Content Platform</span>
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
                    background: 'rgba(20, 23, 38, 0.95)', 
                    border: '1px solid rgba(139, 92, 246, 0.3)', 
                    borderRadius: 8, 
                    fontSize: 12 
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
              <Calendar size={16} color="var(--accent-amber)" />
              <span>Upcoming Deliverable Deadlines</span>
            </div>
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={() => navigate('/pipeline')}
              style={{ fontSize: 12, color: 'var(--accent-1)' }}
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
                      padding: '12px 14px',
                      background: 'var(--color-surface-2)',
                      borderRadius: 10,
                      border: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)';
                      e.currentTarget.style.transform = 'translateX(3px)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--color-border)';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{d.brand_name}</div>
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
            <Sparkles size={16} color="var(--accent-1)" />
            <span>Pipeline Conversion Funnel</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(stats?.byStatus || []).map(s => {
              const st = getStatus(s.status);
              const pct = totalPipelineValue > 0 ? ((s.value / totalPipelineValue) * 100).toFixed(0) : 0;
              return (
                <div key={s.status} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{st.emoji}</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{st.label}</span>
                      <span className="badge" style={{ background: 'var(--color-surface-3)', fontSize: 10.5, padding: '1px 6px' }}>
                        {s.count} deal{s.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: st.color }}>
                      {formatCurrency(s.value)}
                    </div>
                  </div>
                  {/* Subtle gradient progress bar */}
                  <div style={{ width: '100%', height: 5, background: 'var(--color-surface-3)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${st.color} 0%, rgba(139, 92, 246, 0.8) 100%)`,
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
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              borderRadius: 10
            }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#f43f5e', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={14} />
                <span>{stats.overdue.length} Action Required: Overdue Deliverable{stats.overdue.length !== 1 ? 's' : ''}</span>
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
