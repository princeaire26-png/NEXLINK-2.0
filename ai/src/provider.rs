//! AI Provider Abstraction
//!
//! Provider-neutral interface supporting cloud, local, and self-hosted models.

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

/// Message role in a conversation.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    System,
    User,
    Assistant,
    Tool,
}

/// A message in a conversation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: Role,
    pub content: String,
    pub tool_call_id: Option<String>,
}

/// Tool definition for the AI model.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolSpec {
    pub name: String,
    pub description: String,
    pub parameters: serde_json::Value,
}

/// AI provider response.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderResponse {
    pub content: String,
    pub tool_calls: Vec<ToolCall>,
    pub finish_reason: String,
    pub usage: UsageInfo,
}

/// A tool call requested by the AI.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub id: String,
    pub name: String,
    pub arguments: serde_json::Value,
}

/// Token usage information.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageInfo {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

/// AI provider trait — all providers must implement this.
#[async_trait]
pub trait AiProvider: Send + Sync {
    /// Generate a response for a conversation.
    async fn generate(
        &self,
        messages: &[Message],
        tools: &[ToolSpec],
    ) -> Result<ProviderResponse, ProviderError>;
    
    /// Get the provider name.
    fn name(&self) -> &str;
    
    /// Check if the provider is available.
    async fn is_available(&self) -> bool;
}

/// Provider error.
#[derive(Debug, thiserror::Error)]
pub enum ProviderError {
    #[error("Authentication failed: {0}")]
    AuthenticationFailed(String),
    
    #[error("Rate limited")]
    RateLimited,
    
    #[error("Model not found: {0}")]
    ModelNotFound(String),
    
    #[error("Request failed: {0}")]
    RequestFailed(String),
    
    #[error("Provider unavailable")]
    Unavailable,
    
    #[error("Invalid response: {0}")]
    InvalidResponse(String),
}

/// Provider configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub provider_type: String,
    pub model: String,
    pub api_url: Option<String>,
    pub max_tokens: Option<u32>,
    pub temperature: Option<f32>,
}

#[cfg(test)]
mod tests {
    use super::*;
    
    struct MockProvider;
    
    #[async_trait]
    impl AiProvider for MockProvider {
        async fn generate(
            &self,
            _messages: &[Message],
            _tools: &[ToolSpec],
        ) -> Result<ProviderResponse, ProviderError> {
            Ok(ProviderResponse {
                content: "Mock response".to_string(),
                tool_calls: vec![],
                finish_reason: "stop".to_string(),
                usage: UsageInfo {
                    prompt_tokens: 10,
                    completion_tokens: 5,
                    total_tokens: 15,
                },
            })
        }
        
        fn name(&self) -> &str {
            "mock"
        }
        
        async fn is_available(&self) -> bool {
            true
        }
    }
    
    #[tokio::test]
    async fn test_mock_provider() {
        let provider = MockProvider;
        assert_eq!(provider.name(), "mock");
        assert!(provider.is_available().await);
        
        let response = provider.generate(&[], &[]).await.unwrap();
        assert_eq!(response.content, "Mock response");
        assert_eq!(response.finish_reason, "stop");
    }
    
    #[test]
    fn test_message_serialization() {
        let msg = Message {
            role: Role::User,
            content: "Hello".to_string(),
            tool_call_id: None,
        };
        
        let json = serde_json::to_string(&msg).unwrap();
        let decoded: Message = serde_json::from_str(&json).unwrap();
        assert_eq!(decoded.content, "Hello");
    }
}
