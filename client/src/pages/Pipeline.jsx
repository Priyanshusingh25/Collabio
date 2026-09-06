import React, { useEffect, useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Search, Filter, Sparkles, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { dealsApi, brandsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getStatus, getPlatform, formatCurrency, getDeadlineStatus, getPipelineColumns } from '../utils/helpers';
import NewDealModal from '../components/NewDealModal';
import DealDetailModal from '../components/DealDetailModal';

const COLUMNS = getPipelineColumns();

export default function Pipeline() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [deals, setDeals] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'high' | 'urgent'

  const load = useCallback(async () => {
    try {
      const [d, b] = await Promise.all([dealsApi.getAll(token), brandsApi.getAll(token)]);
      setDeals(d);
      setBrands(b);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const getDealsByStatus = (status) => {
    return deals
      .filter(d => {
        if (d.status !== status) return false;
        if (search) {
          const matchSearch = d.brand_name.toLowerCase().includes(search.toLowerCase()) || 
                              d.title.toLowerCase().includes(search.toLowerCase());
          if (!matchSearch) return false;
        }
        if (filterMode === 'high') return d.priority === 'high';
        if (filterMode === 'urgent') {
          const dl = getDeadlineStatus(d.deadline);
          return dl && (dl.type === 'overdue' || dl.type === 'soon');
        }
        return true;
      })
      .sort((a, b) => a.position - b.position);
  };

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    const destStatus = destination.droppableId;
    const dealId = parseInt(draggableId);

    if (source.droppableId === destStatus && source.index === destination.index) return;

    // Optimistically update UI
    setDeals(prev => prev.map(d =>
      d.id === dealId ? { ...d, status: destStatus, position: destination.index } : d
    ));

    try {
      await dealsApi.update(token, dealId, {
        status: destStatus,
        position: destination.index,
        paid_at: destStatus === 'paid' ? new Date().toISOString().split('T')[0] : undefined,
      });
      addToast(`Moved deal to ${getStatus(destStatus).label} ✨`);
    } catch (err) {
      addToast(err.message, 'error');
      load(); // Revert on error
    }
  };

  const handleDealUpdated = (updated) => {
    setDeals(prev => prev.map(d => d.id === updated.id ? { ...d, ...updated } : d));
  };

  const handleDealDeleted = (id) => {
    setDeals(prev => prev.filter(d => d.id !== id));
  };

  const columnValue = (status) => {
    return deals.filter(d => d.status === status).reduce((sum, d) => sum + (d.deal_value || 0), 0);
  };

  const totalBoardValue = deals.reduce((sum, d) => sum + (d.deal_value || 0), 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span>Pipeline Board</span>
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', background: 'rgba(16, 185, 129, 0.12)', color: '#34d399', padding: '3px 10px', borderRadius: 20 }}>
              {formatCurrency(totalBoardValue)} Total
            </span>
          </h1>
          <p className="page-subtitle">Interactive drag-and-drop kanban operating system for creator partnerships</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNewDeal(true)}>
          <Plus size={16} /> New Deal
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="search-input-wrap" style={{ maxWidth: 380 }}>
          <Search size={16} />
          <input
            className="search-input"
            placeholder="Search deals, deliverables, brands..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filter Pills */}
        <div style={{
          display: 'flex',
          gap: 6,
          background: 'var(--color-surface)',
          padding: 4,
          borderRadius: 10,
          border: '1px solid var(--color-border)'
        }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setFilterMode('all')}
            style={{
              background: filterMode === 'all' ? 'var(--color-surface-3)' : 'transparent',
              color: filterMode === 'all' ? '#ffffff' : 'var(--text-muted)'
            }}
          >
            All Deals ({deals.length})
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setFilterMode('high')}
            style={{
              background: filterMode === 'high' ? 'rgba(244, 63, 94, 0.15)' : 'transparent',
              color: filterMode === 'high' ? '#f43f5e' : 'var(--text-muted)'
            }}
          >
            🔥 High Priority
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setFilterMode('urgent')}
            style={{
              background: filterMode === 'urgent' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
              color: filterMode === 'urgent' ? '#f59e0b' : 'var(--text-muted)'
            }}
          >
            ⏰ Due Soon
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="pipeline-board">
          {COLUMNS.map(col => {
            const colDeals = getDealsByStatus(col.key);
            const colTotal = columnValue(col.key);
            return (
              <div key={col.key} className="pipeline-column">
                <div className="column-header">
                  <div className="column-title">
                    <span>{col.emoji}</span>
                    <span>{col.label}</span>
                    <span className="column-count">{colDeals.length}</span>
                  </div>
                  <div className="column-value">{formatCurrency(colTotal)}</div>
                </div>

                <Droppable droppableId={col.key}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`column-body ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                      style={{
                        background: snapshot.isDraggingOver ? 'rgba(139, 92, 246, 0.06)' : undefined,
                        transition: 'background 0.2s ease'
                      }}
                    >
                      {colDeals.length === 0 && !snapshot.isDraggingOver && (
                        <div className="column-empty">
                          <div style={{ fontSize: 28, opacity: 0.35, marginBottom: 6 }}>🕳️</div>
                          <div>No deals in this stage</div>
                        </div>
                      )}

                      {colDeals.map((deal, index) => (
                        <Draggable key={deal.id} draggableId={String(deal.id)} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="deal-card"
                              style={{
                                ...provided.draggableProps.style,
                                opacity: snapshot.isDragging ? 0.92 : 1,
                                transform: snapshot.isDragging
                                  ? `${provided.draggableProps.style?.transform} rotate(1.5deg) scale(1.02)`
                                  : provided.draggableProps.style?.transform,
                                boxShadow: snapshot.isDragging
                                  ? '0 20px 50px rgba(0,0,0,0.8), 0 0 25px rgba(139, 92, 246, 0.4)'
                                  : undefined,
                                border: snapshot.isDragging ? '1px solid rgba(139, 92, 246, 0.6)' : undefined
                              }}
                              onClick={() => !snapshot.isDragging && setSelectedDeal(deal)}
                            >
                              <DealCard deal={deal} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {showNewDeal && (
        <NewDealModal
          brands={brands}
          onClose={() => setShowNewDeal(false)}
          onCreated={(deal) => { setDeals(prev => [deal, ...prev]); }}
        />
      )}

      {selectedDeal && (
        <DealDetailModal
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onUpdated={handleDealUpdated}
          onDeleted={handleDealDeleted}
        />
      )}
    </div>
  );
}

function DealCard({ deal }) {
  const platform = getPlatform(deal.platform);
  const deadline = getDeadlineStatus(deal.deadline);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div className="deal-card-brand">{deal.brand_name}</div>
        <div className="priority-dot" data-priority={deal.priority}>
          {deal.priority === 'high' && <div className="priority-dot high" title="High Priority" />}
          {deal.priority === 'medium' && <div className="priority-dot medium" title="Medium Priority" />}
          {deal.priority === 'low' && <div className="priority-dot low" title="Low Priority" />}
        </div>
      </div>

      <div className="deal-card-title">{deal.title}</div>

      <div className="deal-card-footer">
        <div className="deal-card-value">{formatCurrency(deal.deal_value)}</div>
        <div className="deal-card-meta">
          <span className="platform-badge">{platform.emoji} {platform.label}</span>
          {deadline && (
            <span className={`deadline-badge ${deadline.type}`}>{deadline.label}</span>
          )}
        </div>
      </div>
    </>
  );
}
