"use client";

interface ScoreSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  color?: string;
}

export default function ScoreSlider({
  label,
  value,
  onChange,
  color = "blue",
}: ScoreSliderProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-semibold text-slate-600">{label}</label>
        <span className={`text-sm font-bold text-${color}-600`}>{value}/5</span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-${color}-600`}
      />
      <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
        <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
      </div>
    </div>
  );
}
