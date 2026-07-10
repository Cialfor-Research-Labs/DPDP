# Graph Report - DPDPA proj  (2026-07-09)

## Corpus Check
- 27 files · ~15,239 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 259 nodes · 376 edges · 19 communities (13 shown, 6 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.53)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Consent and Data Subject Rights
- Enforcement and Adjudication Board
- Data Fiduciary Obligations and Transfers
- Principal Rights and SDF Compliance
- Regulatory Governance
- Project Tooling
- Personal Data Definition
- Graphify Accuracy Evaluation — DPDPA Act 2023
- Obligation
- Q1 — Data Fiduciary's Core Obligations
- Q4 — Rights of a Data Principal
- Q5 — Significant Data Fiduciary: Additional Obligations
- Q6 — Consent (Section 6) vs Children's Data (Section 9): Independent or Connected?
- Q7 — Exemptions: What Exists and Which Sections They Attach To
- Q7 — Exemptions: What Exists and Which Sections They Attach To
- graphify.md
- graphify.md
- Graphify Build Workflow
- Graphify Accuracy Evaluation vs DPDPA

## God Nodes (most connected - your core abstractions)
1. `KeycloakUser` - 12 edges
2. `TenantDataBroker` - 12 edges
3. `InterviewEngine` - 11 edges
4. `AuditLogManager` - 10 edges
5. `Obligations Database` - 10 edges
6. `LLMClient` - 9 edges
7. `ReportGenerator` - 9 edges
8. `RecommendationEngine` - 9 edges
9. `Question-by-Question Analysis` - 9 edges
10. `DeterministicChecker` - 8 edges

## Surprising Connections (you probably didn't know these)
- `TestReportGenerator` --uses--> `AuditLogManager`  [INFERRED]
  apps/api/tests/test_report_generator.py → apps/api/review_queue.py
- `TenantDataBroker` --uses--> `KeycloakUser`  [INFERRED]
  apps/api/db_manager.py → apps/api/auth.py
- `TestMultiTenancyAndRBAC` --uses--> `KeycloakUser`  [INFERRED]
  apps/api/tests/test_multi_tenancy.py → apps/api/auth.py
- `TenantDataBroker` --uses--> `RBACGuard`  [INFERRED]
  apps/api/db_manager.py → apps/api/auth.py
- `TestMultiTenancyAndRBAC` --uses--> `TenantDataBroker`  [INFERRED]
  apps/api/tests/test_multi_tenancy.py → apps/api/db_manager.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **DPDPA Core Obligation Framework** — 2bf1f0e9f04e6fb4f8fef35e82c42aa5_data_fiduciary, 2bf1f0e9f04e6fb4f8fef35e82c42aa5_df_obligations, 2bf1f0e9f04e6fb4f8fef35e82c42aa5_consent, 2bf1f0e9f04e6fb4f8fef35e82c42aa5_notice, 2bf1f0e9f04e6fb4f8fef35e82c42aa5_data_principal [EXTRACTED 1.00]
- **DPDPA Breach Enforcement Pipeline** — 2bf1f0e9f04e6fb4f8fef35e82c42aa5_personal_data_breach, 2bf1f0e9f04e6fb4f8fef35e82c42aa5_board_powers, 2bf1f0e9f04e6fb4f8fef35e82c42aa5_penalties, 2bf1f0e9f04e6fb4f8fef35e82c42aa5_voluntary_undertaking, 2bf1f0e9f04e6fb4f8fef35e82c42aa5_appellate_tribunal [EXTRACTED 1.00]
- **DPDPA Child Data Protection Regime** — 2bf1f0e9f04e6fb4f8fef35e82c42aa5_children_data, 2bf1f0e9f04e6fb4f8fef35e82c42aa5_consent, 2bf1f0e9f04e6fb4f8fef35e82c42aa5_data_principal, 2bf1f0e9f04e6fb4f8fef35e82c42aa5_penalties [EXTRACTED 0.95]

## Communities (19 total, 6 thin omitted)

### Community 0 - "Consent and Data Subject Rights"
Cohesion: 0.09
Nodes (28): Appellate Tribunal (TDSAT), Board Powers and Functions (Section 27), Central Government Regulatory Role, Processing Children's Personal Data (Section 9), Consent (Section 6), Consent Manager, Cross-Border Data Transfer (Section 16), Data Fiduciary (+20 more)

### Community 1 - "Enforcement and Adjudication Board"
Cohesion: 0.15
Nodes (12): DPDPA Obligations Review Report (Ground Truth), Obligations Database, Section 10(2)(a) — `ob_s10_2_a_sdf_dpo`, Section 11 — `ob_s11_rights_access`, Section 16 — `ob_s16_cross_border_transfer`, Section 5(1) — `ob_s5_1_notice_consent`, Section 5(2) — `ob_s5_2_notice_pre_consent`, Section 6(1) — `ob_s6_1_consent_quality` (+4 more)

