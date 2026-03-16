"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

const SECTION_LABELS: Record<string, string> = {
  overview: "투자 개요",
  team_assessment: "팀 평가",
  market_assessment: "시장 평가",
  tech_product_assessment: "기술/제품 평가",
  traction: "트랙션",
  risks: "5대 리스크",
  value_add_points: "밸류애드 포인트",
  proposed_terms: "",
  post_investment_plan: "투자 후 계획",
};

const SECTION_KEYS = [
  "overview", "team_assessment", "market_assessment",
  "tech_product_assessment", "traction", "risks",
  "value_add_points", "post_investment_plan",
] as const;

interface MemoEditorProps {
  sections: Record<string, string>;
  onChange: (key: string, value: string) => void;
  readOnly?: boolean;
}

export default function MemoEditor({ sections, onChange, readOnly }: MemoEditorProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["overview"]));

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {SECTION_KEYS.map((key) => {
        const isOpen = expanded.has(key);
        return (
          <div key={key} className="border border-slate-200 rounded-lg">
            <button
              type="button"
              onClick={() => toggle(key)}
              className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-slate-50"
            >
              {isOpen
                ? <ChevronDown size={16} className="text-slate-400" />
                : <ChevronRight size={16} className="text-slate-400" />}
              <span className="text-sm font-semibold text-slate-700">
                {SECTION_LABELS[key]}
              </span>
              {sections[key] && (
                <span className="text-xs text-slate-400 ml-auto">
                  {sections[key].length}자
                </span>
              )}
            </button>
            {isOpen && (
              <div className="px-4 pb-3">
                <textarea
                  value={sections[key] ?? ""}
                  onChange={(e) => onChange(key, e.target.value)}
                  readOnly={readOnly}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500 resize-y"
                  placeholder={`${SECTION_LABELS[key]} 내용을 작성하세요`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
