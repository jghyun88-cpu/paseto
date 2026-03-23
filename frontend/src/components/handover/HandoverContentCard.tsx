"use client";

interface Props {
  handoverType: string;
  content: Record<string, unknown>;
}

const SECTION_CONFIG: Record<string, { title: string; fields: { key: string; label: string }[] }[]> = {
  sourcing_to_review: [
    {
      title: "스크리닝 결과",
      fields: [
        { key: "screening_results.grade", label: "추천등급" },
        { key: "screening_results.overall_score", label: "총점" },
        { key: "screening_results.risk_notes", label: "리스크 노트" },
      ],
    },
    { title: "인계 메모", fields: [{ key: "handover_memo", label: "메모" }] },
    { title: "주요 리스크", fields: [{ key: "key_risks", label: "리스크" }] },
  ],
  review_to_backoffice: [
    {
      title: "IC 결정",
      fields: [
        { key: "ic_decision", label: "결정" },
        { key: "legal_memo", label: "법무 메모" },
      ],
    },
    {
      title: "투자 조건",
      fields: [
        { key: "investment_terms.amount", label: "투자금액" },
        { key: "investment_terms.valuation", label: "밸류에이션" },
        { key: "investment_terms.instrument", label: "투자수단" },
      ],
    },
    { title: "선행조건", fields: [{ key: "preconditions", label: "조건" }] },
  ],
  review_to_incubation: [
    { title: "투자메모 요약", fields: [{ key: "investment_memo_summary", label: "요약" }] },
    { title: "성장 병목", fields: [{ key: "growth_bottlenecks", label: "병목" }] },
    { title: "6개월 핵심과제", fields: [{ key: "six_month_priorities", label: "과제" }] },
    { title: "리스크 신호", fields: [{ key: "risk_signals", label: "리스크" }] },
  ],
  incubation_to_oi: [
    { title: "기술/제품 상태", fields: [{ key: "tech_product_status", label: "상태" }] },
    { title: "PoC 가능 영역", fields: [{ key: "poc_areas", label: "영역" }] },
    { title: "매칭 우선순위", fields: [{ key: "matching_priorities", label: "우선순위" }] },
    { title: "대응 리소스", fields: [{ key: "available_resources", label: "리소스" }] },
  ],
  oi_to_review: [
    { title: "전략투자 가능성", fields: [{ key: "strategic_investment_potential", label: "가능성" }] },
    { title: "고객 반응", fields: [{ key: "customer_feedback", label: "반응" }] },
    { title: "실증 성과", fields: [{ key: "pilot_results", label: "성과" }] },
    { title: "후속라운드 포인트", fields: [{ key: "follow_on_points", label: "포인트" }] },
  ],
  backoffice_broadcast: [
    { title: "계약 상태", fields: [{ key: "contract_status", label: "상태" }] },
    { title: "보고 기한", fields: [{ key: "report_deadline", label: "기한" }] },
    { title: "리스크 알림", fields: [{ key: "risk_alert", label: "알림" }] },
    { title: "문서 업데이트", fields: [{ key: "document_updates", label: "업데이트" }] },
  ],
};

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((cur, key) => {
    if (cur && typeof cur === "object" && key in (cur as Record<string, unknown>)) {
      return (cur as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function renderValue(val: unknown): string {
  if (val === null || val === undefined) return "-";
  if (Array.isArray(val)) return val.length > 0 ? val.join(", ") : "-";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

export default function HandoverContentCard({ handoverType, content }: Props) {
  const sections = SECTION_CONFIG[handoverType];

  // 기업 개요 (공통)
  const overview = content.company_overview as Record<string, string> | undefined;

  return (
    <div className="space-y-4">
      {overview && (
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">기업 개요</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-slate-500">기업명:</span> {overview.name ?? "-"}</div>
            <div><span className="text-slate-500">대표:</span> {overview.ceo ?? "-"}</div>
            <div><span className="text-slate-500">산업:</span> {overview.industry ?? "-"}</div>
            <div><span className="text-slate-500">단계:</span> {overview.stage ?? "-"}</div>
            {overview.one_liner && (
              <div className="col-span-2 text-slate-600">{overview.one_liner}</div>
            )}
          </div>
        </div>
      )}

      {sections ? (
        sections.map((section) => (
          <div key={section.title} className="bg-white rounded-lg p-4 border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">{section.title}</h3>
            <div className="space-y-1.5 text-sm">
              {section.fields.map((f) => {
                const val = getNestedValue(content, f.key);
                return (
                  <div key={f.key} className="flex gap-2">
                    <span className="text-slate-500 shrink-0 w-24">{f.label}:</span>
                    <span className="text-slate-800">{renderValue(val)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      ) : (
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">인계 내용</h3>
          <pre className="text-xs text-slate-600 whitespace-pre-wrap">
            {JSON.stringify(content, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
