# Financial Lending Portal Documentation

## 1. Overview

This project is a **React + TypeScript + Vite** frontend for a lending workflow application with four user personas:

- **Borrower**
- **Loan Officer**
- **Underwriter**
- **Admin**

The application is a hybrid system:

- **Borrower features** mostly use a custom REST backend through `axios`.
- **Officer/Underwriter features** rely heavily on the **UiPath SDK** and UiPath Data Service / Maestro(Case & Task).
- **Agreement signing** uses **DocuSeal**

This means the app is not a purely standard React CRUD app. It is a workflow-driven portal whose UI is split between:

1. direct backend API calls,
2. UiPath OAuth authentication,
3. UiPath entity/case/task data access,
4. embedded signing experiences.

---

## 2. Tech Stack

### Frontend

- React 19 [UI library for building component-based interfaces]
- TypeScript [Type-safe development with static type checking]
- Vite [Fast build tool and dev server for development and production]
- React Router DOM [Client-side routing for multi-page navigation between Borrower/Officer/Underwriter/Admin pages]
- Tailwind CSS [Utility-first CSS framework for consistent styling across the portal]
- lucide-react [Icon library for UI components and visual indicators]

### Data / API / Workflow

- Axios [HTTP client for REST API calls to custom backend for borrower operations]
- `@uipath/uipath-typescript` [UiPath SDK for OAuth authentication, Data Service access, and workflow integration]
- UiPath Entities service [Data Service for retrieving business objects like Loan Applications, Personal Info, Employment Data]
- UiPath Case Instances service [Case management and workflow status tracking for lending process orchestration]
- UiPath Tasks service [Task assignment and status management within case instances]
- `@tanstack/react-query` [Server state management and data fetching with caching for improved performance]

### Validation / UI / Charts

- Joi [Schema validation library for form inputs and data validation across borrower and staff workflows]
- Chart.js + `react-chartjs-2` [Dashboard charts for loan trends, weekly requests visualization, and borrower distribution analysis]
- Recharts [Alternative charting library for data visualization and analytics display]

### Document / Signature

- `@docuseal/react` [Digital document signing and agreement management for borrower and lender agreement workflows]
- `@opensign/react` [Custom type declarations for document handling and signature integration]
- react-signature-canvas [Canvas-based signature capture for document signing]
- jwt-decode [JWT token decoding for extracting user information from authentication tokens]

### Workflow Visualization

- reactflow [Workflow diagram and execution trail visualization for process transparency]

---

## 3. High-Level Architecture

## Frontend structure

- `src/App.tsx` – app composition and route map
- `src/main.tsx` – React bootstrap
- `src/context/useAuth.tsx` – borrower auth state
- `src/context/UiPathAuthContext.tsx` – officer/underwriter auth state via UiPath SDK
- `src/api/borrower/*` – backend REST wrappers
- `src/pages/Borrower/*` – borrower journey
- `src/pages/Lender/LoanOfficer/*` – loan officer journey
- `src/pages/Lender/Underwriter/*` – underwriter journey
- `src/pages/Admin/*` – admin user management and audit logging
- `src/components/*` – shared UI, layout, auth guards
- `src/validations/*` – Joi schemas used by forms

## Logical split by persona

### Borrower side

- local app auth token in `localStorage`
- uses backend REST endpoints
- submits profile, employment, loan application, documents
- tracks progress/status
- signs agreement through DocuSeal

### Officer / Underwriter side

- authenticates through UiPath OAuth
- gets role from UiPath Data Service entity records
- reads loan/profile/employment data mostly from UiPath Entities
- views workflow items and acts based on case state
- underwriter counter-signs agreement through DocuSeal-related backend endpoints

---

## 4. Routing Map

Defined in `src/App.tsx`.

### Public routes

- `/` → `Home`
- `/borrower/login` → borrower login
- `/borrower/register` → borrower registration
- `/lender-login` → officer/underwriter login
- `/access-denied` → forbidden page

### Borrower protected routes

Protected by `ProtectedRoute allowedRole="Borrower"`

