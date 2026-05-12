# Financial Lending Portal - Unified System Overview & Guide

## 1. Executive Summary

The Financial Lending Portal is a comprehensive, multi-persona web application built with **React**, **TypeScript**, and **Vite**. It orchestrates complex lending workflows by tying together a central REST backend, a fully functioning frontend interface, and dynamic integrations with **UiPath SDK** (for process state and case data) along with **DocuSeal** (for secure e-signing). 

The platform supports four distinct user profiles out of the box:
- **Borrowers**: Customers looking to apply for loans, submit documents, and sign finalized agreements.
- **Admin**: System operators who manage users, configure capabilities, and monitor system-wide **Audit Logs**.
- **Loan Officers**: Front-line staff who review initial applications and ensure loan scrutiny rules and basic documents are validated. Monitors & manages case instance execution.
- **Underwriters**: Decision-makers who monitor case instance execution & review cases for final approval, manage sla, and counter-sign the final agreement.

## 2. System Architecture

### 2.1 Core Stack
- **Frontend Framework**: React 19 + TypeScript + Vite.
- **Routing**: `react-router-dom` using declarative layouts per persona.
- **Styling**: Vanilla CSS, Tailwind CSS for utility-first responsive layout, and structured design tokens for deep dark-mode support and fluid UI state.
- **Charts / Dataviz**: `Chart.js` & `Recharts` for interactive dashboards.

### 2.2 Integration Partners
- **UiPath SDK**: The application natively authenticates system users (Lenders, Underwriters, Admins) using UiPath OAuth. It leverages UiPath Entity storage to look up roles, system settings, and tasks.
- **System Backend (REST)**: Borrows authentication tokens through local JWT. It primarily manages  loan application, docs (driving license, paystubs, agreements) and borrower onboarding APIs.
- **DocuSeal**: Integrated into loan agreement signing to embed signing forms natively.

### 2.3 Authentication Models
The project operates with two simultaneous authentication loops depending on context:
1. **Borrower Auth Context**: Powered by local `localStorage` storing JWTs from system login/registration modules. Server handlles authentication mechanism. Server uses UiPath Confidential Authentication App for Authenticating sdk then uses Typescript sdk services to validate user credentials and generates jwt token.
2. **Lender Auth Context**: Powered by `sessionStorage` tokens bound to UiPath typescript SDK. App guards block cross-persona routing. Lender authentication is handled on the portal itself by sdk. SDK uses UiPath non confidential authentication app for SSO login (browser based authentication & redirection to portal).

## 3. Navigation & App Structure

The platform implements strict structural routing to ensure robust isolation of personas.

- `/borrower/*` : Encompasses registration (`/register`), application wizard (`/loan-request-steps`), dashboard logic (`/dashboard`), and custom document upload portals (`/reupload-documents`).
- `/lender/*` : Standard path for both Underwriter and Loan Officer dashboards, dynamically switching depending on their underlying UiPath role.
  - `/lender/loan-details/...` - Base interface to review cases.
- `/underwriter/*` : Paths explicitly hardcoded for underwriter evaluation layouts and e-signature actions (`/underwriter/agreement-sign/:loanId`).
- `/admin/*` : Restricted access path for:
  - `/admin/users` (Managing role assignments)
  - `/admin/audit-logs` (Inspecting rich Audit Log tables)

## 4. Key Systems and Capabilities

### 4.1 Case Traces & Execution Trail
The application features a unique recursive UI visualization system known as the **Execution Trail**.
- Renders hierarchical log traces of background jobs and UiPath orchestration flows.
- Visual threading to distinguish parallel tasks or rework loops.
- Used heavily in the `CaseServices` section and Underwriter dashboard to track step-by-step progress and decision latency.
- Command center to monitor & manage case execution. 

### 4.2 Application Audit Logs
- Every significant state change (Role changes, Task completion, Auth Events) registers an Audit Event.
- The **Audit Log Viewer** dynamically presents timelines of events with detailed "Old Value vs. New Value" matrices.
- Enables complete traceability, an explicit requirement for financial systems.

### 4.3 Interactive Dashboards
Dashboards utilize state-of-the-art charting and dynamic real-estate division.
- *Underwriter Dashboard* visualizes insights of loan applications, pending tasks, compliance escalations, active application counts, and SLA checks. Pending tasks & SLA escaltion data fetched from maestro applications data from data fabric using sdk.
- *Loan Officer Dashboard* visualizes loan applications analytics insights, pending tasks, case instances execution statuses, handles high-velocity application lists directly pulled from `FLCMLoanApplications` UiPath entity stores.

### 4.4 Loan Details Section
Its a decision cockpit for loan application cases.
- Loan Details section is _Command Center_ for both **Loan Officer** & **Underwriter**.
- Displays loan application data & documents.
- Allows live case instance monitoring & controlling. _Execution Trail_ gives visibility to tasks execution details. Provides capability to pause,resume, cancel, ReOpen case instance.
- Dispalys pending action for both **Loan Officer** & **Underwriter** and allows to complete action from portal itself without visiting UiPath Platform. 

## 5. Development & Contribution Guide

### Pre-requisites
- Node.js environment (v20+ recommended).
- Set up a robust `.env` matching provided `import.meta.env` references: `VITE_UIPATH_CLIENT_ID`, `VITE_UIPATH_BASE_URL`, `VITE_API_BASE_URL`, etc.

### Running Setup
```bash
npm install
npm run dev
```

### Extending Personas
When adding new routes for a specific persona:
1. Wrap new pages inside `src/pages/{persona}/`.
2. Connect them to lazy loading imports inside `App.tsx`.
3. Wrap explicit route elements with `<ProtectedRoute allowedRole="{persona}" />`. This enforces security context boundaries.

### State & Caching Data
Whenever altering Application data, aim to:
1. Rely on specific API classes located under `src/api/borrower/get.ts` or similar mapped endpoints.
2. Ensure you handle `try...catch` gracefully, outputting standard error modal logic or Toast notifications included in standard layout wrappers.

---
**Maintained By:** AcceliFinance Team.
**Updated:** 2026-04-15
