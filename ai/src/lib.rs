//! NEXLINK AI Subsystem
//!
//! Provides the AI tool system, policy engine, and provider abstraction.
//!
//! Architecture:
//! ```text
//! AI (LLM)
//!   ↓
//! Action Planner
//!   ↓
//! Permission System
//!   ↓
//! Policy Engine
//!   ↓
//! Tool Executor
//!   ↓
//! NEXLINK Agent
//!   ↓
//! Operating System
//! ```

pub mod tools;
pub mod policy;
pub mod planner;
pub mod provider;

pub use tools::{ToolRegistry, ToolDefinition, ToolResult, RiskLevel};
pub use policy::PolicyEngine;
pub use planner::ActionPlanner;
pub use provider::AiProvider;