- `/borrower/dashboard`
- `/borrower/home`
- `/borrower/loan-request-steps`
- `/borrower/review`
- `/borrower/upload-documents`
- `/borrower/view-documents`
- `/borrower/loan-details/:loanId`

### Officer protected routes

Protected by `ProtectedRoute allowedRole="Officer"`

- `/lender/dashboard`
- `/lender/loan-action/:loanId/:borrowerId/:caseNumber`

Note: the inspected `LoanActionPage` reads only `loanId` and `borrowerId` from params, even though the route passes `caseNumber` too.

### Underwriter protected routes

Protected by `ProtectedRoute allowedRole="Underwriter"`

- `/underwriter/dashboard`
- `/underwriter/loan-details/:loanId/:borrowerId/:caseNumber`
- `/underwriter/agreement-sign/:loanId/:userId`
- `/lender/loan-action/:loanId/:userId` (legacy route, maintained for backwards compatibility)

### Admin protected routes

Protected by `ProtectedRoute allowedRole="Admin"`

- `/admin/users` → user management and role assignment
- `/admin/audit-logs` → system-wide audit logging and trace monitoring

---

## 5. Authentication Model

This app has **two separate authentication systems**.

## 5.1 Borrower authentication

Implemented in `src/context/useAuth.tsx`.

### Storage

- token stored in `localStorage` under `borrower_token`
- borrower id also stored in `localStorage` under `borrowerId`

### Behavior

- on provider mount, the app tries to restore the borrower session from `borrower_token`
- JWT is decoded using `jwt-decode`
- decoded `guid` becomes `userId` / `borrowerId`

### Exposed context API

- `isAuthenticated`
- `userId`
- `borrowerId`
- `role` (currently only `borrower` or `null`)
- `borrowerLogin(token)`
- `borrowerLogout()`
- `handleBorrowerId(id)`

### Important note

`borrowerLogout()` uses `localStorage.clear()`, which clears all local storage keys, not only borrower-specific keys.

---

## 5.2 Officer / Underwriter authentication

Implemented in `src/context/UiPathAuthContext.tsx`.

### Provider responsibilities

- initialize UiPath SDK with environment config
- complete OAuth callback if present
- initialize SDK session
- decode UiPath token from session storage
- fetch current user's role from UiPath Data Service entity
- expose unified auth state to UI

### Storage

- token key format: `uipath_sdk_user_token-${clientId}`
- uses `sessionStorage`

### Role resolution

After authentication:

1. token is decoded to obtain user email/name
2. app fetches all Data Service entities
3. it finds entity name from `import.meta.env.ROLE_ENTITY_NAME`
4. it loads all records from that entity
5. it matches record email with logged-in email
6. it maps role values:
   - `lender` → `Officer`
   - `underwriter` → `Underwriter`
   - anything else → `Viewer`

### Exposed context API

- `isAuthenticated`
- `isLoading`
- `sdk`
- `login()`
- `logout()`
- `user`
- `error`
- `roleLender`

### Important note

This auth context imports `getLenderRoleByEmail` but the inspected code does not actually use it for final role assignment.

---

## 6. Authorization and Route Protection

Implemented in `src/components/Auth/ProtectedRoute.tsx`.

### Logic

- waits for both auth providers to finish loading
- if borrower route: checks borrower auth only
- if officer/underwriter route: checks UiPath auth and exact role match
- unauthorized lender staff is redirected to `/access-denied`
- unauthenticated lender staff goes to `/lender-login`
- unauthenticated borrower goes to `/borrower/login`

This is a clean central guard, but it depends on the correctness of both auth contexts.

---

## 7. Environment Variables Used

The following variable names are referenced in code.

### UiPath SDK config

- `VITE_UIPATH_CLIENT_ID`
- `VITE_UIPATH_ORG_NAME`
- `VITE_UIPATH_TENANT_NAME`
- `VITE_UIPATH_BASE_URL`
- `VITE_UIPATH_REDIRECT_URI`
- `VITE_UIPATH_SCOPE`

### Backend / document services

- `VITE_API_BASE_URL`
- `VITE_API_URL`
- `VITE_LENDER_EMAIL`

### UiPath data service / role lookup

