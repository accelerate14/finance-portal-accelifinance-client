type StatBoxProps = {
  label: string;
  value: string;
  valueColor?: string;
};

export default function StatBox({ label, value, valueColor = "text-gray-800" }: StatBoxProps) {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
      <p className="text-xs text-gray-400 font-medium mb-1 uppercase tracking-tight">{label}</p>
      <p className={`text-lg font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}