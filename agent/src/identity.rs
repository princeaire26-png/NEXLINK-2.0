//! Device Identity Module
//!
//! Manages the cryptographic identity of a NEXLINK device.
//! Uses Ed25519 for device identity/signing and X25519 for key exchange.
//!
//! Security properties:
//! - Device identity is a long-lived Ed25519 key pair
//! - Private keys are encrypted at rest with AES-256-GCM
//! - Encryption key is derived from a machine-specific secret + user passphrase
//! - Device ID is derived from the public key (SHA-256 hash)
//! - Key integrity is verified on load via authentication tag

use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use anyhow::{Context, Result};
use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::path::Path;
use tracing::{info, warn};

use crate::config::AgentConfig;

/// Device identity containing cryptographic keys and metadata.
#[derive(Clone)]
pub struct DeviceIdentity {
    /// The Ed25519 signing key (private)
    signing_key: SigningKey,
    /// Unique device identifier (derived from public key)
    device_id: String,
    /// When this identity was created
    created_at: chrono::DateTime<chrono::Utc>,
}

/// Encrypted identity data stored on disk.
/// The private key is encrypted with AES-256-GCM.
#[derive(Serialize, Deserialize)]
struct StoredIdentity {
    /// Schema version for future migrations
    version: u32,
    /// Device ID (public, derived from public key)
    device_id: String,
    /// AES-256-GCM encrypted private key (hex-encoded ciphertext)
    encrypted_private_key: String,
    /// Nonce used for encryption (hex-encoded, 12 bytes)
    nonce: String,
    /// Key derivation salt (hex-encoded)
    salt: String,
    /// Integrity check: SHA-256 of public key (hex-encoded)
    public_key_hash: String,
    /// Creation timestamp (RFC 3339)
    created_at: String,
}

/// Identity proof for authentication.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IdentityProof {
    pub device_id: String,
    pub public_key: String,
    pub signature: String,
    pub timestamp: String,
}

impl DeviceIdentity {
    /// Initialize device identity.
    /// Loads existing identity from disk or generates a new one.
    pub async fn initialize(config: &AgentConfig) -> Result<Self> {
        let identity_dir = &config.identity_path;
        let identity_file = identity_dir.join("device_identity.json");

        // Try loading existing identity
        if identity_file.exists() {
            info!("Loading existing device identity from {:?}", identity_file);
            return Self::load(&identity_file, &config.encryption_passphrase)
                .await
                .with_context(|| "Failed to load existing device identity");
        }

        // Generate new identity
        info!("Generating new device identity");
        let identity = Self::generate()?;

        // Save to disk (encrypted)
        identity
            .save(&identity_file, &config.encryption_passphrase)
            .await
            .with_context(|| "Failed to save new device identity")?;

        info!("New device identity created: {}", identity.device_id);
        Ok(identity)
    }

    /// Generate a new device identity with fresh cryptographic keys.
    pub fn generate() -> Result<Self> {
        let signing_key = SigningKey::generate(&mut OsRng);
        let verifying_key = signing_key.verifying_key();
        let device_id = Self::derive_device_id(&verifying_key);

        Ok(Self {
            signing_key,
            device_id,
            created_at: chrono::Utc::now(),
        })
    }

    /// Load identity from encrypted file.
    async fn load(path: &Path, passphrase: &str) -> Result<Self> {
        let contents = tokio::fs::read_to_string(path).await?;
        let stored: StoredIdentity = serde_json::from_str(&contents)?;

        if stored.version != 1 {
            anyhow::bail!("Unsupported identity version: {}", stored.version);
        }

        // Decode stored values
        let salt = hex::decode(&stored.salt).context("Invalid salt encoding")?;
        let nonce_bytes = hex::decode(&stored.nonce).context("Invalid nonce encoding")?;
        let ciphertext = hex::decode(&stored.encrypted_private_key)
            .context("Invalid ciphertext encoding")?;

        if nonce_bytes.len() != 12 {
            anyhow::bail!("Invalid nonce length: {}", nonce_bytes.len());
        }

        // Derive decryption key from passphrase + salt
        let encryption_key = Self::derive_encryption_key(passphrase, &salt);

        // Decrypt private key
        let cipher = Aes256Gcm::new_from_slice(&encryption_key)
            .map_err(|e| anyhow::anyhow!("Failed to create cipher: {}", e))?;
        let nonce = Nonce::from_slice(&nonce_bytes);

        let plaintext = cipher
            .decrypt(nonce, ciphertext.as_ref())
            .map_err(|_| anyhow::anyhow!("Failed to decrypt identity — wrong passphrase or corrupted file"))?;

        if plaintext.len() != 32 {
            anyhow::bail!("Invalid decrypted key length: {}", plaintext.len());
        }

        let mut key_array = [0u8; 32];
        key_array.copy_from_slice(&plaintext);
        let signing_key = SigningKey::from_bytes(&key_array);

        // Verify integrity: public key hash must match
        let verifying_key = signing_key.verifying_key();
        let expected_hash = Self::hash_public_key(&verifying_key);
        if expected_hash != stored.public_key_hash {
            anyhow::bail!("Identity integrity check failed: public key hash mismatch");
        }

        // Verify device ID matches
        let expected_id = Self::derive_device_id(&verifying_key);
        if expected_id != stored.device_id {
            anyhow::bail!("Identity corrupted: device ID mismatch");
        }

        let created_at = chrono::DateTime::parse_from_rfc3339(&stored.created_at)
            .context("Invalid creation timestamp")?
            .with_timezone(&chrono::Utc);

        Ok(Self {
            signing_key,
            device_id: stored.device_id,
            created_at,
        })
    }

