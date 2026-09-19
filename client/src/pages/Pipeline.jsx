import React, { useEffect, useMemo, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import { brandsApi } from '../api';
import { useDeals, useMoveDeal } from '../features/deals/hooks';
import { useDebouncedValue } from '../hooks/useRealtime';
import { useToast } from '../context/ToastContext';
import { getStatus, getPlatform, formatCurrency, getDeadlineStatus, getPipelineColumns, weightedValue } from '../utils/helpers';
import NewDealModal from '../components/NewDealModal';
import DealDetailModal from '../components/DealDetailModal';
import { PageFallback, ErrorState, EmptyState } from '../components/States';

const COLUMNS = getPipelineColumns();

export default function Pipeline() {
  const { addToast } = useToast();
  const [brands, setBrands] = useState([]);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'high' | 'urgent'

  const debouncedSearch = useDebouncedValue(search, 300);
  const { data: dealsData, isLoading, isError, error } = useDeals({ search: debouncedSearch || undefined });
  const moveDeal = useMoveDeal();
  const deals = Array.isArray(dealsData) ? dealsData : [];

  useEffect(() => {
    brandsApi.getAll().then((b) => setBrands(b || [])).catch(() => {});
  }, []);

  const getDealsByStatus = (status) => {
    return deals
      .filter(d => {
        if (d.status !== status) return false;
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

    // Optimistic stage move (useMoveDeal rolls back on invalid transitions).
    try {
      await moveDeal.mutateAsync({ id: dealId, status: destStatus, position: destination.index });
      addToast(`Moved deal to ${getStatus(destStatus).label}`);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const columnValue = (status) => {
    return deals.filter(d => d.status === status).reduce((sum, d) => sum + (d.deal_value || 0), 0);
  };

  const weightedBoard = deals.reduce((sum, d) => sum + weightedValue(d), 0);

  if (isLoading) return <PageFallback />;
  if (isError) {
    return (
      <div className="empty-state" role="alert">
        <div style={{ color: 'var(--text-muted)' }}><AlertCircle size={28} /></div>
        <h3>Couldn't load the pipeline</h3>
        <p>{error?.message || 'Something went wrong.'}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span>Pipeline</span>
            <span className="badge" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}
              title={`Weighted pipeline value ${formatCurrency(weightedBoard)} (deal value × probability)`}>
              {formatCurrency(weightedBoard)} weighted
            </span>
          </h1>
          <p className="page-subtitle">Drag deals between stages to update status</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNewDeal(true)}>
          <Plus size={16} /> New Deal
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="search-input-wrap" style={{ maxWidth: 360 }}>
          <Search size={16} />
          <input
            className="search-input"
            placeholder="Search deals or brands..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filter Pills */}
        <div className="filter-pills">
          <button
            type="button"
            className={`pill ${filterMode === 'all' ? 'active' : ''}`}
            onClick={() => setFilterMode('all')}
          >
            All ({deals.length})
          </button>
          <button
            type="button"
            className={`pill ${filterMode === 'high' ? 'active' : ''}`}
            onClick={() => setFilterMode('high')}
          >
            High priority
          </button>
          <button
            type="button"
            className={`pill ${filterMode === 'urgent' ? 'active' : ''}`}
            onClick={() => setFilterMode('urgent')}
          >
            Due soon
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
                    <span className="col-dot" style={{ '--dot': col.color }} />
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
                        background: snapshot.isDraggingOver ? '#e6e9ee' : undefined,
                        borderRadius: 8,
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {colDeals.length === 0 && !snapshot.isDraggingOver && (
                        <div className="column-empty">
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
                                opacity: snapshot.isDragging ? 0.96 : 1,
                                boxShadow: snapshot.isDragging
                                  ? '0 16px 32px -8px rgba(16,24,40,0.3)'
                                  : undefined
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
        />
      )}

      {selectedDeal && (
        <DealDetailModal
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
        />
      )}
    </div>
  );
}

function DealCard({ deal }) {
  const platform = getPlatform(deal.platform);
  const deadline = getDeadlineStatus(deal.deadline);
  const weighted = weightedValue(deal);

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
        <div className="deal-card-value" title={`Weighted ${formatCurrency(weighted)} (${deal.probability ?? 0}% probability)`}>
          {formatCurrency(deal.deal_value)}
        </div>
        <div className="deal-card-meta">
          <span className="platform-badge">{platform.label}</span>
          {deadline && (
            <span className={`deadline-badge ${deadline.type}`}>{deadline.label}</span>
          )}
        </div>
      </div>
    </>
  );
}
