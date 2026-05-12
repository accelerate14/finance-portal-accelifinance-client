import { useState } from "react";

type DocFile = {
  file: File | null;
  previewUrl: string | null;
};

type DocumentUploadBoxProps = {
  title: string;
  description?: string;
  accept?: string;
  onChange: (file: File | null) => void;
  required?: boolean;
};

export default function DocumentUploadBox({
  title,
  description,
  accept = "image/*,.pdf",
  onChange,
  required = true,
}: DocumentUploadBoxProps) {
  const [doc, setDoc] = useState<DocFile>({ file: null, previewUrl: null });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setDoc({ file: selectedFile, previewUrl: url });
      onChange(selectedFile);
    }
  };

  const removeFile = () => {
    if (doc.previewUrl) {
      URL.revokeObjectURL(doc.previewUrl);
    }
    setDoc({ file: null, previewUrl: null });
    onChange(null);
  };

  return (
    <div className="border rounded-lg p-4 flex flex-col h-full bg-white">
      <div className="font-medium mb-3 text-gray-700">{title}</div>
      {description && <p className="text-xs text-gray-500 mb-2">{description}</p>}
      
      <input
        type="file"
        accept={accept}
        onChange={handleFile}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
        required={required}
      />

      {doc.file && (
        <div className="mt-3 flex items-center justify-between text-[11px] bg-indigo-50 text-indigo-700 p-2 rounded border border-indigo-100">
          <span className="truncate flex-1 mr-2">{doc.file.name}</span>
          <button
            type="button"
            onClick={removeFile}
            className="text-red-500 font-bold px-1 hover:scale-110 transition-transform"
          >
            ✕
          </button>
        </div>
      )}

      <div className="mt-4 h-48 border-2 border-dashed border-gray-100 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50">
        {doc.previewUrl ? (
          doc.file?.type.includes("image") ? (
            <img
              src={doc.previewUrl}
              alt="Preview"
              className="max-w-full max-h-full object-cover w-full h-full"
            />
          ) : (
            <div className="text-center p-4">
              <div className="text-3xl mb-1">📄</div>
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
                PDF Selected
              </div>
            </div>
          )
        ) : (
          <div className="text-center text-gray-300">
            <div className="text-2xl mb-1">☁️</div>
            <span className="text-[10px] uppercase font-bold tracking-widest">Drop File</span>
          </div>
        )}
      </div>
    </div>
  );
}