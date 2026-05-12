# Solution & Architecture Design
**Project:** Financial Lending Portal
**Version:** 1.0

---

## 1. Executive Summary

This document describes the solution architecture of the Financial Lending Portal. The system is designed to provide a unified, automated, and secure lending experience across multiple distinct user personas (Borrower, Admin, Loan Officer, Underwriter). It bridges traditional web-based REST principles with modern Robotic Process Automation (RPA) orchestration powered by UiPath.

### The Role-Based Command Center
Overall, the Lender Portal (for Loan Officers and Underwriters) acts as the operational heartbeat of the application. For business users, the app serves as a role-based command center where they can:
- **Monitor live cases** and application state.
- **Manage tasks** and underwriting validation workflows.
- **Manage SLAs** and execution speeds.
- **View a clear, auditable timeline** of everything that has occurred natively via the Execution Trail.

---

## 2. System Context

This diagram illustrates the portal's position in the broader ecosystem, identifying the primary actors, the main web portal, and the external systems it depends on.

```mermaid
---
title: Diagram 1 - System Context Model
---
flowchart TB
    classDef actor fill:#f3f4f6,stroke:#4f46e5,stroke-width:2px,color:#1f2937,rx:20px,ry:20px;
    classDef portal fill:#4f46e5,stroke:#312e81,stroke-width:3px,color:#ffffff,rx:12px,ry:12px;
    classDef external fill:#e5e7eb,stroke:#9ca3af,stroke-width:2px,color:#374151,stroke-dasharray: 4 4;

    subgraph Actors ["User Personas"]
        direction LR
        B([Borrower]):::actor
        O([Loan Officer]):::actor
        U([Underwriter]):::actor
        A([Admin]):::actor
    end

    SYS["Financial Lending Portal<br/>(React/Vite Web App)"]:::portal

    subgraph Externals ["External Services & APIs"]
        direction LR
        REST["Custom REST API<br/>(Data Fabric & Setup)"]:::external
        UIPATH["UiPath Cloud<br/>(Orchestration)"]:::external
        DOCU["DocuSeal<br/>(eSignatures)"]:::external
    end

    B -->|Applies & Tracks| SYS
    O -->|Reviews Applications| SYS
    U -->|Approves Loans| SYS
    A -->|Monitors Audit Logs| SYS

    SYS <-->|Stores Docs & Auth| REST
    SYS <-->|Runs Workflows| UIPATH
    SYS <-->|Requests Signatures| DOCU
```

---

## 3. High-Level System Architecture

The ecosystem relies on an event-driven and API-driven hybrid architecture. The diagram below details how specific frontend chunks talk directly to their respective backend integrations based on their operational domains.

```mermaid
---
title: Diagram 2 - High-Level System Architecture
---
flowchart LR
    classDef ui fill:#bfdbfe,stroke:#2563eb,stroke-width:2px,color:#1e3a8a,rx:8px,ry:8px;
    classDef server fill:#d1fae5,stroke:#059669,stroke-width:2px,color:#064e3b,rx:8px,ry:8px;
    classDef cloud fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#78350f,rx:8px,ry:8px;
    classDef external fill:#e5e7eb,stroke:#9ca3af,stroke-width:2px,color:#374151,stroke-dasharray: 4 4;

    subgraph Frontend["Frontend Layer (React 19)"]
        direction TB
        B_UI["Borrower Portal"]:::ui
        L_UI["Lender Portal (Loan Officer/Underwriter)"]:::ui
        A_UI["Admin Portal"]:::ui
        AuthC["Auth Context Providers"]:::ui
    end

    subgraph Backend["Custom Backend Services"]
        direction TB
        REST["REST API"]:::server
    end

    subgraph UiPath["UiPath Cloud Infrastructure"]
        direction TB
        U_OAUTH["OAuth Server"]:::cloud
        U_DATA["Data Fabric"]:::cloud
        U_MAESTRO["Maestro (Cases & Instances)"]:::cloud
        U_CASE["Action Center (Tasks)"]:::cloud
    end

    subgraph ThirdParty["3rd Party Services"]
        DOCU["DocuSeal API"]:::external
    end

    %% Connections
    B_UI <-->|"JWT Auth / Documents"| REST
    REST <-->|"Uploads Docs & App Data"| U_DATA
    B_UI <-->|"Embedded eSignatures"| DOCU
    
    L_UI <-->|"OAuth Token"| U_OAUTH
    L_UI <-->|"Entity Read/Write"| U_DATA
    L_UI <-->|"Task Tracking"| U_CASE
    L_UI <-->|"Manage SLAs & Live Cases"| U_MAESTRO
    L_UI <-->|"Embedded eSignatures"| DOCU
    
    A_UI <-->|"Audit Logs & Roles"| U_DATA
```