- `ROLE_ENTITY_NAME`

### Observations

- Most API modules default to `https://finance-process-app-server-1.onrender.com` when `VITE_API_BASE_URL` is missing.
- `UnderwriterEvaluation.tsx` uses `VITE_API_URL`, not `VITE_API_BASE_URL`, so backend base URLs are not fully standardized.

---

## 8. API Layer Documentation

Located under `src/api/borrower`.

## 8.1 `get.ts`

### Borrower read endpoints

- `getBorrowerProfile(borrowerId)`
- `getEmploymentInfo(borrowerId)`
- `getLoanApplication(borrowerId)`
- `getLoanById(loanId)`
- `getBorrowerProgress(borrowerId)`
- `getBorrowerDocuments(CaseId)`
- `getBorrowerStage(borrowerId)`


### Notable behavior

- `getBorrowerDocuments` rewrites relative document URLs into absolute URLs using backend base URL.
- Error handling is simplified; most functions return `{ success: false, message: ... }` without detailed backend diagnostics.

## 8.2 `post.ts`

### Authentication

- `registerBorrower(email, password)`
- `loginBorrower(email, password)`

### Borrower onboarding workflow

- `submitBorrowerProfile(payload)`
- `submitEmploymentInfo(payload)`
- `submitLoanApplication(payload)`

### Documents

- `uploadBorrowerDocuments(UserId, CaseNumber, DriversLicense?, PayStub?)`
- `uploadLoanAgreement(CaseNumber, LoanAgreement)`

### Stage tracking

- `createBorrowerStages(payload)`

## 8.3 `put.ts`

- `updateBorrrowerStages(borrowerId, stage)`
- `updateLoanStatus(loanId, status)`

### Observations

- `updateLoanStatus` hits a lender endpoint from borrower API module.
- `updateBorrrowerStages` has a typo in the function name (`Borrrower`).

## 8.4 `src/api/lender/get.ts`

The inspected file appears empty. This suggests lender API access was either migrated to UiPath SDK usage or never completed.

---

## 9. Borrower Journey

## 9.1 Registration and login

Files:

- `src/pages/Borrower/Auth/BorrowerRegister.tsx`
- `src/pages/Borrower/Auth/BorrowerLogin.tsx`

### Register flow

1. validate input with `registerSchema`
2. call `registerBorrower`
3. save returned token via `borrowerLogin`
4. redirect to `/borrower/home`

### Login flow

1. validate input with `loginSchema`
2. call `loginBorrower`
3. save token via `borrowerLogin`
4. fetch borrower progress
5. store `borrowerId`
6. redirect to `/borrower/home`

## 9.2 Borrower home

`src/pages/Home.tsx` acts as a landing page and session-aware launcher.

It:

- detects any existing borrower/lender session
- shows role-aware action buttons
- routes borrowers to application flow or dashboard
- routes officers/underwriters to the correct dashboard based on resolved role

## 9.3 Loan application wizard

File: `src/pages/Borrower/LoanSteps/LoanApplicationWizard.tsx`

Steps:

1. Personal info
2. Employment info
3. Loan terms

### Initialization behavior

- fetches borrower progress from backend
- preloads profile and employment data into local form state
- currently forces `setStep(1)` regardless of backend `nextStep`

This means resume logic seems only partially implemented.

## 9.4 Borrower dashboard

File: `src/pages/Borrower/Dashboard/Dashboard.tsx`

### What it shows

- welcome banner using borrower profile
- counts of submitted / approved / in review loans
- average loan value
- pie chart summary
- loan table with case id, amount, status, and action button

### Pending borrower tasks recognized

- `Agreement Sign Pending`
- `Documents Reupload`

These drive action badges in the dashboard.

## 9.5 Loan details page

File: `src/pages/Borrower/LoanDetails/LoanDetailsPage.tsx`

### Responsibilities

- show detailed loan data
- show profile/employment summary
- show uploaded documents
- render process timeline from status list
- expose borrower actions tab
- create DocuSeal submission for borrower signature
- fetch signed agreement PDF from backend and upload it back

### Key derived state

