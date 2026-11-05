//! Action Planner
//!
//! Takes a user intent and produces a sequence of tool calls.
//! The planner does NOT execute tools directly — it produces a plan
//! that must pass through the policy engine before execution.

use serde::{Deserialize, Serialize};

/// A planned action step.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlannedStep {
    pub step_id: String,
    pub tool_name: String,
    pub parameters: serde_json::Value,
    pub depends_on: Vec<String>,
    pub description: String,
}

/// An action plan produced by the planner.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionPlan {
    pub plan_id: String,
    pub intent: String,
    pub steps: Vec<PlannedStep>,
    pub estimated_risk: String,
}

/// Action planner that decomposes user intents into tool sequences.
pub struct ActionPlanner;

impl ActionPlanner {
    pub fn new() -> Self {
        Self
    }
    
    /// Create a plan from a user intent.
    /// In production, this would call an LLM to generate the plan.
    /// For now, it provides basic pattern matching for common intents.
    pub fn plan(&self, intent: &str) -> ActionPlan {
        let plan_id = uuid::Uuid::new_v4().to_string();
        
        let steps = self.match_intent(intent);
        
        let estimated_risk = if steps.iter().any(|s| {
            matches!(s.tool_name.as_str(), 
                "execute_command" | "restart_service" | "terminate_process")
        }) {
            "high".to_string()
        } else if steps.iter().any(|s| {
            matches!(s.tool_name.as_str(), "list_files" | "read_file")
        }) {
            "medium".to_string()
        } else {
            "low".to_string()
        };
        
        ActionPlan {
            plan_id,
            intent: intent.to_string(),
            steps,
            estimated_risk,
        }
    }
    
    fn match_intent(&self, intent: &str) -> Vec<PlannedStep> {
        let lower = intent.to_lowercase();
        
        if lower.contains("slow") || lower.contains("performance") {
            // System performance diagnosis
            vec![
                PlannedStep {
                    step_id: "1".to_string(),
                    tool_name: "get_system_info".to_string(),
                    parameters: serde_json::json!({}),
                    depends_on: vec![],
                    description: "Get system information".to_string(),
                },
                PlannedStep {
                    step_id: "2".to_string(),
                    tool_name: "get_cpu_usage".to_string(),
                    parameters: serde_json::json!({}),
                    depends_on: vec![],
                    description: "Check CPU usage".to_string(),
                },
                PlannedStep {
                    step_id: "3".to_string(),
                    tool_name: "get_memory_usage".to_string(),
                    parameters: serde_json::json!({}),
                    depends_on: vec![],
                    description: "Check memory usage".to_string(),
                },
                PlannedStep {
                    step_id: "4".to_string(),
                    tool_name: "get_disk_usage".to_string(),
                    parameters: serde_json::json!({}),
                    depends_on: vec![],
                    description: "Check disk usage".to_string(),
                },
                PlannedStep {
                    step_id: "5".to_string(),
                    tool_name: "list_processes".to_string(),
                    parameters: serde_json::json!({}),
                    depends_on: vec![],
                    description: "List top processes".to_string(),
                },
            ]
        } else if lower.contains("process") || lower.contains("running") {
            vec![
                PlannedStep {
                    step_id: "1".to_string(),
                    tool_name: "list_processes".to_string(),
                    parameters: serde_json::json!({}),
                    depends_on: vec![],
                    description: "List running processes".to_string(),
                },
            ]
        } else if lower.contains("disk") || lower.contains("storage") {
            vec![
                PlannedStep {
                    step_id: "1".to_string(),
                    tool_name: "get_disk_usage".to_string(),
                    parameters: serde_json::json!({}),
                    depends_on: vec![],
                    description: "Check disk usage".to_string(),
                },
            ]
        } else if lower.contains("network") || lower.contains("connection") {
            vec![
                PlannedStep {
                    step_id: "1".to_string(),
                    tool_name: "get_network_status".to_string(),
                    parameters: serde_json::json!({}),
                    depends_on: vec![],
                    description: "Check network status".to_string(),
                },
            ]
        } else {
            // Default: get system info
            vec![
                PlannedStep {
                    step_id: "1".to_string(),
                    tool_name: "get_system_info".to_string(),
                    parameters: serde_json::json!({}),
                    depends_on: vec![],
                    description: "Get system information".to_string(),
                },
            ]
        }
    }
}

impl Default for ActionPlanner {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_plan_slow_computer() {
        let planner = ActionPlanner::new();
        let plan = planner.plan("Why is my computer slow?");
        
        assert!(!plan.plan_id.is_empty());
        assert!(plan.steps.len() >= 4);
        assert_eq!(plan.estimated_risk, "low");
        
        let tool_names: Vec<&str> = plan.steps.iter().map(|s| s.tool_name.as_str()).collect();
        assert!(tool_names.contains(&"get_cpu_usage"));
        assert!(tool_names.contains(&"get_memory_usage"));
        assert!(tool_names.contains(&"get_disk_usage"));
    }
    
    #[test]
    fn test_plan_network_issue() {
        let planner = ActionPlanner::new();
        let plan = planner.plan("Check my network connection");
        
        assert!(plan.steps.iter().any(|s| s.tool_name == "get_network_status"));
    }
    
    #[test]
    fn test_plan_unknown_intent() {
        let planner = ActionPlanner::new();
        let plan = planner.plan("Hello world");
        
        assert!(!plan.steps.is_empty());
        assert_eq!(plan.steps[0].tool_name, "get_system_info");
    }
}
