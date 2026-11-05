//! Policy Engine
//!
//! Evaluates whether an AI tool action is permitted based on:
//! - Risk level
//! - User/device permissions
//! - Organizational policies
//! - Session authorization

use serde::{Deserialize, Serialize};
use crate::tools::RiskLevel;

/// Policy evaluation result.
#[derive(Debug, Clone)]
pub enum PolicyDecision {
    /// Action is allowed.
    Allow,
    /// Action requires explicit user authorization.
    RequireAuthorization { reason: String },
    /// Action is denied.
    Deny { reason: String },
}

/// Policy engine that evaluates tool actions.
pub struct PolicyEngine {
    /// Maximum risk level allowed without explicit authorization.
    max_auto_risk: RiskLevel,
    /// Whether high-risk actions are ever allowed.
    allow_high_risk: bool,
    /// Whether critical actions are ever allowed.
    allow_critical: bool,
}

/// Context for policy evaluation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyContext {
    pub user_id: String,
    pub device_id: String,
    pub session_id: String,
    pub permissions: Vec<String>,
    pub role: String,
}

impl PolicyEngine {
    /// Create a new policy engine with default settings.
    pub fn new() -> Self {
        Self {
            max_auto_risk: RiskLevel::Low,
            allow_high_risk: true,
            allow_critical: false,
        }
    }
    
    /// Create with custom settings.
    pub fn with_config(max_auto_risk: RiskLevel, allow_high_risk: bool, allow_critical: bool) -> Self {
        Self {
            max_auto_risk,
            allow_high_risk,
            allow_critical,
        }
    }
    
    /// Evaluate whether a tool action is permitted.
    pub fn evaluate(
        &self,
        tool_name: &str,
        risk_level: &RiskLevel,
        required_permissions: &[String],
        context: &PolicyContext,
    ) -> PolicyDecision {
        // Critical actions are never auto-allowed
        if *risk_level == RiskLevel::Critical && !self.allow_critical {
            return PolicyDecision::Deny {
                reason: format!("Critical-risk tool '{}' is not permitted by policy", tool_name),
            };
        }
        
        // High-risk actions require authorization unless explicitly allowed
        if *risk_level == RiskLevel::High && !self.allow_high_risk {
            return PolicyDecision::Deny {
                reason: format!("High-risk tool '{}' is not permitted by policy", tool_name),
            };
        }
        
        // Check if user has required permissions
        for perm in required_permissions {
            if !context.permissions.contains(perm) && context.role != "owner" {
                return PolicyDecision::Deny {
                    reason: format!("Missing required permission: {}", perm),
                };
            }
        }
        
        // If risk exceeds auto-allow threshold, require authorization
        if risk_order(risk_level) > risk_order(&self.max_auto_risk) {
            return PolicyDecision::RequireAuthorization {
                reason: format!(
                    "Tool '{}' has {} risk level, which requires explicit authorization",
                    tool_name,
                    format!("{:?}", risk_level).to_lowercase()
                ),
            };
        }
        
        PolicyDecision::Allow
    }
}

impl Default for PolicyEngine {
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

#[cfg(test)]
mod tests {
    use super::*;
    
    fn test_context() -> PolicyContext {
        PolicyContext {
            user_id: "user-1".to_string(),
            device_id: "dev-1".to_string(),
            session_id: "sess-1".to_string(),
            permissions: vec![
                "read:metrics".to_string(),
                "read:processes".to_string(),
                "read:system_info".to_string(),
            ],
            role: "member".to_string(),
        }
    }
    
    fn owner_context() -> PolicyContext {
        PolicyContext {
            user_id: "user-owner".to_string(),
            device_id: "dev-1".to_string(),
            session_id: "sess-1".to_string(),
            permissions: vec![],
            role: "owner".to_string(),
        }
    }
    
    #[test]
    fn test_low_risk_allowed() {
        let engine = PolicyEngine::new();
        let ctx = test_context();
        
        let decision = engine.evaluate(
            "get_cpu_usage",
            &RiskLevel::Low,
            &["read:metrics".to_string()],
            &ctx,
        );
        
        assert!(matches!(decision, PolicyDecision::Allow));
    }
    
    #[test]
    fn test_high_risk_requires_authorization() {
        let engine = PolicyEngine::new();
        let ctx = owner_context();
        
        let decision = engine.evaluate(
            "execute_command",
            &RiskLevel::High,
            &["execute:command".to_string()],
            &ctx,
        );
        
        assert!(matches!(decision, PolicyDecision::RequireAuthorization { .. }));
    }
    
    #[test]
    fn test_critical_risk_denied_by_default() {
        let engine = PolicyEngine::new();
        let ctx = owner_context();
        
        let decision = engine.evaluate(
            "dangerous_tool",
            &RiskLevel::Critical,
            &[],
            &ctx,
        );
        
        assert!(matches!(decision, PolicyDecision::Deny { .. }));
    }
    
    #[test]
    fn test_missing_permission_denied() {
        let engine = PolicyEngine::new();
        let ctx = test_context(); // member without execute:command
        
        let decision = engine.evaluate(
            "execute_command",
            &RiskLevel::Low, // even at low risk
            &["execute:command".to_string()],
            &ctx,
        );
        
        assert!(matches!(decision, PolicyDecision::Deny { .. }));
    }
    
    #[test]
    fn test_owner_bypasses_permission_check() {
        let engine = PolicyEngine::new();
        let ctx = owner_context();
        
        let decision = engine.evaluate(
            "get_cpu_usage",
            &RiskLevel::Low,
            &["read:metrics".to_string()], // owner doesn't have this explicitly
            &ctx,
        );
        
        assert!(matches!(decision, PolicyDecision::Allow));
    }
    
    #[test]
    fn test_custom_policy_config() {
        // Allow high risk without authorization
        let engine = PolicyEngine::with_config(RiskLevel::High, true, false);
        let ctx = owner_context();
        
        let decision = engine.evaluate(
            "execute_command",
            &RiskLevel::High,
            &[],
            &ctx,
        );
        
        assert!(matches!(decision, PolicyDecision::Allow));
    }
}
