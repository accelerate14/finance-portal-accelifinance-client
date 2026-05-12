import { useNavigate } from "react-router-dom";
import Button from "../../../components/UI/Button";

/* --- Dummy Data for Preview --- */
const UPLOADED_DOCS = [
  { id: 1, name: "Driver_License_Front.jpg", type: "image", date: "22/01/2026", status: "Rejected" },
  { id: 2, name: "Paystub_January.pdf", type: "pdf", date: "22/01/2026", status: "Approved" },
];

const COMMENTS = [
  {
    id: 1,
    author: "Lender (Loan Officer)",
    text: "The Driver's License upload is blurry and the expiration date is cut off. Please upload a clear, high-resolution photo of the front of your license again.",
    timestamp: "27/01/2026, 10:30 AM",
    isUrgent: true,
  },
];

export default function ViewDocumentsPage() {
  const navigate = useNavigate();

  const handleReupload = () => {
    navigate("/borrower/reupload-documents");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Your Documents</h1>
            <p className="text-sm text-gray-500">Review your submitted files and lender feedback.</p>
          </div>
          <Button onClick={() => navigate("/borrower/dashboard")} className="bg-white !text-gray-700 border shadow-sm">
            Back to Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Document List */}
          <div className="lg:col-span-2 space-y-4">
            {UPLOADED_DOCS.map((doc) => (
              <div key={doc.id} className="bg-white p-4 rounded-xl shadow-sm border flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center text-2xl">
                    {doc.type === "pdf" ? "📄" : "🖼️"}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{doc.name}</p>
                    <p className="text-xs text-gray-400">Uploaded on {doc.date}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                    doc.status === "Rejected" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                  }`}>
                    {doc.status}
                  </span>
                  <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">View</button>
                </div>
              </div>
            ))}

            {/* Reupload CTA Box */}
            <div className="bg-indigo-600 rounded-xl p-6 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold">Action Required</h3>
                <p className="text-indigo-100 text-sm">One or more documents need your attention.</p>
              </div>
              
              <Button 
                onClick={handleReupload} 
                className="bg-white !text-indigo-600 hover:bg-indigo-50 font-bold px-8 shadow-md"
              >
                Re-upload Documents
              </Button>
            </div>
          </div>

          {/* Feedback/Comments Sidebar */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 px-1">Lender Feedback</h2>
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-4 border-b bg-gray-50">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Conversation History</p>
              </div>
              
              <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto bg-white">
                {COMMENTS.map((comment) => (
                  <div key={comment.id} className={`p-3 rounded-lg border-l-4 ${comment.isUrgent ? 'border-red-500 bg-red-50/30' : 'border-gray-300 bg-gray-50'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-gray-700">{comment.author}</span>
                      <span className="text-[10px] text-gray-400">{comment.timestamp}</span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed italic">
                      "{comment.text}"
                    </p>
                  </div>
                ))}
              </div>
              
              <div className="p-4 bg-gray-50 border-t text-center">
                <p className="text-[10px] text-gray-400">
                  Please address these comments by clicking the "Re-upload" button.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}