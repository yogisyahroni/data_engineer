package services

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"io"
	"os"
)

// EncryptionService provides AES-256-GCM encryption for sensitive data
type EncryptionService struct {
	key []byte
}

// NewEncryptionService creates a new encryption service
// Requires ENCRYPTION_KEY environment variable (32 bytes for AES-256)
func NewEncryptionService() (*EncryptionService, error) {
	keyStr := os.Getenv("ENCRYPTION_KEY")
	if keyStr == "" {
		return nil, errors.New("ENCRYPTION_KEY environment variable not set")
	}

	// Decode base64 key or use raw string
	var key []byte
	decoded, err := base64.StdEncoding.DecodeString(keyStr)
	if err == nil && len(decoded) == 32 {
		key = decoded
	} else {
		key = []byte(keyStr)
	}

	// Key must be exactly 32 bytes for AES-256
	if len(key) != 32 {
		return nil, errors.New("ENCRYPTION_KEY must be 32 bytes (use: openssl rand -base64 32)")
	}

	return &EncryptionService{key: key}, nil
}

// Encrypt encrypts plaintext using AES-256-GCM
func (es *EncryptionService) Encrypt(plaintext string) (string, error) {
	if plaintext == "" {
		return "", errors.New("plaintext cannot be empty")
	}

	block, err := aes.NewCipher(es.key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	// Generate random nonce
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	// Encrypt and prepend nonce
	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)

	// Encode to base64 for storage
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt decrypts ciphertext using AES-256-GCM
func (es *EncryptionService) Decrypt(ciphertext string) (string, error) {
	if ciphertext == "" {
		return "", errors.New("ciphertext cannot be empty")
	}

	// Decode from base64
	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(es.key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", errors.New("ciphertext too short")
	}

	// Extract nonce and ciphertext
	nonce, ciphertextBytes := data[:nonceSize], data[nonceSize:]

	// Decrypt
	plaintext, err := gcm.Open(nil, nonce, ciphertextBytes, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

// MaskAPIKey masks an API key for display (e.g., "sk-...xyz")
func (es *EncryptionService) MaskAPIKey(apiKey string) string {
	if apiKey == "" {
		return ""
	}

	if len(apiKey) <= 8 {
		return "***"
	}

	// Show first 3 and last 4 characters
	return apiKey[:3] + "..." + apiKey[len(apiKey)-4:]
}
