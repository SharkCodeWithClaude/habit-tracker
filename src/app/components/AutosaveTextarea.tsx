"use client";

import { useRef } from "react";

interface AutosaveTextareaProps {
  defaultValue: string;
  onSave: (value: string) => Promise<void>;
  label: string;
  className: string;
  inputClassName: string;
  placeholder: string;
  rows: number;
}

export function AutosaveTextarea({
  defaultValue,
  onSave,
  label,
  className,
  inputClassName,
  placeholder,
  rows,
}: AutosaveTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  async function handleBlur() {
    const value = ref.current?.value ?? "";
    await onSave(value);
  }

  return (
    <div className={className}>
      <div className="block-label">
        <span className="prompt-arrow">&rarr;</span> {label}
      </div>
      <textarea
        ref={ref}
        className={inputClassName}
        defaultValue={defaultValue}
        onBlur={handleBlur}
        placeholder={placeholder}
        rows={rows}
      />
    </div>
  );
}
