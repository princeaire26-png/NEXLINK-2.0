//! AI Tool definitions and registry.
//!
//! Every tool must define:
//! - name, description
//! - input/output schema
//! - risk level
//! - required permissions
//! - execution handler

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Risk level for a tool.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RiskLevel {
    Low,
    Medium,
    High,
    Critical,
}

/// Tool definition.
#[derive(Debug, Clone)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    pub input_schema: serde_json::Value,
    pub output_schema: serde_json::Value,
    pub risk_level: RiskLevel,
    pub required_permissions: Vec<String>,
    pub requires_authorization: bool,
}

/// Tool execution result.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolResult {
    pub success: bool,
    pub data: Option<serde_json::Value>,
    pub error: Option<String>,
}

/// Trait for tool execution handlers.
#[async_trait]
pub trait ToolHandler: Send + Sync {
    async fn execute(&self, params: serde_json::Value) -> Result<ToolResult, ToolError>;
}

/// Tool execution error.
#[derive(Debug, thiserror::Error)]
pub enum ToolError {
    #[error("Invalid parameters: {0}")]
    InvalidParameters(String),
    
    #[error("Permission denied: {0}")]
    PermissionDenied(String),
    
    #[error("Execution failed: {0}")]
    ExecutionFailed(String),
    
    #[error("Timeout")]
    Timeout,
    
    #[error("Tool not found: {0}")]
    NotFound(String),
}

/// Tool registry managing all available tools.
pub struct ToolRegistry {
    definitions: HashMap<String, ToolDefinition>,
    handlers: HashMap<String, Arc<dyn ToolHandler>>,
}

impl ToolRegistry {
    /// Create a new empty registry.
    pub fn new() -> Self {
        Self {
            definitions: HashMap::new(),
            handlers: HashMap::new(),
        }
    }
    
    /// Register a tool with its definition and handler.
    pub fn register(&mut self, definition: ToolDefinition, handler: Arc<dyn ToolHandler>) {
        let name = definition.name.clone();
        self.definitions.insert(name.clone(), definition);
        self.handlers.insert(name, handler);
    }
    
    /// Get a tool definition by name.
    pub fn get_definition(&self, name: &str) -> Option<&ToolDefinition> {
        self.definitions.get(name)
    }
    
    /// Execute a tool by name.
    pub async fn execute(&self, name: &str, params: serde_json::Value) -> Result<ToolResult, ToolError> {
        let handler = self.handlers.get(name)
            .ok_or_else(|| ToolError::NotFound(name.to_string()))?;
        
        handler.execute(params).await
    }
    
    /// List all registered tool definitions.
    pub fn list_tools(&self) -> Vec<&ToolDefinition> {
        self.definitions.values().collect()
    }
    
    /// Get all tools at or above a risk level.
    pub fn tools_at_risk(&self, min_risk: &RiskLevel) -> Vec<&ToolDefinition> {
        let min_order = risk_order(min_risk);
        self.definitions.values()
            .filter(|t| risk_order(&t.risk_level) >= min_order)
            .collect()
    }
}

impl Default for ToolRegistry {
    fn default() -> Self {
        Self::new()
    }
}

fn risk_order(level: &RiskLevel) -> u8 {
    match level {
        RiskLevel::Low => 0,
        RiskLevel::Medium => 1,
        RiskLevel::High => 2,
        RiskLevel::Critical => 3,
    }
}

// ---- Built-in tool definitions ----

