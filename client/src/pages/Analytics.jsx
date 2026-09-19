import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend
} from 'recharts';
import { BarChart3, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { statsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, getPlatform, getStatus } from '../utils/helpers';

const COLORS = ['#4f46e5', '#0ea5e9', '#059669', '#d97706', '#dc2626', '#7c3aed'];

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
        <div style={{ color: '#98a2b3', fontSize: 11, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: '#fff', fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
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
            <span>Analytics</span>
          </h1>
          <p className="page-subtitle">Earnings, platform mix, and conversion by stage</p>
        </div>
      </div>

      {/* Top Stat Metrics */}
      <div className="grid-4 mb-8">
        {[
          { label: 'Total Earned', value: formatCurrency(stats?.totalEarned), sub: 'All-time payouts', icon: DollarSign },
          { label: 'This Year', value: formatCurrency(stats?.thisYear), sub: 'Annual total', icon: Calendar },
          { label: 'Current Month', value: formatCurrency(stats?.thisMonth), sub: 'Month to date', icon: TrendingUp },
          { label: 'Pipeline Value', value: formatCurrency(stats?.pipelineValue), sub: 'Active deals', icon: BarChart3 },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="stat-card">
              <div className="stat-icon"><Icon size={19} /></div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ fontSize: 24 }}>{s.value}</div>
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
            <TrendingUp size={16} />
            <span>Revenue over time</span>
          </div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthlyData} margin={{ top: 10, right: 10, bottom: 5, left: -15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fill: '#667085', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#667085', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="earned"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  dot={{ fill: '#4f46e5', strokeWidth: 2, stroke: '#ffffff', r: 3 }}
                  activeDot={{ r: 5, fill: '#4f46e5', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        {/* Value by Platform */}
        <div className="chart-card">
          <div className="chart-title">
            <BarChart3 size={16} />
            <span>Value by platform</span>
          </div>
          {platformValueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={platformValueData} margin={{ top: 10, right: 10, bottom: 5, left: -15 }}>
                <XAxis dataKey="name" tick={{ fill: '#667085', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#667085', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#4f46e5" />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>
      </div>

      {/* Pipeline Breakdown Table */}
      <div className="chart-card">
        <div className="chart-title">
          <BarChart3 size={16} />
          <span>Pipeline by stage</span>
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
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: st.color, display: 'inline-block' }} />
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 650, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                      {s.count} deal{s.count !== 1 ? 's' : ''}
                    </td>
                    <td style={{ fontWeight: 650, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
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
                            background: st.color,
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
