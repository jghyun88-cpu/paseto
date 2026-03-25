"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

export interface FormField {
  key: string;
  label: string;
  type: "text" | "number" | "textarea" | "select" | "checkbox" | "slider" | "date";
  required?: boolean;
  placeholder?: string;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: string | number | boolean;
}

interface DynamicFormRendererProps {
  fields: FormField[];
  onSubmit: (data: Record<string, unknown>) => void;
  loading?: boolean;
  submitLabel?: string;
}

export default function DynamicFormRenderer({
  fields,
  onSubmit,
  loading = false,
  submitLabel = "제출",
}: DynamicFormRendererProps) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    for (const f of fields) {
      if (f.defaultValue !== undefined) {
        init[f.key] = f.defaultValue;
      } else if (f.type === "checkbox") {
        init[f.key] = false;
      } else if (f.type === "slider") {
        init[f.key] = f.min ?? 1;
      } else {
        init[f.key] = "";
      }
    }
    return init;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const setValue = useCallback((key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleSubmit = useCallback(() => {
    const newErrors: Record<string, string> = {};
    for (const f of fields) {
      if (f.required) {
        const v = values[f.key];
        if (v === "" || v === undefined || v === null) {
          newErrors[f.key] = `${f.label}은(는) 필수입니다`;
        }
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSubmit(values);
  }, [fields, values, onSubmit]);

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.key}>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          {renderField(field, values[field.key], setValue)}
          {errors[field.key] && (
            <p className="text-xs text-red-500 mt-1">{errors[field.key]}</p>
          )}
        </div>
      ))}
      <div className="pt-4">
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "처리 중..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}

function renderField(
  field: FormField,
  value: unknown,
  setValue: (key: string, value: unknown) => void,
) {
  const baseClass =
    "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

  switch (field.type) {
    case "text":
      return (
        <input
          type="text"
          className={baseClass}
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          onChange={(e) => setValue(field.key, e.target.value)}
        />
      );

    case "number":
      return (
        <input
          type="number"
          className={baseClass}
          value={(value as number) ?? ""}
          min={field.min}
          max={field.max}
          step={field.step}
          placeholder={field.placeholder}
          onChange={(e) => setValue(field.key, e.target.value === "" ? "" : Number(e.target.value))}
        />
      );

    case "textarea":
      return (
        <textarea
          className={`${baseClass} min-h-[80px]`}
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          rows={3}
          onChange={(e) => setValue(field.key, e.target.value)}
        />
      );

    case "select":
      return (
        <select
          className={baseClass}
          value={(value as string) ?? ""}
          onChange={(e) => setValue(field.key, e.target.value)}
        >
          <option value="">선택하세요</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );

    case "checkbox":
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            checked={!!value}
            onChange={(e) => setValue(field.key, e.target.checked)}
          />
          <span className="text-sm text-slate-600">{field.placeholder ?? "예"}</span>
        </label>
      );

    case "slider": {
      const min = field.min ?? 1;
      const max = field.max ?? 5;
      const step = field.step ?? 1;
      const current = (value as number) ?? min;
      return (
        <div className="flex items-center gap-3">
          <input
            type="range"
            className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            min={min}
            max={max}
            step={step}
            value={current}
            onChange={(e) => setValue(field.key, Number(e.target.value))}
          />
          <span className="text-sm font-semibold text-blue-600 min-w-[40px] text-center">
            {current}/{max}
          </span>
        </div>
      );
    }

    case "date":
      return (
        <input
          type="date"
          className={baseClass}
          value={(value as string) ?? ""}
          onChange={(e) => setValue(field.key, e.target.value)}
        />
      );

    default:
      return <p className="text-sm text-slate-400">지원하지 않는 필드 타입: {field.type}</p>;
  }
}
