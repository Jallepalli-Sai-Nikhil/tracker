const moduleSource = `
# Foundations
@ python | Python | 0
Syntax and runtime: Names and references; Numeric types and precision; Strings and bytes; Truthiness and control flow; Scope and closures; Imports and modules
Collections: Lists and tuples; Sets and frozensets; Dictionaries and defaultdict; Counter and deque; Comprehensions; Mutability and shallow vs deep copy; Sorting by key; Hashability
Functions and iteration: Arguments and unpacking; First-class functions; Iterables and iterators; Generators and yield; Decorators; functools and itertools
OOP and data modeling: Classes and instances; Class vs instance attributes; Composition and inheritance; Properties and descriptors; Dataclasses; Enum; Protocol and abstract base classes
Typing and validation: Type aliases; Union and narrowing; TypedDict; Generic and TypeVar; Callable; Pydantic models and validators; Serialization boundaries
I/O and concurrency: pathlib and file I/O; JSON and CSV; Exceptions and chaining; Context managers; Logging; asyncio tasks and cancellation; HTTPX and timeouts; Threads vs processes; Bounded concurrency
Production Python: Package layout and entry points; Profiling CPU and memory; Configuration and environment variables; Dependency injection; Error boundaries; Typed public APIs
@ dsa | Data Structures & Algorithms | 1
Analysis: Time and space complexity; Amortized complexity; Loop invariants; Recurrence intuition
Linear structures: Arrays and strings; Hash maps; Two pointers; Sliding window; Prefix sums; Stack and monotonic stack; Queue and deque; Linked lists
Search and trees: Binary search boundaries; Sorting stability; Binary trees; BST; Heap and top K; Trie; Intervals and sweep line
Graphs and optimization: BFS and DFS; Topological sort; Union-find; Dijkstra; Greedy proofs; Backtracking; Dynamic programming states and transitions
@ ml | ML & Deep Learning | -
Data and models: Train-validation-test splits; Leakage; Preprocessing pipelines; Classification and regression; Imbalance; Calibration
Math and training: Vectors and matrices; Dot products and projections; Probability and expectation; Softmax and log-sum-exp; Cross-entropy; Backpropagation; SGD and Adam; Regularization
Frameworks: NumPy broadcasting; pandas joins and reshaping; scikit-learn pipelines; PyTorch tensors and autograd; Dataset and DataLoader; Mixed precision and checkpoints
# Models and adaptation
@ llm | LLM Fundamentals | 2
Tokens and representations: Byte-pair encoding; Token IDs and vocabularies; Special tokens and chat templates; Input embeddings; Positional encodings; RoPE and position scaling
Attention: Query, key and value projections; Scaled dot-product attention; Causal and padding masks; Multi-head attention; MQA and GQA; FlashAttention intuition
Transformer internals: Residual streams; LayerNorm and RMSNorm; Feed-forward blocks and SwiGLU; Decoder-only vs encoder-decoder; Mixture of experts and routing
Training: Autoregressive objective; Shifted labels and next-token loss; Batching and sequence packing; Pretraining vs instruction tuning; Data deduplication and contamination
Inference: Logits and log probabilities; Greedy and beam search; Temperature, top-k and top-p; Stop sequences; Prefill vs decode; KV cache and memory sizing; Continuous batching; Speculative decoding; Throughput vs time to first token
@ finetune | Fine-Tuning & Alignment | 9
Data design: Prompting vs fine-tuning decision; Dataset schema and chat templates; Label masking; Deduplication and leakage; Train-validation-test splits; Data quality audits
Training: Full vs partial fine-tuning; Weight freezing; SFT objectives; Learning rate and schedulers; Gradient accumulation; Clipping; Checkpoints and reproducibility
Alignment: Preference pairs; Reward modeling; RLHF overview; DPO objective; Rejection sampling; Catastrophic forgetting; Safety and held-out evaluation
@ peft | PEFT, LoRA & Quantization | 10
Adapters: Low-rank decomposition; Target modules; Rank, alpha and dropout; Adapter initialization; Trainable parameter counts; Adapter merging and serving
Quantization: Weight vs activation quantization; Symmetric vs asymmetric; Per-channel vs per-tensor; Calibration; NF4; Double quantization; Compute dtype; Outlier handling
QLoRA: Frozen 4-bit backbone; Adapter gradient flow; Paged optimizers; GPU memory measurement; Quality-latency comparison; Adapter compatibility
@ distill | Distillation & Compression | 11
Teacher and student: Teacher selection; Capacity gap; Hard-label imitation; Soft targets; Offline vs online distillation; Self-distillation
Objectives: Temperature scaling; KL divergence and temperature correction; Sequence-level distillation; Intermediate feature matching; Preference distillation
Production: Teacher-generated data filtering; Coverage and licensing; Teacher error propagation; Held-out and adversarial slices; Pareto comparison of latency, memory and quality; Pruning and sparsity
# Application engineering
@ genai | GenAI Engineering | 3
Model APIs: Chat roles and messages; Model selection; Context and output budgets; Structured outputs and schemas; Streaming events and cancellation; Multimodal inputs
Reliability: Timeouts and retry budgets; Exponential backoff with jitter; Rate limiting; Provider fallback; Idempotency for tool calls; Semantic and exact caching; Batch inference
Product design: Prompt templates and versioning; Few-shot examples; Context engineering; Human escalation; Feedback collection; Cost per successful task
@ rag | Retrieval-Augmented Generation | 4
Ingestion: Parsing PDFs and HTML; OCR and layout; Chunking by structure; Metadata and stable IDs; Deduplication; Incremental refresh and deletes
Retrieval: Embedding models and normalization; Cosine and dot-product search; HNSW and IVF trade-offs; BM25; Hybrid search and reciprocal rank fusion; Metadata and tenant filters
Context assembly: Query rewriting; Multi-query retrieval; Cross-encoder reranking; Parent-child retrieval; Context compression; Citations and abstention
Production RAG: Recall@k and nDCG; Retrieval vs answer errors; ACL enforcement; Index migrations; Freshness and cache invalidation; Latency and cost budgets; Knowledge graph retrieval
@ agents | Agents & Workflows | 5
Building blocks: Deterministic workflows vs agent loops; Tool schemas; Planning and routing; State and short-term memory; Long-term memory with retrieval
Execution: Observe-act loops; Parallel tool calls; Budgets and termination; Checkpoints; Idempotency and side effects; Human approvals; Error recovery
Production: Capability boundaries; Sandbox design; Trajectory evaluation; Tool accuracy; Escalation paths; Long-running workflows; Multi-agent coordination trade-offs
@ mcp | Model Context Protocol | -
Protocol: Host, client and server; JSON-RPC messages; Initialization and capability negotiation; Tools, resources and prompts; Transport lifecycle
Integration: stdio; Streamable HTTP; Schema validation; Pagination; Progress and cancellation; Error and result handling
Production: Authentication and authorization; Least privilege; Tool approval boundaries; Timeouts; Version compatibility; Interoperability testing; Auditable server logs
@ fastmcp | FastMCP | -
Server basics: Server initialization; Typed tool registration; Resources and templates; Prompts; Structured returns; Client smoke testing
Production server: Lifecycle and dependencies; Context and progress; Authentication; Error mapping; HTTP serving; Integration tests and deployment
# Frameworks and quality
@ langchain | LangChain | 6
Core: Chat models and messages; Prompts; Runnables; Invoke and batch; Stream and async; Config and callbacks
Composition: Output parsers vs structured outputs; Tool definition; Retrievers and document loaders; Retry and fallback; Provider portability; Integration testing
@ langgraph | LangGraph | 7
Graph design: State schemas and reducers; Nodes and edges; Conditional routing; Subgraphs; Streaming modes; Recursion limits
Durable execution: Checkpointers and thread IDs; Interrupt and resume; Replay and time travel; Idempotent side effects; Durable stores; Failure recovery
@ langsmith | LangSmith | 8
Tracing: Projects, traces and runs; Tags and metadata; Sampling; Sensitive-field redaction; Debugging nested runs
Evaluation: Datasets and examples; Experiments; Offline evaluators; Online feedback; Prompt versioning; Regression comparison
@ langfuse | Langfuse | -
Instrumentation: Traces and observations; Sessions and user IDs; Prompt versioning; Token and cost capture; OpenTelemetry instrumentation
Operations: Datasets and scores; Evaluator calibration; Sampling and PII redaction; Retention; Self-hosting trade-offs
@ evals | Evaluation | 12
Dataset design: Task rubric and failure taxonomy; Golden datasets; Edge cases and slices; Human labels; Inter-rater agreement; Versioned datasets
Metrics: Exact match and schema validity; Recall@k and ranking metrics; Groundedness and citation quality; Tool-use and trajectory scoring; Latency and cost metrics
Evaluation systems: LLM judges and calibration; Position and verbosity bias; Pairwise comparisons; Confidence intervals; Regression thresholds; Online shadow and A/B evaluation
@ guardrails | Guardrails & AI Security | -
Input and output: Prompt injection threat modeling; Input size and format limits; PII detection and redaction; Output schema enforcement; Content moderation; Refusal and escalation paths
Tools and data: Least privilege; Untrusted retrieval context; Tenant isolation; Approval for side effects; Audit trails; Defensive adversarial test suites
@ tests | Testing | 20
Core: pytest fixtures; Parametrization; Mock and fake model clients; Async tests; FastAPI TestClient; Deterministic test data
System tests: Unit vs contract vs integration; Streaming cancellation tests; Load and soak testing; Flaky-test diagnosis; Retrieval and generation regression gates; Test reports in CI
# Platform and developer tools
@ tools | Utility Tools & Git | 15,16,19
Python workflow: uv init and run; pyproject.toml; uv lock and sync; Frozen dependencies in CI; Ruff lint and format; Pyright or mypy
CLI and debugging: Rich tables and progress; Typer arguments; Debugger and breakpoints; HTTP clients; Jupyter and reproducible notebooks
Git: Working tree and index; Branching and remotes; Pull requests; Merge and rebase; Conflict resolution; Revert and reflog; Ignore rules and secret hygiene
@ api | FastAPI & Serving | 17
HTTP API: Routing and validation; Dependencies; Error mapping; OpenAPI; API versioning; Authentication and authorization
Serving: async vs blocking workloads; SSE and cancellation; Queues and backpressure; Health and readiness endpoints; Worker sizing; Trace context propagation
@ docker | Docker | 18
Images: Container isolation; Layers and build cache; Multi-stage Dockerfiles; Digests and tags; Non-root users; Secret mounts
Runtime: Ports and networking; Volumes; Compose; Resource limits; Health checks; Image scanning and SBOMs
@ k8s | Kubernetes | -
Core: Control plane and kubelet; Pods; Deployments and ReplicaSets; Services and DNS; ConfigMaps and Secrets; Probes and requests vs limits
Production: Ingress and Gateway API; Autoscaling; Persistent volumes; RBAC and network policies; Rollouts and rollbacks; GPU scheduling; Troubleshooting events and logs
@ observability | Observability | -
Signals: Structured logs; Metrics and cardinality; Distributed tracing; OpenTelemetry context; Correlation IDs
Operations: SLI and SLO; Error budgets; Tail latency; Alert thresholds and runbooks; Token and cost attribution; Trace redaction and sampling
@ cicd | CI/CD | -
Build: GitHub Actions jobs and runners; Dependency and build caching; Secret management and OIDC; Tests and evals as gates; Artifacts and provenance
Release: Infrastructure as code; Staging promotion; Canary and blue-green; Migration compatibility; Rollback and recovery; Supply-chain scanning
@ deploy | Deployment & MLOps | 13,14
Deployment: Hosting trade-offs; Model serving and batching; GPU memory and sizing; Load shedding; Queue-based workers; Autoscaling and cost
Lifecycle: Dataset versioning; Experiment tracking; Model registries; Feature and prompt versioning; Drift monitoring; Rollback and incident response
`;
const modules=[];
let group='',mod;
for(const line of moduleSource.trim().split('\n')){
 if(line.startsWith('# ')){group=line.slice(2);continue;}
 if(line.startsWith('@ ')){const [id,name,legacy]=line.slice(2).split(' | ');mod={id,name,group,legacy:legacy==='-'?[]:legacy.split(',').map(Number),subs:[]};modules.push(mod);continue;}
 const [name,items]=line.split(': ');
 mod.subs.push({name,items:items.split('; ')});
}

export { modules };
