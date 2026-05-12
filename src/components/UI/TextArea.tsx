import React from "react";

type TextareaProps = {
  label: string;
  error?: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export default function Textarea({
  label,
  error,
  ...props
}: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-gray-600">{label}</label>

      <textarea
        {...props}
        className={`border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-black
          ${error ? "border-red-500" : "border-gray-300"}
        `}
      />

      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
    </div>
  );
}