### Key Components
1.  **Frontend Layer**: Built using React 19, TypeScript, and Vite. Leverages `react-router-dom` for strict RBAC routing and extensive code-splitting for performance.
2.  **Custom REST Backend**: Specifically serves the Borrower Portal (registration, application intake, and document uploads). It communicates directly with UiPath Data Fabric. **All application data and documents are stored exclusively in Data Fabric** (no independent databases).
3.  **UiPath Cloud Ecosystem**: The "brain" of the operation for staff personas. **Maestro** manages live cases, SLAs, and case progress tracking. **Action Center** handles human-in-the-loop task state progression, while centralized schemas (like `FLCMLoanApplications`) are stored in the Data Service.
4.  **DocuSeal**: Injected as an iframe/SDK for securely gathering digital signatures compliant with financial regulations.

---

## 4. Authentication & Security Model

The system employs a dual-authentication topology to ensure perfect segregation of privileges between clients (borrowers) and internal staff.

```mermaid
sequenceDiagram
    title Diagram 3: Authentication & Security Strategy
    
    actor User
    participant Router as React Router Guards
    participant LocalAuth as Borrower Auth Context
    participant UiPathAuth as UiPath SDK Context
    
    User->>Router: Access /lender/dashboard
    Router->>UiPathAuth: Validate Session Storage Token
    
    alt Token Missing
        Router-->>User: Redirect to /lender-login
    else Token Valid
        UiPathAuth->>UiPathAuth: Decode Claims & Fetch Role Entity
        UiPathAuth-->>Router: Role = 'Underwriter'
        Router-->>User: Mount Underwriter Dashboard
    end
    
    User->>Router: Access /borrower/dashboard
    Router->>LocalAuth: Validate LocalStorage JWT
    alt Token Valid
        LocalAuth-->>Router: User Authenticated
        Router-->>User: Mount Borrower Dashboard
    end
```

### Security Measures:
*   **Borrower Isolation**: Borrowers use standard JWTs, ensuring they absolutely cannot execute UiPath SDK functions.
*   **Role-Based Access Control (RBAC)**: Enforced hierarchically by `<ProtectedRoute>` wrappers that cross-reference the user's fetched role against allowed routes.

---

## 5. Integration Workflow: The Loan Lifecycle

This sequence outlines the journey of an application starting from initial validation up to contractual digital signature. This mapping ensures that human intervention stages (like Loan Officer Validation) happen consistently alongside system automation.

```mermaid
sequenceDiagram
    title Diagram 4: Orchestration of the Loan Lifecycle
    
    actor Borrower
    participant WebApp as Front-End Portal
    participant CustomDB as REST API (Docs)
    participant UiPath as UiPath Orchestrator
    actor LoanOfficer as Loan Officer
    actor Underwriter
    participant SignService as DocuSeal

    Borrower->>WebApp: Submit Loan Form & Paystubs
    WebApp->>CustomDB: Store Docs & Return URIs
    WebApp->>UiPath: Instantiate New Case (FLCMLoanApplications)
    UiPath-->>WebApp: Success (Status: Submitted)
    
    Note over UiPath: System checks parameters & transitions to 'Scrutiny Pending'
    
    LoanOfficer->>WebApp: Pick up item from 'Pending Tasks' queue
    WebApp->>UiPath: Fetch Application & Documents
    LoanOfficer->>WebApp: Review Application & Select 'Pass Validation'
    WebApp->>UiPath: Submit Task Action
    
    Note over UiPath: Process logs action and moves Case to 'Underwriter Review'
    
    Underwriter->>WebApp: View High-Risk Queue
    WebApp->>UiPath: Fetch Cases matching Stage
    UiPath-->>WebApp: Returns Workflow Trace (Execution Trail)
    
    Underwriter->>WebApp: Execute Final Approval
    WebApp->>SignService: Generates Signature Link
    SignService-->>Borrower: Request Signature via Email/UI
    Borrower->>SignService: Borrower Signs Document
    SignService-->>WebApp: Signature Complete Webhook
    WebApp->>UiPath: Close Case (Status: Agreement Approved)
```

---

## 6. Optimization & Technical Debt Considerations

*   **Dynamic Code Splitting**: All major dashboards are wrapped in React `Suspense` and dynamically imported. Heavy libraries like Recharts and the UiPath SDK are segmented into manual Webpack chunks via Vite (`manualChunks`), dramatically reducing the initial JS payload.
*   **Field Normalization Risk**: Due to disparate DB and UiPath Data Service definitions, UI adapters proactively map mixed-casing fields (e.g., `loanAmount` vs `LoanAmount`) dynamically.
*   **SLA Compliance Service**: Designed into the Underwriter dashboard logic, evaluating timestamps directly from `CaseInstances` to generate real-time escalation warnings.
