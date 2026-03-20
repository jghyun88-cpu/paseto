"use client";

import { Draggable } from "@hello-pangea/dnd";
import { Building2, User, Star } from "lucide-react";

export interface KanbanCardData {
  id: string;
  company_name: string;
  ceo_name: string;
  industry: string;
  stage: string;
  created_at: string;
  screening_score?: number;
  assigned_manager_name?: string;
}

interface KanbanCardProps {
  card: KanbanCardData;
  index: number;
  onClick: (id: string) => void;
}

export default function KanbanCard({ card, index, onClick }: KanbanCardProps) {
  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`kanban-card ${snapshot.isDragging ? "kanban-card--dragging" : ""}`}
          onClick={() => onClick(card.id)}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Building2 size={13} className="text-blue-500 shrink-0" />
            <span className="text-sm font-semibold text-slate-800 truncate">{card.company_name}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <User size={11} />
            <span>{card.assigned_manager_name ?? card.ceo_name}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="inline-block px-1.5 py-0.5 text-[10px] rounded bg-slate-100 text-slate-600">
              {card.industry}
            </span>
            <span className="inline-block px-1.5 py-0.5 text-[10px] rounded bg-blue-50 text-blue-600">
              {card.stage}
            </span>
            {card.screening_score != null && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded bg-amber-50 text-amber-700">
                <Star size={9} />
                {card.screening_score}/35
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-1.5">{card.created_at.slice(0, 10)}</div>
        </div>
      )}
    </Draggable>
  );
}
