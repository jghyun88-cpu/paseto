"use client";

import { Droppable } from "@hello-pangea/dnd";
import KanbanCard, { type KanbanCardData } from "./KanbanCard";

interface KanbanColumnProps {
  columnId: string;
  title: string;
  cards: KanbanCardData[];
  onCardClick: (id: string) => void;
}

export default function KanbanColumn({ columnId, title, cards, onCardClick }: KanbanColumnProps) {
  return (
    <div className="kanban-column">
      <div className="kanban-column-header">
        <span className="kanban-column-title">{title}</span>
        <span className="kanban-column-count">{cards.length}</span>
      </div>
      <Droppable droppableId={columnId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`kanban-column-body ${snapshot.isDraggingOver ? "kanban-column-body--over" : ""}`}
          >
            {cards.map((card, index) => (
              <KanbanCard key={card.id} card={card} index={index} onClick={onCardClick} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
