# 🎬 Financial Lending Portal - Complete Video Demo Guide

> **Purpose:** Create a comprehensive demo video showcasing all features of the Financial Lending Portal
> **Target Duration:** 12-15 minutes
> **Last Updated:** April 8, 2026

---

## 📋 Table of Contents

1. [Complete Feature List by Role](#complete-feature-list-by-role)
2. [Video Flow Structure](#video-flow-structure)
3. [Detailed Recording Script & Transcript](#detailed-recording-script--transcript)
4. [Step-by-Step Recording Guide](#step-by-step-recording-guide)
5. [AI Tools for Video Creation](#ai-tools-for-video-creation)
6. [Recording Tips](#recording-tips)

---

## 🏗️ Complete Feature List by Role

### 🏠 Public/Home Page

| Feature | Description | Route |
|---------|-------------|-------|
| Hero Section | Platform overview with stats and CTAs | `/` |
| Platform Stats | $2.4B+ loans, 15K+ borrowers, <24hr approval, 99.9% compliance | `/` |
| Features Showcase | Document Verification, Risk Assessment, Workflow Tracking, Security | `/` |
| How It Works | 4-step process: Apply → Upload → Review → Approve | `/` |
| Loan Products | Personal Loan (8.5% APR), Business Loan (6.9% APR), Home Loan (5.2% APR) | `/` |
| Trust Section | Bank-Level Security, Lightning Fast, Transparent Process | `/` |
| Authenticated Views | Dynamic dashboards for logged-in Borrowers, Loan Officers, Underwriters | `/` |

---

### 👤 Borrower Portal

| Feature | Description | Route |
|---------|-------------|-------|
| **Registration** | Create new borrower account | `/borrower/register` |
| **Login** | Secure authentication | `/borrower/login` |
| **Dashboard** | Quick stats: Active Loans, Pending Applications, Total Borrowed, Credit Score | `/borrower/dashboard` |
| **Quick Actions** | New Loan Application, View Documents, Payment History | `/borrower/dashboard` |
| **Loan Application Wizard** | | |
| └─ Step 1: Personal Info | Collect borrower personal details | `/borrower/loan-request-steps` |
| └─ Step 2: Employment Status | Employment and income information | `/borrower/loan-request-steps` |
| └─ Step 3: Loan Terms | Loan amount, term, purpose | `/borrower/loan-request-steps` |
| **Review Page** | Review application before submission | `/borrower/review` |
| **Document Upload** | Upload required documents with AI verification | `/borrower/upload-documents` |
| **Document Reupload** | Reupload rejected documents | `/borrower/reupload-documents/:loanId` |
| **View Documents** | View all uploaded documents | `/borrower/view-documents` |
| **Loan Details** | Track application status, view loan history | `/borrower/loan-details/:loanId` |

---

### 💼 Loan Officer Portal

| Feature | Description | Route |
|---------|-------------|-------|
| **Dashboard Tab** | | `/lender/dashboard` |
| └─ KPI Cards | Total Applications, Tasks Pending, Scrutiny Pending, Submitted, Approved | |
| └─ Financial Summary | Total Portfolio Value, Avg Loan Size | |
| └─ Application Trends | Weekly area chart of applications | |
| └─ Borrower Distribution | Pie chart of applications per borrower | |
| └─ Quick Actions | Top 3 pending tasks with Review Now buttons | |
| **Loan Applications Tab** | | |
| └─ Worklist Table | Filterable, sortable loan applications table | |
| └─ Search | Search by Case ID or Borrower name | |
| └─ Status Filter | Filter by case status | |
| └─ Case Instance Filter | Filter by UiPath case instance state | |
| **Pending Tasks Tab** | Priority-based task list with actions | |
| **Case Instances Tab** | | |
| └─ Process Summary | Cards showing Pending/Running/Completed/Paused/Cancelled/Faulted counts | |
| └─ Execution Status | Table of individual case instances with run status | |
| **Loan Details Page** | Detailed loan review with borrower info | `/lender/loan-details/:loanId/:borrowerId/:caseNumber` |

---

### 📊 Underwriter Portal

| Feature | Description | Route |
|---------|-------------|-------|
| **Dashboard Tab** | | `/underwriter/dashboard` |
| └─ 8 KPI Cards | Total, Pending, Sign Pending, Approved, Rejected, Approval Rate, Avg Processing, High Risk | |
| └─ Financial Summary | Total Portfolio, Approved Amount, Avg Loan Size, Rejection Rate | |
| └─ Application Trends | Weekly area chart | |
| └─ Risk Distribution | Pie chart: Low/Medium/High/Not Calculated | |
| └─ Status Distribution | Bar chart of applications by status | |
| └─ Borrower Distribution | Pie chart + legend | |
| └─ Quick Actions | Top pending tasks with contextual actions | |
| **Loan Applications Tab** | Advanced filtering by status, risk level, search | |
| **Pending Actions Tab** | Tasks + Agreement Sign Pending items | |
| **Case Instances Tab** | Process summary + execution status | |
| **SLA Escalations Tab** | Breached and at-risk SLA tracking | |
| **Loan Details Page** | Detailed underwriter review | `/underwriter/loan-details/:loanId/:borrowerId/:caseNumber` |
| **Loan Evaluation** | Underwriter evaluation workspace | `/lender/loan-action/:loanId/:userId` |
| **Agreement Signing** | eSign workflow for loan agreements | `/underwriter/agreement-sign/:loanId/:userId` |
| **Underwriter Assistant** | AI-powered chatbot (floating widget) | All pages |

---

### 🔧 Admin Portal

| Feature | Description | Route |
|---------|-------------|-------|
| **User Management** | CRUD operations on all user types | `/admin/users` |
| **Audit Logs** | Activity tracking and compliance viewer | `/admin/audit-logs` |

---

### 🤖 Special/Technical Features

| Feature | Description | Location |
|---------|-------------|----------|
| **UiPath Integration** | Case management, action tasks, workflow automation | All lender pages |
| **Case Traces Tab** | Visual process flow with React Flow diagrams | Loan Details pages |
| **Execution Trail** | Table view of executed stages and tasks | Loan Details pages |
| **Risk Analysis** | Cognitive data with risk levels (Low/Medium/High) | Underwriter Dashboard |
| **SLA Monitoring** | Escalation rules, breach tracking | Underwriter Dashboard |
| **Case Operations** | Pause, Resume, Close, Reopen case operations | Loan Details pages |
| **Variable Inspector** | View case JSON variables | Loan Details pages |

---

## 🎥 Video Flow Structure

### Option A: Complete End-to-End Demo (Recommended - 12-15 min)

| Section | Duration | Pages to Show |
|---------|----------|---------------|
| 1. Introduction | 1 min | Home page (public) |
| 2. Borrower Journey | 3-4 min | Register → Dashboard → Loan Wizard → Upload → Track |
| 3. Loan Officer Review | 3 min | Dashboard → Applications → Tasks → Case Instances |
| 4. Underwriter Process | 3-4 min | Dashboard → Risk Filter → SLA → Evaluation → Agreement Sign |
| 5. Admin Panel | 1 min | Users → Audit Logs |
| 6. Technical Highlights | 1 min | Case Traces → Execution Trail |
| 7. Conclusion | 30 sec | Home page |

### Option B: Role-Based Short Videos (2-4 min each)

Create separate videos for targeted audiences:
- **Video 1:** Borrower Experience (3-4 min)
- **Video 2:** Loan Officer Workflow (3 min)
- **Video 3:** Underwriter Analysis (3-4 min)
- **Video 4:** Admin & Technical (2 min)

---

## 📝 Detailed Recording Script & Transcript

### Section 1: Introduction (1 minute)

**What to Record:**
1. Open browser to home page (`/`)
2. Slowly scroll through the entire page
3. Highlight: Hero section → Stats → Features → How It Works → Loan Products → Trust Section

**Transcript:**
> "Welcome to the Financial Lending Portal — an enterprise-grade lending platform powered by UiPath automation.
>
> This comprehensive system transforms the lending experience with automated workflows, AI-powered risk assessment, and real-time processing — delivering approval decisions in under 24 hours.
>
> The platform serves four key user roles:
> - **Borrowers** who apply for loans and track their applications
> - **Loan Officers** who process and verify applications
> - **Underwriters** who assess risk and make approval decisions
> - **Administrators** who manage users and monitor compliance
>
> With over $2.4 billion in loans processed and 15,000 active borrowers, let's explore how each portal works."

---

### Section 2: Borrower Journey (3-4 minutes)

#### 2.1 Registration (30 sec)

**What to Record:**
1. Click "Apply Now" → Navigate to `/borrower/register`
2. Show the registration form fields
3. Fill in sample data (or show pre-filled)
4. Click Register

**Transcript:**
> "Let's start with the Borrower experience. New users begin by creating a secure account with their personal details. The registration process is streamlined to collect only essential information."

#### 2.2 Borrower Dashboard (30 sec)

**What to Record:**
1. After login, show `/borrower/dashboard`
2. Point out: Welcome banner, Quick stats (Active Loans, Pending Applications, Total Borrowed)
3. Show Quick Action cards

**Transcript:**
> "Once logged in, the borrower dashboard provides instant visibility into your lending activity. You can see active loans, pending applications, total borrowed amount, and quick access to common actions like applying for a new loan or viewing documents."

#### 2.3 Loan Application Wizard (1 min)

**What to Record:**
1. Click "Apply for Loan" → Navigate to `/borrower/loan-request-steps`
2. Show Step 1: Personal Info form
3. Click Next → Show Step 2: Employment Status
4. Click Next → Show Step 3: Loan Terms
5. Show the step indicator at top

**Transcript:**
> "The multi-step loan application wizard guides borrowers through three key stages:
> 
> First, **Personal Information** — collecting identity and contact details.
> 
> Second, **Employment Status** — capturing income, employer, and employment type.
> 
> Third, **Loan Terms** — specifying the loan amount, purpose, and repayment preferences.
> 
> The backend manages application state automatically, so borrowers can save progress and resume later without losing any data."

#### 2.4 Document Upload (30 sec)

**What to Record:**
1. After submission, show `/borrower/upload-documents`
2. Show document categories
3. Demonstrate file upload (drag & drop or click)

**Transcript:**
> "After submitting the application, borrowers are prompted to upload required documents. The system supports multiple file types and provides AI-assisted verification to ensure documents meet requirements before submission."

#### 2.5 Loan Details & Tracking (30 sec)

**What to Record:**
1. Navigate to `/borrower/loan-details/:loanId`
2. Show application status timeline
3. Show loan details card

**Transcript:**
> "Borrowers can track their application status in real-time through the loan details page. Every stage of the process is visible — from initial submission through document verification, underwriting review, and final approval."

---

### Section 3: Loan Officer Portal (3 minutes)

#### 3.1 Dashboard Overview (45 sec)

**What to Record:**
1. Login as Loan Officer → `/lender-login` → `/lender/dashboard`
2. Show the 4-tab navigation: Dashboard, Loan Applications, Pending Tasks, Case Instances
3. Highlight KPI cards: Total Applications, Tasks Pending, Scrutiny Pending, Submitted, Approved
4. Show Financial Summary cards
5. Point out Application Trends chart and Borrower Distribution pie chart

**Transcript:**
> "Switching to the Loan Officer portal. The dashboard provides a comprehensive operational view with key performance indicators at a glance.
>
> Officers can monitor total applications, pending tasks, scrutiny items, and approval counts. The financial summary shows portfolio value and average loan size.
>
> Interactive charts reveal application trends over the week and borrower distribution patterns — helping officers identify workload patterns and prioritize effectively."

#### 3.2 Loan Applications Tab (45 sec)

**What to Record:**
1. Click "Loan Applications" tab
2. Show the worklist table with all columns
3. Demonstrate search by borrower name
4. Show status filter dropdown
5. Show case instance state filter
6. Click "Review" button on a loan

**Transcript:**
> "The Loan Applications tab provides a powerful worklist table with advanced filtering. Officers can search by case ID or borrower name, filter by application status, and even filter by the underlying UiPath case instance state.
>
> Each row shows the case ID, borrower name, requested date, amount, current status, and execution state — enabling quick triage and review."

#### 3.3 Pending Tasks Tab (30 sec)

**What to Record:**
1. Click "Pending Tasks" tab
2. Show priority badges (High/Medium/Low)
3. Show days pending indicator
4. Click "Review Now" button

**Transcript:**
> "The Pending Tasks tab surfaces action items from UiPath's Action Center and Maestro interfaces, prioritized by urgency. High-priority tasks that have been pending longest appear first, with direct links to review the associated case."

#### 3.4 Case Instances Tab (30 sec)

**What to Record:**
1. Click "Case Instances Summary" tab
2. Show process summary cards (Pending/Running/Completed/Paused/Cancelled/Faulted)
3. Show execution status table below

**Transcript:**
> "The Case Instances tab provides real-time visibility into workflow execution. Process summary cards show counts by state, while the execution table tracks individual case instances with their current run status — Running, Completed, Paused, or Faulted."

---

### Section 4: Underwriter Portal (3-4 minutes)

#### 4.1 Dashboard Overview (1 min)

**What to Record:**
1. Login as Underwriter → `/lender-login` → `/underwriter/dashboard`
2. Show 5-tab navigation
3. Highlight 8 KPI cards (scroll across)
4. Show 4 Financial Summary cards
5. Show Risk Distribution pie chart
6. Show Status Distribution bar chart
7. Show SLA data if available

**Transcript:**
> "The Underwriter dashboard expands with risk-focused analytics. Eight KPI cards track total applications, pending tasks, signature pending count, approvals, rejections, approval rate, average processing time, and high-risk cases.
>
> The financial summary shows total portfolio value, approved amounts, average loan size, and rejection rate.
>
> The risk distribution chart — powered by AI cognitive data analysis — categorizes applications as Low, Medium, or High risk, enabling underwriters to prioritize their review queue effectively."

#### 4.2 Loan Applications with Risk Filter (45 sec)

**What to Record:**
1. Click "Loan Applications" tab
2. Show the advanced filter panel
3. Filter by Risk Level → Select "High"
4. Show filtered results
5. Show risk level badges in table

**Transcript:**
> "Underwriters can filter applications by risk level — a capability unique to this role. Filtering by High Risk immediately surfaces cases requiring the most scrutiny. Each row displays the risk level badge, case status, and case instance state for comprehensive visibility."

#### 4.3 SLA Escalations Tab (30 sec)

**What to Record:**
1. Click "SLA Escalations" tab
2. Show SLA summary cards (Total Cases, Breached, Compliance %)
3. Show escalation table with breached/at-risk items

**Transcript:**
> "The SLA Escalations tab is critical for compliance monitoring. It tracks cases where service level agreements have been breached or are at risk of breach, showing the overdue duration and assigned owner for immediate escalation."

#### 4.4 Loan Evaluation (45 sec)

**What to Record:**
1. From Pending Actions, click "Review Now" → `/lender/loan-action/:loanId/:userId`
2. Show borrower information section
3. Show financial analysis section
4. Show decision buttons (Approve/Reject)

**Transcript:**
> "The loan evaluation workspace provides underwriters with comprehensive borrower information, financial analysis, and risk assessment data. Underwriters can review all submitted documents, analyze financial ratios, and make informed approval or rejection decisions."

#### 4.5 Agreement Signing (30 sec)

**What to Record:**
1. Navigate to `/underwriter/agreement-sign/:loanId/:userId`
2. Show agreement document preview
3. Show signature workflow

**Transcript:**
> "Once approved, the agreement signing process integrates electronic signature capabilities. Both borrower and underwriter signatures are captured digitally, creating a fully paperless loan closing experience."

#### 4.6 Underwriter Assistant (15 sec)

**What to Record:**
1. Show the floating chatbot widget (bottom-right)
2. Click to open the assistant
3. Show the AI chat interface

**Transcript:**
> "An AI-powered Underwriter Assistant is available on every page, providing real-time support and guidance throughout the workflow."

---

### Section 5: Admin Portal (1 minute)

#### 5.1 User Management (30 sec)

**What to Record:**
1. Navigate to `/admin/users`
2. Show user list table
3. Show add/edit/delete user actions

**Transcript:**
> "Administrators have full control over user management. They can create, update, and deactivate accounts across all user roles — Borrowers, Loan Officers, Underwriters, and other Administrators."

#### 5.2 Audit Logs (30 sec)

**What to Record:**
1. Navigate to `/admin/audit-logs`
2. Show audit log entries
3. Show filter/search capabilities

**Transcript:**
> "The Audit Log Viewer provides complete activity traceability. Every action across the platform is logged with timestamps, user identifiers, and operation details — ensuring regulatory compliance and security oversight."

---

### Section 6: Technical Highlights (1 minute)

#### 6.1 Case Traces Visualization (30 sec)

**What to Record:**
1. Open any Loan Details page → Case Traces tab
2. Show the React Flow process diagram
3. Show stage nodes with task cards
4. Show edges connecting stages

**Transcript:**
> "The platform's UiPath integration extends to visual case tracing. The Case Traces tab renders a real-time process flow diagram showing every stage and task in the loan workflow — with color-coded status indicators for completed, in-progress, and failed steps."

#### 6.2 Execution Trail (30 sec)

**What to Record:**
1. Scroll down to Execution Trail section
2. Show the table view of executed stages
3. Show expandable rows with task details

**Transcript:**
> "The Execution Trail provides a hierarchical table view of all executed stages and tasks, with status icons, timestamps, and rework indicators — giving complete visibility into the automation history of each case."

---

### Section 7: Conclusion (30 seconds)

**What to Record:**
1. Return to home page
2. Show the CTA section at bottom

**Transcript:**
> "The Financial Lending Portal delivers end-to-end lending automation with intelligent workflows, real-time analytics, and enterprise-grade security.
>
> From application to approval, every stakeholder has the tools they need for efficient, transparent, and compliant lending.
>
> Thank you for watching."

---

## 🎯 Step-by-Step Recording Guide

### Pre-Recording Checklist

- [ ] **Clear browser cache** and open a fresh incognito window
- [ ] **Prepare test accounts** for all 4 roles (Borrower, Loan Officer, Underwriter, Admin)
- [ ] **Seed test data** — ensure there are loans in various statuses
- [ ] **Set browser zoom to 100%** for consistent recording
- [ ] **Set browser to 1920x1080** resolution for HD recording
- [ ] **Close unnecessary tabs** and disable notifications
- [ ] **Test microphone** if recording voiceover live
- [ ] **Prepare transcript** in a separate window for reference

### Recording Sequence

#### Step 1: Public Home Page
1. Open `http://localhost:5173/` (or your deployed URL)
2. Start recording
3. Wait 2 seconds, then slowly scroll down
4. Pause at each section for 3-4 seconds
5. Scroll to bottom, wait 2 seconds

#### Step 2: Borrower Flow
1. Click "Apply Now" → Register page
2. Fill form (or show pre-filled) → Submit
3. Login → Dashboard (pause 3 sec)
4. Click "Apply for Loan" → Show Step 1 (pause 3 sec)
5. Click Next → Step 2 (pause 3 sec)
6. Click Next → Step 3 (pause 3 sec)
7. Show Review page → Submit
8. Show Document Upload → Upload a file
9. Show Loan Details → Point out status

#### Step 3: Loan Officer Flow
1. Open new tab → Lender login
2. Login as Loan Officer → Dashboard (pause 5 sec)
3. Click "Loan Applications" tab → Show table (pause 3 sec)
4. Type in search box → Show filtering
5. Click "Pending Tasks" tab → Show tasks (pause 3 sec)
6. Click "Case Instances" tab → Show summary (pause 3 sec)
7. Click "Review" on any loan → Show details page

#### Step 4: Underwriter Flow
1. Open new tab → Lender login
2. Login as Underwriter → Dashboard (pause 5 sec)
3. Scroll through all charts (pause 3 sec each)
4. Click "Loan Applications" → Filter by High Risk
5. Click "SLA Escalations" → Show data
6. Click "Pending Actions" → Click "Review Now"
7. Show Evaluation page → Point out sections
8. Show Agreement Signing page
9. Click Underwriter Assistant widget → Show chat

#### Step 5: Admin Flow
1. Navigate to `/admin/users` → Show table (pause 3 sec)
2. Navigate to `/admin/audit-logs` → Show entries (pause 3 sec)

#### Step 6: Technical Features
1. Open any Loan Details → Case Traces tab (pause 5 sec)
2. Zoom into the process diagram
3. Scroll to Execution Trail (pause 3 sec)

#### Step 7: Conclusion
1. Return to home page
2. Show bottom CTA section
3. Wait 2 seconds, then stop recording

---

## 🤖 AI Tools for Video Creation

### Can Any Free AI Tool Do the WHOLE Recording Automatically?

**Short answer: No single free AI tool can fully automate screen recording + narration + editing end-to-end.** However, here's the closest free workflow:

### Best FREE Combination

| Step | Tool | Cost | What It Does |
|------|------|------|--------------|
| **Screen Recording** | [OBS Studio](https://obsproject.com/) | 100% Free | Records screen + webcam + audio |
| **AI Voiceover** | [ElevenLabs](https://elevenlabs.io/) | Free: 10K chars/month | Natural AI voice from text |
| **AI Voiceover (unlimited)** | [Edge TTS](https://github.com/rany2/edge-tts) | 100% Free | Microsoft's TTS engine |
| **Video Editing** | [CapCut Desktop](https://www.capcut.com/) | Free | Auto-captions, transitions, trimming |
| **Video Editing (pro)** | [DaVinci Resolve](https://www.blackmagicdesign.com/products/davinciresolve) | Free | Professional-grade editing |
| **Auto Subtitles** | [Veed.io](https://www.veed.io/) | Free tier (watermark) | AI-generated captions |

### Closest "One-Click" Free Options

| Tool | Free Tier Limits | Best For |
|------|-----------------|----------|
| **Loom** | 5 min per video, 25 videos | Quick screen recordings with auto-transcription |
| **Clipchamp** | Built into Windows 11, watermark on export | Screen recording + basic editing |
| **Canva Video** | Limited templates, watermark | Template-based video creation |
| **InVideo AI** | 10 min/week, watermark | Script → Video with stock footage |
| **Pictory** | 3 videos/month, watermark | Script-to-video automation |
| **Synthesia** | Paid only ($22/mo) | AI avatar + voiceover |

### Recommended FREE Workflow

1. **Record** screen with OBS Studio (follow the script above)
2. **Generate voiceover** with Edge TTS (completely free, no limits):
   ```bash
   # Install: pip install edge-tts
   edge-tts --voice "en-US-GuyNeural" --text "Your transcript here" --write-media output.mp3
   ```
3. **Edit** in CapCut Desktop:
   - Import screen recording + voiceover
   - Auto-generate captions
   - Add transitions between sections
   - Export at 1080p

### Recommended PAID Workflow (Best Quality)

1. **Synthesia** ($22/mo): Paste transcript → AI avatar reads it with your screen recordings as B-roll
2. **Descript** ($12/mo): Edit video like a document, AI voice cloning, auto-captions
3. **Pictory** ($19/mo): Script → Video with automatic scene selection

---

## 💡 Recording Tips

### Visual Quality
- ✅ Use **1920x1080** resolution minimum
- ✅ Set browser zoom to **100%** (Ctrl+0)
- ✅ Use a **clean browser profile** (no bookmarks bar, no extensions visible)
- ✅ Use **dark mode** navbar if available for contrast
- ✅ Add **cursor highlights** (OBS plugin or post-production)

### Audio Quality
- ✅ Use a **USB microphone** or phone voice memo (better than laptop mic)
- ✅ Record in a **quiet room** with soft furnishings (reduces echo)
- ✅ Speak at **150 words per minute** (natural pace)
- ✅ Add **background music** at 10-15% volume (royalty-free)

### Pacing
- ✅ **Pause 2-3 seconds** between actions (easier to edit)
- ✅ **Hold on important elements** for 4-5 seconds
- ✅ **Zoom in** on small text/buttons during editing
- ✅ **Total video length**: 12-15 minutes max

### Post-Production
- ✅ Add **chapter markers** for each section
- ✅ Add **text callouts** for key features
- ✅ Add **smooth transitions** (fade or slide)
- ✅ Add **background music** (royalty-free from YouTube Audio Library)
- ✅ Export at **1080p, 30fps, H.264**

---

## 📁 File Structure Reference

```
FinancialLendingPortal/
├── docs/
│   └── VIDEO_DEMO_GUIDE.md          ← This file
├── src/
│   ├── pages/
│   │   ├── Home.tsx                  ← Public landing page
│   │   ├── Borrower/
│   │   │   ├── Auth/
│   │   │   │   ├── BorrowerLogin.tsx
│   │   │   │   └── BorrowerRegister.tsx
│   │   │   ├── Dashboard/
│   │   │   │   └── Dashboard.tsx
│   │   │   ├── LoanSteps/
│   │   │   │   └── LoanApplicationWizard.tsx
│   │   │   ├── PersonalInfo/
│   │   │   │   └── PersonalInfoStep.tsx
│   │   │   ├── EmploymentStatus/
│   │   │   │   └── EmploymentStep.tsx
│   │   │   ├── LoanApplication/
│   │   │   │   └── LoanTermsStep.tsx
│   │   │   ├── ReviewPage/
│   │   │   │   └── BorrowerReviewPage.tsx
│   │   │   ├── UploadDocuments/
│   │   │   │   ├── UploadDocumentsPage.tsx
│   │   │   │   └── DocumentReuploadPage.tsx
│   │   │   ├── ViewDocumentsPage/
│   │   │   │   └── ViewDocumentsPage.tsx
│   │   │   └── LoanDetails/
│   │   │       └── LoanDetailsPage.tsx
│   │   ├── Lender/
│   │   │   ├── Auth/
│   │   │   │   └── LenderLogin.tsx
│   │   │   ├── LoanOfficer/
│   │   │   │   ├── LoanOfficerDashbaord.tsx
│   │   │   │   └── LoanDetailsPage.tsx
│   │   │   ├── Underwriter/
│   │   │   │   ├── Dashboard/
│   │   │   │   │   └── UnderwriterDashboard.tsx
│   │   │   │   ├── LoanDetailsPage/
│   │   │   │   │   └── UnderwriterLoanDetailsPage.tsx
│   │   │   │   └── ActionPage/
│   │   │   │       ├── UnderwriterAgreementSignPage.tsx
│   │   │   │       └── UnderwriterEvaluation.tsx
│   │   │   └── CaseServices/
│   │   │       ├── CaseTracesTab.tsx
│   │   │       ├── caseTraceService.ts
│   │   │       ├── taskService.ts
│   │   │       └── types.ts
│   │   └── Admin/
│   │       ├── UserManagement/
│   │       │   └── UserManagementPage.tsx
│   │       └── AuditLog/
│   │           └── AuditLogViewerPage.tsx
│   └── components/
│       ├── UiPath/
│       │   └── UiPathAssistant.tsx     ← AI chatbot widget
│       └── UI/
│           └── ExecutionTrail.tsx      ← Execution trail component
└── .env                                ← Environment variables
```

---

## 🚀 Quick Start Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📞 Support

For questions about this demo guide or the Financial Lending Portal, refer to:
- `docs/DEVELOPMENT_HANDOFF.md` - Development documentation
- `docs/PROJECT_DOCUMENTATION.md` - Full project documentation
- `README.md` - Getting started guide

---

*Generated for Financial Lending Portal - Video Demo Creation*
*Last Updated: April 8, 2026*