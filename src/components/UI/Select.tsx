import React from "react";

type SelectProps = {
  label?: string;
  options: string[];
  error?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>;

export default function Select({
  label,
  options,
  error,
  ...props
}: SelectProps) {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-sm text-gray-600">{label}</label>}

      <select
        {...props}
        className={`border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-black transition-colors
          ${error ? "border-red-500" : "border-gray-300"}
          ${
            props.disabled 
              ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200" 
              : "bg-white text-black cursor-pointer"
          }
        `}
      >
        <option value="">Select</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>

      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
    </div>
  );
}