/// Create the standard NEXLINK tool definitions.
pub fn standard_tool_definitions() -> Vec<ToolDefinition> {
    vec![
        ToolDefinition {
            name: "get_system_info".to_string(),
            description: "Get operating system and hardware information".to_string(),
            input_schema: serde_json::json!({ "type": "object", "properties": {} }),
            output_schema: serde_json::json!({ "type": "object" }),
            risk_level: RiskLevel::Low,
            required_permissions: vec!["read:system_info".to_string()],
            requires_authorization: false,
        },
        ToolDefinition {
            name: "get_cpu_usage".to_string(),
            description: "Get current CPU usage percentage".to_string(),
            input_schema: serde_json::json!({ "type": "object", "properties": {} }),
            output_schema: serde_json::json!({ "type": "object", "properties": { "cpu_percent": { "type": "number" } } }),
            risk_level: RiskLevel::Low,
            required_permissions: vec!["read:metrics".to_string()],
            requires_authorization: false,
        },
        ToolDefinition {
            name: "get_memory_usage".to_string(),
            description: "Get current memory usage".to_string(),
            input_schema: serde_json::json!({ "type": "object", "properties": {} }),
            output_schema: serde_json::json!({ "type": "object" }),
            risk_level: RiskLevel::Low,
            required_permissions: vec!["read:metrics".to_string()],
            requires_authorization: false,
        },
        ToolDefinition {
            name: "get_disk_usage".to_string(),
            description: "Get disk usage information".to_string(),
            input_schema: serde_json::json!({ "type": "object", "properties": {} }),
            output_schema: serde_json::json!({ "type": "object" }),
            risk_level: RiskLevel::Low,
            required_permissions: vec!["read:metrics".to_string()],
            requires_authorization: false,
        },
        ToolDefinition {
            name: "list_processes".to_string(),
            description: "List running processes".to_string(),
            input_schema: serde_json::json!({ "type": "object", "properties": {} }),
            output_schema: serde_json::json!({ "type": "array" }),
            risk_level: RiskLevel::Low,
            required_permissions: vec!["read:processes".to_string()],
            requires_authorization: false,
        },
        ToolDefinition {
            name: "get_process_details".to_string(),
            description: "Get detailed information about a specific process".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": { "pid": { "type": "integer" } },
                "required": ["pid"]
            }),
            output_schema: serde_json::json!({ "type": "object" }),
            risk_level: RiskLevel::Low,
            required_permissions: vec!["read:processes".to_string()],
            requires_authorization: false,
        },
        ToolDefinition {
            name: "list_services".to_string(),
            description: "List system services and their status".to_string(),
            input_schema: serde_json::json!({ "type": "object", "properties": {} }),
            output_schema: serde_json::json!({ "type": "array" }),
            risk_level: RiskLevel::Low,
            required_permissions: vec!["read:services".to_string()],
            requires_authorization: false,
        },
        ToolDefinition {
            name: "get_logs".to_string(),
            description: "Get system or application logs".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "source": { "type": "string" },
                    "lines": { "type": "integer" }
                }
            }),
            output_schema: serde_json::json!({ "type": "object" }),
            risk_level: RiskLevel::Low,
            required_permissions: vec!["read:logs".to_string()],
            requires_authorization: false,
        },
        ToolDefinition {
            name: "get_network_status".to_string(),
            description: "Get network interface status".to_string(),
            input_schema: serde_json::json!({ "type": "object", "properties": {} }),
            output_schema: serde_json::json!({ "type": "object" }),
            risk_level: RiskLevel::Low,
            required_permissions: vec!["read:network".to_string()],
            requires_authorization: false,
        },
        ToolDefinition {
            name: "list_files".to_string(),
            description: "List files in a directory".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": { "path": { "type": "string" } },
                "required": ["path"]
            }),
            output_schema: serde_json::json!({ "type": "array" }),
            risk_level: RiskLevel::Medium,
            required_permissions: vec!["read:files".to_string()],
            requires_authorization: true,
        },
        ToolDefinition {
            name: "read_file".to_string(),
            description: "Read the contents of a file".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": { "path": { "type": "string" } },
                "required": ["path"]
            }),
            output_schema: serde_json::json!({ "type": "object" }),
            risk_level: RiskLevel::Medium,
            required_permissions: vec!["read:files".to_string()],
            requires_authorization: true,
        },
        ToolDefinition {
            name: "execute_command".to_string(),
            description: "Execute a system command".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "command": { "type": "string" },
                    "args": { "type": "array", "items": { "type": "string" } }
                },
                "required": ["command"]
            }),
            output_schema: serde_json::json!({ "type": "object" }),
            risk_level: RiskLevel::High,
            required_permissions: vec!["execute:command".to_string()],
            requires_authorization: true,
        },
        ToolDefinition {
            name: "restart_service".to_string(),
            description: "Restart a system service".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": { "service_name": { "type": "string" } },
                "required": ["service_name"]
            }),
            output_schema: serde_json::json!({ "type": "object" }),
            risk_level: RiskLevel::High,
            required_permissions: vec!["manage:services".to_string()],
            requires_authorization: true,
        },
        ToolDefinition {
            name: "terminate_process".to_string(),
            description: "Terminate a running process".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": { "pid": { "type": "integer" } },
                "required": ["pid"]
            }),
            output_schema: serde_json::json!({ "type": "object" }),
            risk_level: RiskLevel::High,
            required_permissions: vec!["manage:processes".to_string()],
            requires_authorization: true,
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    
    struct MockHandler;
    
    #[async_trait]
    impl ToolHandler for MockHandler {
        async fn execute(&self, _params: serde_json::Value) -> Result<ToolResult, ToolError> {
            Ok(ToolResult {
                success: true,
                data: Some(serde_json::json!({ "mock": true })),
                error: None,
            })
        }
    }
    
    #[test]
    fn test_tool_registry_register_and_get() {
        let mut registry = ToolRegistry::new();
        let def = ToolDefinition {
            name: "test_tool".to_string(),
            description: "A test tool".to_string(),
            input_schema: serde_json::json!({}),
            output_schema: serde_json::json!({}),
            risk_level: RiskLevel::Low,
            required_permissions: vec![],
            requires_authorization: false,
        };
        
        registry.register(def, Arc::new(MockHandler));
        
        assert!(registry.get_definition("test_tool").is_some());
        assert!(registry.get_definition("nonexistent").is_none());
    }
    
    #[tokio::test]
    async fn test_tool_execution() {
        let mut registry = ToolRegistry::new();
        let def = ToolDefinition {
            name: "test_tool".to_string(),
            description: "A test tool".to_string(),
            input_schema: serde_json::json!({}),
            output_schema: serde_json::json!({}),
            risk_level: RiskLevel::Low,
            required_permissions: vec![],
            requires_authorization: false,
        };
        
        registry.register(def, Arc::new(MockHandler));
        
        let result = registry.execute("test_tool", serde_json::json!({})).await.unwrap();
        assert!(result.success);
    }
    
    #[tokio::test]
    async fn test_tool_not_found() {
        let registry = ToolRegistry::new();
        let result = registry.execute("nonexistent", serde_json::json!({})).await;
        assert!(result.is_err());
    }
    
    #[test]
    fn test_standard_tool_definitions() {
        let tools = standard_tool_definitions();
        assert!(tools.len() >= 14);
        
        // Verify all have names
        for tool in &tools {
            assert!(!tool.name.is_empty());
            assert!(!tool.description.is_empty());
        }
    }
    
    #[test]
    fn test_risk_levels() {
        assert_eq!(risk_order(&RiskLevel::Low), 0);
        assert_eq!(risk_order(&RiskLevel::Medium), 1);
        assert_eq!(risk_order(&RiskLevel::High), 2);
        assert_eq!(risk_order(&RiskLevel::Critical), 3);
    }
    
    #[test]
    fn test_tools_at_risk() {
        let mut registry = ToolRegistry::new();
        
        for def in standard_tool_definitions() {
            registry.register(def, Arc::new(MockHandler));
        }
        
        let high_risk = registry.tools_at_risk(&RiskLevel::High);
        assert!(high_risk.len() >= 3); // execute_command, restart_service, terminate_process
        
        for tool in high_risk {
            assert!(risk_order(&tool.risk_level) >= 2);
        }
    }
}
