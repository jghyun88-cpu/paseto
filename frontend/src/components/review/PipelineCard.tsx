"use client";

interface PipelineCardProps {
  companyName: string;
  ceoName: string;
  industry: string;
  stage: string;
  onClick: () => void;
}

export default function PipelineCard({
  companyName,
  ceoName,
  industry,
  stage,
  onClick,
}: PipelineCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white border border-slate-200 rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
    >
      <div className="font-semibold text-sm text-slate-800">{companyName}</div>
      <div className="text-xs text-slate-500 mt-0.5">{ceoName}</div>
      <div className="flex gap-1.5 mt-2">
        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">
          {industry}
        </span>
        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px]">
          {stage}
        </span>
      </div>
    </div>
  );
}