### Community 2 - "Data Fiduciary Obligations and Transfers"
Cohesion: 0.18
Nodes (7): EmbeddingsClient, InMemoryVectorStore, Any, Embed and load obligations into the store., Embeds the input chunk and returns top_k matching obligations., RetrievalMapper, TestRetrievalMapper

### Community 3 - "Principal Rights and SDF Compliance"
Cohesion: 0.05
Nodes (41): 1. Graphify Output, 1. Graphify Output, 1. Graphify Output, 1. Graphify Output, 1. Graphify Output, 1. Graphify Output, 1. Graphify Output, 1. Graphify Output (+33 more)

### Community 4 - "Regulatory Governance"
Cohesion: 0.22
Nodes (8): description, name, private, scripts, build:frontend, dev:frontend, version, workspaces

### Community 7 - "Graphify Accuracy Evaluation — DPDPA Act 2023"
Cohesion: 0.23
Nodes (7): AuditLogManager, HumanReviewQueue, Any, Applies a reviewer override on a mismatch.         Persists details immutably in, Appends an event transition immutably to the history log., Retrieves all items that are currently in 'HUMAN_REVIEW' status         (usually, TestHumanReviewQueue

### Community 8 - "Obligation"
Cohesion: 0.47
Nodes (4): BaseModel, ChecklistRule, Obligation, main()

### Community 9 - "Q1 — Data Fiduciary's Core Obligations"
Cohesion: 0.11
Nodes (13): Any, Auto-derives ROPA categories and purposes from Section 5(1)/5(2) evidence., Builds the RACI matrix dynamically based on applicable obligation categories., Ranks recommendations by priority/severity:         - HIGH: SDF obligations, Chi, Assembles and saves a styled compliance HTML report using Jinja2 templates., ReportGenerator, Any, Calculates compliance scores.         - evaluation_results maps obligation_id -> (+5 more)

### Community 10 - "Q4 — Rights of a Data Principal"
Cohesion: 0.17
Nodes (9): InterviewEngine, Any, Checks if an obligation applies to the current session parameters.         - If, Filter the full obligation list based on gating parameters., gating_params expected keys:         - role: "Data Fiduciary" or "Significant Da, Generates the sequential question list for the auditor., LLMClient, Phrases a checklist item into a natural language question.         Falls back to (+1 more)

### Community 11 - "Q5 — Significant Data Fiduciary: Additional Obligations"
Cohesion: 0.23
Nodes (7): KeycloakUser, Enforces both Role-Based Access Control and Multi-Tenancy boundaries., RBACGuard, Any, Simulates a secure database broker enforcing Row-Level Security (RLS)     progra, TenantDataBroker, TestMultiTenancyAndRBAC

### Community 12 - "Q6 — Consent (Section 6) vs Children's Data (Section 9): Independent or Connected?"
Cohesion: 0.13
Nodes (9): DeterministicChecker, Any, GroundTruthVerifier, LLMSemanticEvaluator, Any, Reconciles the rule engine verdict with the LLM verdict.         Mismatches NEVE, Evaluates auditor answer. Tiered routing:         - High-risk obligations go dir, TestDeterministicChecker (+1 more)

### Community 13 - "Q7 — Exemptions: What Exists and Which Sections They Attach To"
Cohesion: 0.25
Nodes (4): DpdpaAuditWorkflow, MockTemporal, Any, Temporal durable execution workflow wrapping Phases 3 through 8.         Guarant

### Community 14 - "Q7 — Exemptions: What Exists and Which Sections They Attach To"
Cohesion: 0.33
Nodes (5): Architectural Insights & Recommendations, Executive Summary, Graphify Accuracy Evaluation — DPDPA Act 2023, Ground Truth — DPDPA Act 2023 (PDF direct read), Results Table

## Knowledge Gaps
- **71 isolated node(s):** `name`, `version`, `description`, `private`, `workspaces` (+66 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Question-by-Question Analysis` connect `Principal Rights and SDF Compliance` to `Q7 — Exemptions: What Exists and Which Sections They Attach To`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `AuditLogManager` connect `Graphify Accuracy Evaluation — DPDPA Act 2023` to `Q1 — Data Fiduciary's Core Obligations`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `KeycloakUser` (e.g. with `TenantDataBroker` and `TestMultiTenancyAndRBAC`) actually correct?**
  _`KeycloakUser` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `TenantDataBroker` (e.g. with `KeycloakUser` and `RBACGuard`) actually correct?**
  _`TenantDataBroker` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `InterviewEngine` (e.g. with `LLMClient` and `TestInterviewEngine`) actually correct?**
  _`InterviewEngine` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `AuditLogManager` (e.g. with `TestReportGenerator` and `TestHumanReviewQueue`) actually correct?**
  _`AuditLogManager` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Enforces both Role-Based Access Control and Multi-Tenancy boundaries.`, `Simulates a secure database broker enforcing Row-Level Security (RLS)     progra`, `gating_params expected keys:         - role: "Data Fiduciary" or "Significant Da` to the rest of the system?**
  _92 weakly-connected nodes found - possible documentation gaps or missing edges._