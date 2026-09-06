import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend
} from 'recharts';
import { BarChart3, TrendingUp, DollarSign, Calendar, Zap, PieChart } from 'lucide-react';
import { statsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, getPlatform, getStatus } from '../utils/helpers';

const COLORS = ['#8b5cf6', '#06b6d4', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{
        background: 'rgba(20, 23, 38, 0.95)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(139, 92, 246, 0.35)',
        borderRadius: 10,
        padding: '10px 14px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
      }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color || '#ffffff', fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 15 }}>
            {typeof p.value === 'number' && p.value > 100 ? formatCurrency(p.value) : p.value}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    statsApi.getOverview(token).then(s => { setStats(s); setLoading(false); }).catch(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
      </div>
    );
  }

  const platformValueData = (stats?.byPlatform || []).map((p, i) => ({
    name: getPlatform(p.platform).label,
    value: p.value,
    count: p.count,
    fill: COLORS[i % COLORS.length],
  }));

  const statusData = (stats?.byStatus || []).map(s => ({
    name: getStatus(s.status).label,
    statusKey: s.status,
    count: s.count,
    value: s.value,
  }));

  const monthlyData = (stats?.monthlyRevenue || []).map(r => ({
    month: r.month ? new Date(r.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : r.month,
    earned: r.value,
  }));

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span>Creator Analytics</span>
            <span style={{ fontSize: 18, color: 'var(--accent-1)' }}>📈</span>
          </h1>
          <p className="page-subtitle">Deep intelligence into your sponsorship earnings, platform distribution, and deal conversion rates</p>
        </div>
      </div>

      {/* Top Stat Metrics */}
      <div className="grid-4 mb-8">
        {[
          { label: 'Total Earned', value: formatCurrency(stats?.totalEarned), sub: 'All-time payouts', icon: DollarSign, color: '#10b981' },
          { label: 'This Year (2026)', value: formatCurrency(stats?.thisYear), sub: 'Annual trajectory', icon: Calendar, color: '#8b5cf6' },
          { label: 'Current Month', value: formatCurrency(stats?.thisMonth), sub: 'Monthly recurring', icon: Zap, color: '#06b6d4' },
          { label: 'Pipeline Value', value: formatCurrency(stats?.pipelineValue), sub: 'Active integrations', icon: TrendingUp, color: '#ec4899' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="stat-card">
              <div className="stat-icon" style={{ color: s.color }}><Icon size={22} /></div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value accent" style={{ fontSize: 26 }}>{s.value}</div>
              <div className="stat-change">{s.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid-2 mb-8">
        {/* Revenue Over Time */}
        <div className="chart-card">
          <div className="chart-title">
            <TrendingUp size={16} color="var(--accent-1)" />
            <span>Revenue Growth Over Time</span>
          </div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthlyData} margin={{ top: 10, right: 10, bottom: 5, left: -15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="earned" 
                  stroke="#a855f7" 
                  strokeWidth={3} 
                  dot={{ fill: '#8b5cf6', strokeWidth: 2, stroke: '#ffffff', r: 4 }} 
                  activeDot={{ r: 7, fill: '#ec4899', stroke: '#ffffff', strokeWidth: 3 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        {/* Value by Platform */}
        <div className="chart-card">
          <div className="chart-title">
            <BarChart3 size={16} color="#06b6d4" />
            <span>Value by Content Platform</span>
          </div>
          {platformValueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={platformValueData} margin={{ top: 10, right: 10, bottom: 5, left: -15 }}>
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>
      </div>

      {/* Pipeline Breakdown Table */}
      <div className="chart-card">
        <div className="chart-title">
          <Zap size={16} color="var(--accent-1)" />
          <span>Deal Pipeline Stage Conversion Breakdown</span>
        </div>
        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Deal Stage</th>
                <th>Volume</th>
                <th>Cumulative Value</th>
                <th>Average per Deal</th>
                <th>Pipeline Share</th>
              </tr>
            </thead>
            <tbody>
              {statusData.map(s => {
                const total = statusData.reduce((sum, x) => sum + x.value, 0);
                const pct = total > 0 ? ((s.value / total) * 100).toFixed(1) : 0;
                const st = getStatus(s.statusKey);
                return (
                  <tr key={s.name}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{st.emoji}</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                      {s.count} deal{s.count !== 1 ? 's' : ''}
                    </td>
                    <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: st.color }}>
                      {formatCurrency(s.value)}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {s.count > 0 ? formatCurrency(s.value / s.count) : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--color-surface-3)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: 'var(--accent-gradient)',
                            borderRadius: 99
                          }} />
                        </div>
                        <span style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', minWidth: 40, textAlign: 'right' }}>
                          {pct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
      Not enough historical deal data yet
    </div>
  );
}