- `hasDocs` → both license and pay stub present
- `hasAgreement` → loan agreement uploaded
- `pendingActions` determined from `CaseStatus`

### Current action rules

- `Agreement Sign Pending` → sign agreement action
- `Documents Reupload` → re-upload action
- `Submitted` + missing docs → upload action

## 9.6 Document upload / document viewing

Routes exist for:

- `/borrower/upload-documents`
- `/borrower/view-documents`

Those files were not deeply inspected in this pass, but the rest of the app indicates they support borrower-side document management and are part of the core journey.

---

## 10. Officer Journey

## 10.1 Officer login

File: `src/pages/Lender/Auth/LenderLogin.tsx`

### Behavior

- user clicks “Sign in with UiPath”
- `login()` from `UiPathAuthContext` triggers UiPath auth init/redirect
- after auth and role resolution:
  - `Officer` → `/lender/dashboard`
  - `Underwriter` → `/underwriter/dashboard`

## 10.2 Officer dashboard

File: `src/pages/Lender/LoanOfficer/LoanOfficerDashbaord.tsx`

### Data source

UiPath Entities SDK, specifically entity:

- `FLCMLoanApplications`

### What it does

- loads all loan application records from Data Service
- performs defensive field mapping for both lowercase and uppercase field variants
- computes weekly request chart
- computes borrower distribution pie chart
- renders worklist table
- routes to loan action page for review

### Important design detail

The dashboard assumes Data Service field casing is inconsistent, so it explicitly checks both variants like `loanAmount` and `LoanAmount`.

## 10.3 Officer loan action page

File: `src/pages/Lender/LoanOfficer/LoanDetailsPage.tsx`

### Responsibilities

- fetch loan record from `FLCMLoanApplications`
- fetch borrower profile from `FLCMPersonalInfo`
- fetch employment data from `FLCMEmploymentData`
- fetch case details/stages from UiPath Case Instances
- detect an actionable task from returned stages
- fetch borrower documents from backend using `CaseId`
- display details / documents tabs

### Important note

The page contains scaffolding for workflow actions, but the visible action buttons are commented out. So this page is partly operational as a review surface and partly unfinished as an action console.

---

## 11. Underwriter Journey

## 11.1 Underwriter dashboard

File: `src/pages/Lender/Underwriter/Dashboard/UnderwriterDashboard.tsx`

### Data source

UiPath Entities SDK entity:

- `FLCMLoanApplications`

### What it does

- loads all loans from Data Service
- groups them by `UserId`
- displays grouped queue by applicant
- expands a borrower row to show loan cards
- navigates to the evaluation page for a selected loan

### Dashboard metrics

- total applicants
- total loans
- pending underwriting count where `CaseStatus === "UNDERWRITER_REVIEW"`

## 11.2 Underwriter evaluation page

File: `src/pages/Lender/Underwriter/ActionPage/UnderwriterEvaluation.tsx`

### Responsibilities

- load loan, profile, employment, and documents
- determine whether borrower signed agreement
- determine whether lender/underwriter signature is still needed
- create lender DocuSeal submission through backend
- handle signature completion callback
- call backend to upload lender-signed agreement

### Derived workflow logic

- `borrowerSigned` = loan agreement document exists
- `lenderAlreadySigned` = case status includes `AGREEMENT APPROVED`
- `lenderActionNeeded` = borrower signed AND lender not yet signed

### Observed workflow assumption

The app uses **document presence + status string** together to infer business state, not just one canonical workflow source.

---

## 12. Shared UI Components

## `Button.tsx`

Simple wrapper supporting:

- `variant`: `primary | secondary`
- `loading`
- passthrough button HTML props

Behavior:

- disables itself when `disabled || loading`
- replaces content with `Loading...` when loading

Other UI components exist (`Card`, `Input`, `Modal`, `Select`, `StatBox`, `TextArea`) and are likely general-purpose wrappers used for styling consistency.

## `Navbar.tsx`

Responsibilities:

- show logo and portal label
- display current borrower or staff identity
- show login / logout options
- infer lender presence from local storage UiPath token key

### Observations