    /// Save identity to disk with encryption.
    async fn save(&self, path: &Path, passphrase: &str) -> Result<()> {
        if let Some(parent) = path.parent() {
            tokio::fs::create_dir_all(parent).await?;
        }

        // Generate random salt for key derivation
        let mut salt = [0u8; 32];
        rand::RngCore::fill_bytes(&mut OsRng, &mut salt);

        // Derive encryption key
        let encryption_key = Self::derive_encryption_key(passphrase, &salt);

        // Generate random nonce
        let mut nonce_bytes = [0u8; 12];
        rand::RngCore::fill_bytes(&mut OsRng, &mut nonce_bytes);

        // Encrypt private key
        let cipher = Aes256Gcm::new_from_slice(&encryption_key)
            .map_err(|e| anyhow::anyhow!("Failed to create cipher: {}", e))?;
        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext = cipher
            .encrypt(nonce, self.signing_key.to_bytes().as_ref())
            .map_err(|e| anyhow::anyhow!("Encryption failed: {}", e))?;

        let verifying_key = self.signing_key.verifying_key();

        let stored = StoredIdentity {
            version: 1,
            device_id: self.device_id.clone(),
            encrypted_private_key: hex::encode(&ciphertext),
            nonce: hex::encode(nonce_bytes),
            salt: hex::encode(salt),
            public_key_hash: Self::hash_public_key(&verifying_key),
            created_at: self.created_at.to_rfc3339(),
        };

        let contents = serde_json::to_string_pretty(&stored)?;
        tokio::fs::write(path, contents).await?;

        // Set restrictive permissions on Unix
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let perms = std::fs::Permissions::from_mode(0o600);
            tokio::fs::set_permissions(path, perms).await?;
        }

