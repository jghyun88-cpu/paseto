"use client";

import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import KanbanColumn from "./KanbanColumn";
import type { KanbanCardData } from "./KanbanCard";

export interface ColumnDef {
  id: string;
  title: string;
  stageKey: string;
}

interface KanbanBoardProps {
  columns: ColumnDef[];
  cards: Record<string, KanbanCardData[]>;
  onMove: (cardId: string, fromColumn: string, toColumn: string) => void;
  onCardClick: (id: string) => void;
}

export default function KanbanBoard({ columns, cards, onMove, onCardClick }: KanbanBoardProps) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.source.droppableId === result.destination.droppableId) return;
    onMove(result.draggableId, result.source.droppableId, result.destination.droppableId);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="kanban-board">
        {columns.map((col) => (
          <KanbanColumn
            key={col.id}
            columnId={col.id}
            title={col.title}
            cards={cards[col.id] ?? []}
            onCardClick={onCardClick}
          />
        ))}
      </div>
    </DragDropContext>
  );
}