- borrower and lender session state are merged visually here
- local component state `role` is set but not actually rendered meaningfully in current code

## `Footer.tsx`

Static marketing/support footer with borrower links, staff links, and placeholder support data.

---

## 13. Validation Rules

## Auth validation

File: `src/validations/auth.validation.ts`

- email validation for login/register
- password requires at least 8 chars and at least one letter and one number for registration
- confirm password must match

## Borrower profile validation

File: `src/validations/borrower.validation.ts`

Validates:

- name
- DOB between 18 and 80 years old
- SSN
- phone
- address/city/state/zip
- email
- `HighestDegree`
- `Unit`
- `UserId`

## Employment validation

File: `src/validations/employment.validation.ts`

Conditional validation based on employment status.

Examples:

- salaried requires employer details and minimum monthly income of 20,000
- unemployed relaxes several employer-specific fields

## Loan validation

File: `src/validations/loan.validation.ts`

Validates:

- applicant identifiers
- request date
- borrower/requester emails
- loan amount between 1,000 and 10,000
- purpose of loan from allowed set
- case status enum

---

## 14. Data Model Inferred from UI

The exact backend schema is not documented in repo, but the frontend suggests the following major business entities.

## Borrower profile fields

- `UserId`
- `FirstName`
- `LastName`
- `DateOfBirth`
- `SSN`
- `Address`
- `City`
- `State`
- `ZipCode`
- `Unit`
- `PhoneNumber`
- `Email`
- `HighestDegree`

## Employment fields

- `UserId`
- `EmploymentStatus`
- `EmployerName`
- `YearsAtEmployer`
- `MonthlyIncome`
- `CompensationType`
- `EmployerAddress`
- `EmployerCity`
- `EmployerState`
- `EmployerZipCode`

## Loan fields

- `Id`
- `CaseId`
- `UserId`
- `BorrowerEmail`
- `LoanAmount`
- `TermOfLoan`
- `PurposeOfLoan`
- `CaseStatus`
- `RequestedOn`
- possibly `InterestRate`
- possibly `MonthlyPayment`
- possibly `TotalPayment`
- `CreateTime`

## Documents by case

- `DriversLicense`
- `PayStub`
- `LoanAgreement`

---

## 15. Business Process Flow Inferred

Based on statuses and UI logic, the intended lending lifecycle appears to be:

1. Borrower registers/logs in
2. Borrower completes personal profile
3. Borrower completes employment information
4. Borrower submits loan application
5. Borrower uploads required documents
6. Officer reviews application and documents
7. Underwriter reviews / finalizes decision
8. Borrower signs agreement
9. Lender/underwriter counter-signs agreement
10. Agreement approved
11. Case completed

Statuses seen in code include:

- `Submitted`
- `Checking Eligibility`
- `Document Review Pending`
- `Documents Verified`
- `Loan Scrutiny Pending`
- `Approved`
- `Underwriter Review Pending`
- `Agreement Sign Pending`
- `Agreement Signed`
- `Agreement Review Pending`
- `Agreement Approved`
- `Case Completed`

There are also alternative status spellings/values in other places such as:

- `UNDERWRITER_REVIEW`
- `Approve`
- `Documents Reupload`
- `Pending`
- `In Review`

This suggests status normalization is not fully standardized across the app and backend.

---

## 16. Key Inconsistencies and Risks

These are important for future development.

## 16.1 Two auth systems with different storage strategies

- borrower uses `localStorage`
- UiPath auth uses `sessionStorage`

This is workable but needs careful handling when debugging logout/session persistence.

## 16.2 Mixed data sources

The app reads from both:

- custom backend REST APIs
- UiPath Entities / Cases / Tasks

Some screens likely assume data is synchronized between both systems. If one lags, UI could become inconsistent.

## 16.3 Status strings are not standardized

Different pages check different values and formats:

- human-readable status strings
- uppercase constants
- different wording for similar stages

This is one of the biggest maintenance risks.

## 16.4 API organization is blurred

Borrower API modules contain lender-related calls, and lender API file appears empty.

## 16.5 Route shapes are inconsistent

