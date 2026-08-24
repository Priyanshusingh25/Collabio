import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, CartesianGrid, Legend
} from 'recharts';
import { statsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, getPlatform, getStatus } from '../utils/helpers';

const COLORS = ['#7c3aed', '#a855f7', '#ec4899', '#60a5fa', '#10b981', '#f59e0b'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
        <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color, fontWeight: 700 }}>
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
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
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
    count: s.count,
    value: s.value,
  }));

  const monthlyData = (stats?.monthlyRevenue || []).map(r => ({
    month: r.month ? new Date(r.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : r.month,
    earned: r.value,
  }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics 📈</h1>
          <p className="page-subtitle">Deep dive into your creator business performance</p>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid-4 mb-8">
        {[
          { label: 'Total Earned', value: formatCurrency(stats?.totalEarned), emoji: '💰' },
          { label: 'This Year', value: formatCurrency(stats?.thisYear), emoji: '📅' },
          { label: 'This Month', value: formatCurrency(stats?.thisMonth), emoji: '🗓️' },
          { label: 'Pipeline', value: formatCurrency(stats?.pipelineValue), emoji: '🚀' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{s.emoji}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value accent" style={{ fontSize: 22 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid-2 mb-8">
        {/* Revenue over time */}
        <div className="chart-card">
          <div className="chart-title">📊 Revenue Over Time</div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fill: '#535869', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#535869', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="earned" stroke="#a855f7" strokeWidth={2.5} dot={{ fill: '#7c3aed', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        {/* Value by Platform */}
        <div className="chart-card">
          <div className="chart-title">💸 Value by Platform</div>
          {platformValueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={platformValueData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <XAxis dataKey="name" tick={{ fill: '#535869', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#535869', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#7c3aed">
                  {platformValueData.map((d, i) => (
                    <rect key={i} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>
      </div>

      {/* Pipeline breakdown table */}
      <div className="chart-card">
        <div className="chart-title">🔄 Deal Pipeline Breakdown</div>
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Stage</th>
                <th>Deals</th>
                <th>Total Value</th>
                <th>Avg per Deal</th>
                <th>% of Pipeline</th>
              </tr>
            </thead>
            <tbody>
              {statusData.map(s => {
                const total = statusData.reduce((sum, x) => sum + x.value, 0);
                const pct = total > 0 ? ((s.value / total) * 100).toFixed(1) : 0;
                const st = getStatus(s.name.toLowerCase().replace(' ', '_'));
                return (
                  <tr key={s.name}>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.count}</td>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(s.value)}</td>
                    <td>{s.count > 0 ? formatCurrency(s.value / s.count) : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 4, background: 'var(--color-surface-3)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent-gradient)', borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 32 }}>{pct}%</span>
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
    <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
      Not enough data yet
    </div>
  );
}
