import React, { useEffect, useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Search, Filter } from 'lucide-react';
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
      .filter(d => d.status === status && (!search || d.brand_name.toLowerCase().includes(search.toLowerCase()) || d.title.toLowerCase().includes(search.toLowerCase())))
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
      addToast(`Moved to ${getStatus(destStatus).label}`);
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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pipeline 🎯</h1>
          <p className="page-subtitle">Drag deals between stages to track progress</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNewDeal(true)}>
          <Plus size={16} /> New Deal
        </button>
      </div>

      {/* Search bar */}
      <div className="search-bar mb-6">
        <div className="search-input-wrap">
          <Search size={15} />
          <input
            className="search-input"
            placeholder="Search deals or brands..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Kanban board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="pipeline-board">
          {COLUMNS.map(col => {
            const colDeals = getDealsByStatus(col.key);
            return (
              <div key={col.key} className="pipeline-column">
                <div className="column-header">
                  <div className="column-title">
                    <span>{col.emoji}</span>
                    <span>{col.label}</span>
                    <span className="column-count">{deals.filter(d => d.status === col.key).length}</span>
                  </div>
                  <div className="column-value">{formatCurrency(columnValue(col.key))}</div>
                </div>

                <Droppable droppableId={col.key}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`column-body ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                      style={{ borderRadius: snapshot.isDraggingOver ? 8 : undefined, transition: 'all 0.15s' }}
                    >
                      {colDeals.length === 0 && !snapshot.isDraggingOver && (
                        <div className="column-empty">
                          <div style={{ fontSize: 24, marginBottom: 8 }}>🕳️</div>
                          <div>No deals here</div>
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
                                opacity: snapshot.isDragging ? 0.9 : 1,
                                transform: snapshot.isDragging
                                  ? `${provided.draggableProps.style?.transform} rotate(2deg)`
                                  : provided.draggableProps.style?.transform,
                                boxShadow: snapshot.isDragging ? '0 16px 40px rgba(0,0,0,0.6)' : undefined,
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
        <div className="priority-dot" style={{ marginTop: 4 }} data-priority={deal.priority}>
          {deal.priority === 'high' && <div className="priority-dot high" />}
          {deal.priority === 'medium' && <div className="priority-dot medium" />}
          {deal.priority === 'low' && <div className="priority-dot low" />}
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