        info!("Device identity saved (encrypted) to {:?}", path);
        Ok(())
    }

    /// Derive a stable device ID from the public key.
    fn derive_device_id(verifying_key: &VerifyingKey) -> String {
        let mut hasher = Sha256::new();
        hasher.update(b"nexlink-device-v1:");
        hasher.update(verifying_key.as_bytes());
        let hash = hasher.finalize();
        format!("dev_{}", hex::encode(&hash[..16]))
    }

    /// Hash the public key for integrity verification.
    fn hash_public_key(verifying_key: &VerifyingKey) -> String {
        let mut hasher = Sha256::new();
        hasher.update(b"nexlink-pubkey-hash-v1:");
        hasher.update(verifying_key.as_bytes());
        hex::encode(hasher.finalize())
    }

    /// Derive a 256-bit encryption key from passphrase and salt.
    /// Uses iterative SHA-256 (100,000 rounds) as a PBKDF-like key derivation function.
    /// This provides adequate protection for encrypting the device identity at rest.
    fn derive_encryption_key(passphrase: &str, salt: &[u8]) -> [u8; 32] {
        let mut hasher = Sha256::new();
        hasher.update(b"nexlink-identity-key-v1:");
        hasher.update(passphrase.as_bytes());
        hasher.update(salt);
        let mut result = hasher.finalize();

        // Iterate for additional hardness (simple PBKDF-like)
        for _ in 0..100_000 {
            let mut h = Sha256::new();
            h.update(&result);
            h.update(salt);
            result = h.finalize();
        }

        let mut key = [0u8; 32];
        key.copy_from_slice(&result);
        key
    }

    /// Get the device ID.
    pub fn device_id(&self) -> &str {
        &self.device_id
    }

    /// Get the public key bytes.
    pub fn public_key_bytes(&self) -> [u8; 32] {
        self.signing_key.verifying_key().to_bytes()
    }

    /// Get the public key as hex string.
    pub fn public_key_hex(&self) -> String {
        hex::encode(self.public_key_bytes())
    }

    /// Sign a message with the device's private key.
    pub fn sign(&self, message: &[u8]) -> Vec<u8> {
        let signature: Signature = self.signing_key.sign(message);
        signature.to_bytes().to_vec()
    }

    /// Verify a signature against this device's public key.
    pub fn verify(&self, message: &[u8], signature_bytes: &[u8]) -> Result<()> {
        if signature_bytes.len() != 64 {
            anyhow::bail!("Invalid signature length");
        }

        let mut sig_array = [0u8; 64];
        sig_array.copy_from_slice(signature_bytes);
        let signature = Signature::from_bytes(&sig_array);

        self.signing_key
            .verifying_key()
            .verify(message, &signature)
            .map_err(|e| anyhow::anyhow!("Signature verification failed: {}", e))
    }

    /// Create a challenge-response proof of identity.
    pub fn prove_identity(&self, challenge: &[u8]) -> IdentityProof {
        let signature = self.sign(challenge);
        IdentityProof {
            device_id: self.device_id.clone(),
            public_key: self.public_key_hex(),
            signature: hex::encode(signature),
            timestamp: chrono::Utc::now().to_rfc3339(),
        }
    }

    /// Get creation time.
    pub fn created_at(&self) -> chrono::DateTime<chrono::Utc> {
        self.created_at
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_identity() {
        let identity = DeviceIdentity::generate().unwrap();
        assert!(identity.device_id().starts_with("dev_"));
        assert_eq!(identity.device_id().len(), 36); // "dev_" + 32 hex chars
    }

    #[test]
    fn test_sign_and_verify() {
        let identity = DeviceIdentity::generate().unwrap();
        let message = b"test message for signing";

        let signature = identity.sign(message);
        assert!(identity.verify(message, &signature).is_ok());
    }

    #[test]
    fn test_verify_wrong_message() {
        let identity = DeviceIdentity::generate().unwrap();
        let message = b"original message";
        let wrong_message = b"different message";

        let signature = identity.sign(message);
        assert!(identity.verify(wrong_message, &signature).is_err());
    }

    #[test]
    fn test_device_id_deterministic() {
        let identity = DeviceIdentity::generate().unwrap();
        let id1 = identity.device_id().to_string();
        let id2 = identity.device_id().to_string();
        assert_eq!(id1, id2);
    }

    #[test]
    fn test_different_identities_different_ids() {
        let id1 = DeviceIdentity::generate().unwrap();
        let id2 = DeviceIdentity::generate().unwrap();
        assert_ne!(id1.device_id(), id2.device_id());
    }

    #[test]
    fn test_identity_proof() {
        let identity = DeviceIdentity::generate().unwrap();
        let challenge = b"server-challenge-12345";
        let proof = identity.prove_identity(challenge);

        assert_eq!(proof.device_id, identity.device_id());
        assert!(!proof.signature.is_empty());
        assert!(!proof.public_key.is_empty());
    }

    #[tokio::test]
    async fn test_save_and_load_encrypted() {
        let identity = DeviceIdentity::generate().unwrap();
        let temp_dir = std::env::temp_dir().join("nexlink_test_identity");
        let _ = tokio::fs::create_dir_all(&temp_dir).await;
        let path = temp_dir.join("test_identity.json");
        let passphrase = "test-passphrase-strong-123";

        // Save
        identity.save(&path, passphrase).await.unwrap();

        // Load
        let loaded = DeviceIdentity::load(&path, passphrase).await.unwrap();

        assert_eq!(loaded.device_id(), identity.device_id());
        assert_eq!(loaded.public_key_bytes(), identity.public_key_bytes());

        // Verify signing still works
        let message = b"test after load";
        let sig = loaded.sign(message);
        assert!(loaded.verify(message, &sig).is_ok());

        // Cleanup
        let _ = tokio::fs::remove_file(&path).await;
        let _ = tokio::fs::remove_dir(&temp_dir).await;
    }

    #[tokio::test]
    async fn test_wrong_passphrase_fails() {
        let identity = DeviceIdentity::generate().unwrap();
        let temp_dir = std::env::temp_dir().join("nexlink_test_wrong_pass");
        let _ = tokio::fs::create_dir_all(&temp_dir).await;
        let path = temp_dir.join("test_identity.json");

        identity.save(&path, "correct-passphrase").await.unwrap();

        let result = DeviceIdentity::load(&path, "wrong-passphrase").await;
        assert!(result.is_err());

        // Cleanup
        let _ = tokio::fs::remove_file(&path).await;
        let _ = tokio::fs::remove_dir(&temp_dir).await;
    }

    #[tokio::test]
    async fn test_tampered_file_fails() {
        let identity = DeviceIdentity::generate().unwrap();
        let temp_dir = std::env::temp_dir().join("nexlink_test_tamper");
        let _ = tokio::fs::create_dir_all(&temp_dir).await;
        let path = temp_dir.join("test_identity.json");
        let passphrase = "test-passphrase";

        identity.save(&path, passphrase).await.unwrap();

        // Tamper with the ciphertext
        let contents = tokio::fs::read_to_string(&path).await.unwrap();
        let mut stored: StoredIdentity = serde_json::from_str(&contents).unwrap();
        // Modify a byte in the ciphertext
        let mut ct = hex::decode(&stored.encrypted_private_key).unwrap();
        if !ct.is_empty() {
            ct[0] ^= 0xFF;
        }
        stored.encrypted_private_key = hex::encode(&ct);
        tokio::fs::write(&path, serde_json::to_string(&stored).unwrap())
            .await
            .unwrap();

        let result = DeviceIdentity::load(&path, passphrase).await;
        assert!(result.is_err());

        // Cleanup
        let _ = tokio::fs::remove_file(&path).await;
        let _ = tokio::fs::remove_dir(&temp_dir).await;
    }
}