- officer route includes `caseNumber`
- action page does not consume it
- underwriter route reuses `/lender/loan-action/...`

## 16.6 Partial or commented-out implementation

Several files contain large commented legacy sections or disabled action buttons, meaning some features are still evolving or were mid-refactor.

## 16.7 Hard-coded entity names

Several critical UiPath entity names are literal strings:

- `FLCMLoanApplications`
- `FLCMPersonalInfo`
- `FLCMEmploymentData`

If these change in UiPath, the app breaks.

---

## 17. Recommended Mental Model for Maintaining This App

When working on this codebase, think of it in five layers:

1. **Shell layer** – app startup, routing, layout
2. **Auth layer** – borrower auth vs UiPath auth
3. **Data layer** – REST backend and UiPath SDK access
4. **Workflow layer** – status strings, stage progression, tasks, case ids
5. **Document/signature layer** – uploads, generated agreement submissions, signed PDF lifecycle

If a bug appears, first determine which layer it belongs to.

Examples:

- login redirect problem → auth layer / routing layer
- missing dashboard data → data layer
- wrong button shown in actions tab → workflow layer
- signed PDF not visible → document/signature layer

---

## 18. Suggested Immediate Next Development Priorities

Without changing existing code yet, the best next priorities are:

1. **Document all status values and make a canonical enum/constant map**
2. **Standardize backend base URL variables (`VITE_API_BASE_URL` vs `VITE_API_URL`)**
3. **Separate REST API modules by domain/persona cleanly**
4. **Create shared types for Loan, Profile, Employment, Documents**
5. **Reduce commented legacy code after confirming active behavior**
6. **Normalize route parameter usage for action pages**
7. **Audit all UiPath entity names and make them configurable/constants-based**

---

## 19. Quick File-by-File Purpose Reference

### Core

- `src/main.tsx` – app mount
- `src/App.tsx` – providers + router

### Context

- `src/context/useAuth.tsx` – borrower auth
- `src/context/UiPathAuthContext.tsx` – UiPath auth + role mapping

### Guards

- `src/components/Auth/ProtectedRoute.tsx` – authorization gate

### Borrower

- `src/pages/Borrower/Auth/BorrowerLogin.tsx` – borrower login
- `src/pages/Borrower/Auth/BorrowerRegister.tsx` – borrower registration
- `src/pages/Borrower/LoanSteps/LoanApplicationWizard.tsx` – multi-step application entry
- `src/pages/Borrower/Dashboard/Dashboard.tsx` – borrower dashboard
- `src/pages/Borrower/LoanDetails/LoanDetailsPage.tsx` – detailed application status and actions

### Officer

- `src/pages/Lender/Auth/LenderLogin.tsx` – UiPath login screen
- `src/pages/Lender/LoanOfficer/LoanOfficerDashbaord.tsx` – officer worklist dashboard
- `src/pages/Lender/LoanOfficer/LoanDetailsPage.tsx` – officer review page

### Underwriter

- `src/pages/Lender/Underwriter/Dashboard/UnderwriterDashboard.tsx` – grouped evaluation queue
- `src/pages/Lender/Underwriter/ActionPage/UnderwriterEvaluation.tsx` – underwriter review + counter-sign flow

### APIs

- `src/api/borrower/get.ts` – reads
- `src/api/borrower/post.ts` – creates/uploads
- `src/api/borrower/put.ts` – updates
- `src/api/lender/get.ts` – currently empty/inactive

### Validation

- `src/validations/auth.validation.ts`
- `src/validations/borrower.validation.ts`
- `src/validations/employment.validation.ts`
- `src/validations/loan.validation.ts`

---

## 20. Final Summary

This application is a **workflow-centric lending portal** combining traditional frontend/backend communication with **UiPath-driven process orchestration**. Borrowers interact mostly through REST APIs, while staff roles depend on UiPath OAuth and Data Service. The most important maintenance challenges are **status consistency**, **mixed data sources**, **route/API organization**, and **unfinished refactor traces**.

If you take ownership of this project, the safest approach is:

- preserve current flow behavior,
- document status and entities first,
- then gradually normalize types, routes, and service boundaries.