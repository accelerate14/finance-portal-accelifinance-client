type InputProps = {
  label?: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

export default function Input({ label, error, ...props }: InputProps) {
  const isDisabled = props.disabled;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          className={`text-sm ${
            isDisabled ? "text-gray-400" : "text-gray-600"
          }`}
        >
          {label}
        </label>
      )}

      <input
        {...props}
        className={`border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-black
        ${error ? "border-red-500" : "border-gray-300"}
        ${isDisabled ? "bg-gray-100 text-gray-400 cursor-not-allowed" : ""}
        `}
      />

      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}