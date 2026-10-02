# Arquitectura: Orquestador Agéntico de Onboarding

## 1. Despliegue en GCP

```mermaid
flowchart LR
    U([Prospecto / Asesor]) -->|HTTPS| FH

    subgraph GCP["Google Cloud Platform"]
        subgraph FB["Firebase"]
            FH["Firebase Hosting<br/>React SPA (Vite)"]
        end
        FH -->|"rewrite /api/** (same-origin)"| CR
        subgraph CRS["Cloud Run · onboarding-api"]
            CR["FastAPI<br/>Orquestador + Sub-agentes"]
            DB[("SQLite<br/>estado de sesiones")]
            CR --- DB
        end
        SM["Secret Manager<br/>OPENAI_API_KEY"] -.-> CR
        AR["Artifact Registry<br/>imagen Docker"] -.-> CR
        CL["Cloud Logging<br/>auditoría de tools"] <-.- CR
    end

    CR -.->|"redacción + recomendación (guardrails)"| LLM["OpenAI API"]
    CR -->|mock| T1["verify_identity<br/>(Registro Civil)"]
    CR -->|mock| T2["check_risk_lists<br/>(OFAC / ONU / PEP)"]
    CR -->|mock| T3["prepare_documentation<br/>(Gestor documental)"]
```

> SQLite vive en `/tmp` del contenedor (demo, `max-instances=1`). Para producción se cambia la
> implementación de `SessionRepository` por Cloud SQL (PostgreSQL) sin tocar el orquestador.

## 2. Orquestador y sub-agentes (control de herramientas)

```mermaid
flowchart TB
    API["POST /api/v1/onboarding/start"] --> ORQ

    subgraph ORQ["Orquestador (supervisor determinista)"]
        SM["Máquina de estados"]
        BB[("Blackboard<br/>session.context")]
        PE["Motor de políticas<br/>(decide APTO / NO_APTO / REVISIÓN)"]
        ESC["Gestor de escalamiento<br/>(human-in-the-loop)"]
    end

    ORQ --> IA["identity_agent"]
    ORQ --> RA["risk_agent"]
    ORQ --> DA["documentation_agent"]
    ORQ --> RSA["response_agent"]

    subgraph GW["ToolGateway (allowlist + reintentos + auditoría)"]
        direction LR
        P1{{"identity_agent → verify_identity"}}
        P2{{"risk_agent → check_risk_lists"}}
        P3{{"documentation_agent → prepare_documentation"}}
        P4{{"response_agent → ∅ (sin tools)"}}
        P5{{"advisor_agent → ∅ (sin tools)"}}
    end

    IA --> P1 --> T1[verify_identity]
    RA --> P2 --> T2[check_risk_lists]
    DA --> P3 --> T3[prepare_documentation]
    RSA --> P4
    RSA -. "texto, nunca decisión" .-> LLM["OpenAI gpt-5-mini<br/>+ guardrails / plantilla"]
    ORQ --> ADV["advisor_agent<br/>(recomienda remediación)"]
    ADV --> P5
    ADV -. "acción de catálogo cerrado" .-> LLM
    ADV --> HITL{{"Revisor humano<br/>decide siempre"}}

    ORQ <--> REPO[("SessionRepository<br/>SQLite")]
```

## 3. Flujo de decisión y mitigación de incertidumbre

```mermaid
flowchart TD
    S([Solicitud]) --> V[identity_agent<br/>verify_identity]
    V -->|"timeout ×3 (backoff)"| E1["ESCALAR: reencolar +<br/>videollamada con asesor"]
    V -->|verified = false| NO[NO_APTO]
    V -->|confidence < 0.8| E2["ESCALAR: prueba de vida<br/>biométrica / agencia"]
    V -->|confidence ≥ 0.8| R
    E1 --> R
    E2 --> R
    R[risk_agent<br/>check_risk_lists] -->|high| E3["ESCALAR: Oficial de Cumplimiento<br/>descarta homonimia"]
    R -->|low / medium| P
    E3 --> P
    P{Motor de políticas<br/>por producto} -->|evidencia OK| APTO[APTO]
    P -->|escalado / fuera de apetito| REV[REVISION_MANUAL]
    APTO --> D[documentation_agent<br/>prepare_documentation<br/>+EDD si riesgo medio]
    D --> M[response_agent]
    NO --> M
    REV --> M
    M --> F([Respuesta al cliente])
    REV --> ADV["advisor_agent · LLM<br/>recomienda acción de catálogo cerrado"]
    ADV -. "POST /resolve" .-> H{"Revisor humano<br/>decide siempre"}
    H -->|approve| D
    H -->|reject| M
```

## 4. Estados de la sesión (estado conversacional)

```mermaid
stateDiagram-v2
    [*] --> IN_PROGRESS: start
    IN_PROGRESS --> APPROVED: política = APTO
    IN_PROGRESS --> REJECTED: política = NO_APTO
    IN_PROGRESS --> ESCALATED: incertidumbre / riesgo alto / tool caída
    ESCALATED --> APPROVED: revisor aprueba
    ESCALATED --> REJECTED: revisor rechaza
    APPROVED --> [*]
    REJECTED --> [*]
```

## 5. Secuencia (camino feliz)

```mermaid
sequenceDiagram
    autonumber
    participant C as Cliente (React)
    participant API as FastAPI
    participant O as Orquestador
    participant G as ToolGateway
    participant DB as SQLite
    C->>API: POST /onboarding/start
    API->>O: start(request)
    O->>DB: save(RECEIVED)
    O->>G: identity_agent · verify_identity
    G-->>O: {verified:true, confidence:0.93}
    O->>DB: checkpoint
    O->>G: risk_agent · check_risk_lists
    G-->>O: {risk_level:"low", matches:[]}
    O->>DB: checkpoint
    O->>O: policies.evaluate() → APTO
    O->>G: documentation_agent · prepare_documentation
    G-->>O: documentos requeridos
    O->>O: response_agent (OpenAI + guardrails o plantilla)
    O->>DB: save(APPROVED)
    API-->>C: sesión (steps, decision, documentos, mensaje)
```

## Decisiones de diseño

| Decisión | Motivo |
|---|---|
| Supervisor **determinista** (no LLM-router) | En banca la ruta y la decisión deben ser auditables y reproducibles. |
| LLM sin tools y sin poder de decisión | `response_agent` redacta y `advisor_agent` recomienda de un catálogo cerrado; la decisión es del motor de políticas o de un humano. |
| Guardrails en capas | Entrada (validación, anti-injection, minimización de PII) → prompt (datos delimitados) → salida (JSON Schema estricto, filtros, coherencia) → fallback determinista. |
| Human-in-the-loop | Todo caso ambiguo queda ESCALATED; aprobar severidad alta exige justificación. |
| `ToolGateway` con allowlist por agente | Mínimo privilegio; un agente no puede invocar herramientas ajenas (test incluido). |
| Checkpoint del estado tras cada paso | Recuperación ante fallas y trazabilidad completa del caso. |
| Escalamiento con **solución propuesta** | Requisito 3: toda falla/ambigüedad sale con acción concreta para el revisor. |
| Riesgo se consulta aun si identidad escaló | El revisor humano resuelve con evidencia completa. |
| `SessionRepository` como interfaz | SQLite hoy, Cloud SQL / Firestore mañana sin cambiar lógica. |
