package providers

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"encoding/xml"
	"fmt"
	"math/big"
	"net/http"
	"net/url"
	"os"
	"time"

	"github.com/crewjam/saml"
	"github.com/crewjam/saml/samlsp"
)

/**
 * SAML 2.0 Provider (TASK-084)
 *
 * Implements OAuthProvider interface for SAML 2.0 authentication
 * This is significantly more complex than OAuth due to XML signatures and metadata
 *
 * SAML Flow:
 * 1. User initiates login → SP generates AuthnRequest
 * 2. SP redirects to IdP with signed AuthnRequest
 * 3. User authenticates at IdP
 * 4. IdP POSTs signed SAML Response to ACS URL
 * 5. SP validates signature, extracts user attributes
 * 6. SP creates user session
 */

// SAMLProvider handles SAML 2.0 authentication
type SAMLProvider struct {
	middleware *samlsp.Middleware
	rootURL    string
}

// NewSAMLProvider creates a new SAML provider
// This is more complex than OAuth providers due to certificate management
func NewSAMLProvider() (*SAMLProvider, error) {
	idpMetadataURL := os.Getenv("SAML_IDP_METADATA_URL")
	if idpMetadataURL == "" {
		return nil, fmt.Errorf("SAML_IDP_METADATA_URL is required")
	}

	rootURL := os.Getenv("SAML_SP_ENTITY_ID")
	if rootURL == "" {
		rootURL = "http://localhost:8080" // Default for development
	}

	// Load SP certificate and private key
	certPath := os.Getenv("SAML_SP_CERT")
	keyPath := os.Getenv("SAML_SP_KEY")

	if certPath == "" || keyPath == "" {
		// Generate self-signed certificate for development
		// In production, use proper certificates
		return nil, fmt.Errorf("SAML_SP_CERT and SAML_SP_KEY are required")
	}

	// Load certificate
	certPEM, err := os.ReadFile(certPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read SP certificate: %w", err)
	}

	certBlock, _ := pem.Decode(certPEM)
	if certBlock == nil {
		return nil, fmt.Errorf("failed to decode SP certificate PEM")
	}

	cert, err := x509.ParseCertificate(certBlock.Bytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse SP certificate: %w", err)
	}

	// Load private key
	keyPEM, err := os.ReadFile(keyPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read SP private key: %w", err)
	}

	keyBlock, _ := pem.Decode(keyPEM)
	if keyBlock == nil {
		return nil, fmt.Errorf("failed to decode SP private key PEM")
	}

	privateKey, err := x509.ParsePKCS1PrivateKey(keyBlock.Bytes)
	if err != nil {
		// Try PKCS8 format (more common in modern certificates)
		key, err2 := x509.ParsePKCS8PrivateKey(keyBlock.Bytes)
		if err2 != nil {
			return nil, fmt.Errorf("failed to parse SP private key (tried both PKCS1 and PKCS8): %v, %v", err, err2)
		}
		var ok bool
		privateKey, ok = key.(*rsa.PrivateKey)
		if !ok {
			return nil, fmt.Errorf("private key is not RSA")
		}
	}

	// Fetch IdP metadata
	idpMetadataURLParsed, err := url.Parse(idpMetadataURL)
	if err != nil {
		return nil, fmt.Errorf("invalid SAML_IDP_METADATA_URL: %w", err)
	}

	idpMetadata, err := samlsp.FetchMetadata(
		context.Background(),
		http.DefaultClient,
		*idpMetadataURLParsed,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch IdP metadata: %w", err)
	}

	// Parse root URL
	rootURLParsed, err := url.Parse(rootURL)
	if err != nil {
		return nil, fmt.Errorf("invalid SAML_SP_ENTITY_ID: %w", err)
	}

	// Create SAML Service Provider
	samlSP, err := samlsp.New(samlsp.Options{
		URL:               *rootURLParsed,
		Key:               privateKey,
		Certificate:       cert,
		IDPMetadata:       idpMetadata,
		AllowIDPInitiated: true, // Allow IdP-initiated login
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create SAML SP: %w", err)
	}

	return &SAMLProvider{
		middleware: samlSP,
		rootURL:    rootURL,
	}, nil
}

// GetAuthURL returns the SAML authorization URL (redirects to IdP)
// For SAML, this generates an AuthnRequest and returns the IdP SSO URL
func (p *SAMLProvider) GetAuthURL(state string) string {
	// In SAML, the state is typically handled via RelayState parameter
	// The actual AuthnRequest generation is handled by the middleware
	// Return the SSO URL where the user should be redirected
	return p.middleware.ServiceProvider.GetSSOBindingLocation(saml.HTTPRedirectBinding)
}

// HandleCallback processes the SAML assertion from IdP
// Note: SAML uses POST, not GET with code parameter like OAuth
// This method adapts SAML flow to OAuthProvider interface
func (p *SAMLProvider) HandleCallback(ctx context.Context, code string) (*ProviderUserInfo, error) {
	// SAML doesn't use authorization codes like OAuth
	// Instead, the assertion is POSTed to the ACS URL
	// This method is called after the SAML middleware has validated the assertion

	// In practice, the SAML assertion handling is done in a separate HTTP handler
	// that uses the samlsp.Middleware directly
	// This method exists for interface compatibility but shouldn't be called directly

	return nil, fmt.Errorf("SAML HandleCallback should not be called directly - use SAML middleware")
}

// ExtractUserInfoFromAssertion extracts user info from SAML assertion
// This is called by the SAML handler after assertion validation
func (p *SAMLProvider) ExtractUserInfoFromAssertion(assertion *saml.Assertion) (*ProviderUserInfo, error) {
	if assertion == nil {
		return nil, fmt.Errorf("assertion is nil")
	}

	// Extract NameID (unique identifier)
	nameID := ""
	if assertion.Subject != nil && assertion.Subject.NameID != nil {
		nameID = assertion.Subject.NameID.Value
	}

	if nameID == "" {
		return nil, fmt.Errorf("assertion missing NameID")
	}

	// Initialize user info
	userInfo := &ProviderUserInfo{
		ProviderID:       nameID,
		Provider:         "saml",
		EmailVerified:    true, // SAML assertions are from trusted IdP
		AdditionalClaims: make(map[string]interface{}),
	}

	// Extract attributes from assertion
	// Attribute names vary by IdP - we try common ones
	for _, stmt := range assertion.AttributeStatements {
		for _, attr := range stmt.Attributes {
			// Store all attributes
			if len(attr.Values) > 0 {
				userInfo.AdditionalClaims[attr.Name] = attr.Values[0].Value
			}

			// Map common SAML attributes to standard fields
			switch attr.FriendlyName {
			case "email", "emailAddress":
				if len(attr.Values) > 0 {
					userInfo.Email = attr.Values[0].Value
				}
			case "givenName", "firstName":
				if len(attr.Values) > 0 {
					userInfo.GivenName = attr.Values[0].Value
				}
			case "sn", "surname", "lastName":
				if len(attr.Values) > 0 {
					userInfo.FamilyName = attr.Values[0].Value
				}
			case "displayName", "cn", "commonName":
				if len(attr.Values) > 0 {
					userInfo.Name = attr.Values[0].Value
				}
			}

			// Try attribute name (not just friendly name)
			switch attr.Name {
			case "urn:oid:0.9.2342.19200300.100.1.3", "mail", "email":
				if len(attr.Values) > 0 && userInfo.Email == "" {
					userInfo.Email = attr.Values[0].Value
				}
			case "urn:oid:2.5.4.42", "givenName":
				if len(attr.Values) > 0 && userInfo.GivenName == "" {
					userInfo.GivenName = attr.Values[0].Value
				}
			case "urn:oid:2.5.4.4", "sn", "surname":
				if len(attr.Values) > 0 && userInfo.FamilyName == "" {
					userInfo.FamilyName = attr.Values[0].Value
				}
			case "urn:oid:2.16.840.1.113730.3.1.241", "displayName":
				if len(attr.Values) > 0 && userInfo.Name == "" {
					userInfo.Name = attr.Values[0].Value
				}
			}
		}
	}

	// Construct full name from given/family name if not provided
	if userInfo.Name == "" && (userInfo.GivenName != "" || userInfo.FamilyName != "") {
		userInfo.Name = userInfo.GivenName + " " + userInfo.FamilyName
	}

	// Email is required
	if userInfo.Email == "" {
		return nil, fmt.Errorf("assertion missing email attribute")
	}

	return userInfo, nil
}

// GetMiddleware returns the SAML middleware for HTTP handler registration
// This is needed because SAML requires special HTTP handling (POST)
func (p *SAMLProvider) GetMiddleware() *samlsp.Middleware {
	return p.middleware
}

// GetProviderName returns "saml"
func (p *SAMLProvider) GetProviderName() string {
	return "saml"
}

// IsConfigured checks if SAML is properly configured
func (p *SAMLProvider) IsConfigured() bool {
	// SAML requires more configuration than OAuth
	return os.Getenv("SAML_IDP_METADATA_URL") != "" &&
		os.Getenv("SAML_SP_CERT") != "" &&
		os.Getenv("SAML_SP_KEY") != ""
}

// GetMetadataXML generates SP metadata XML for the IdP
// IdP administrators need this to configure the SAML connection
func (p *SAMLProvider) GetMetadataXML() ([]byte, error) {
	metadata := p.middleware.ServiceProvider.Metadata()
	return xml.Marshal(metadata)
}

// GetCertificate returns the SP certificate for development/testing
// In production, use proper certificate management
func GenerateSelfSignedCertificate() (*x509.Certificate, *rsa.PrivateKey, error) {
	// This is a helper for development
	// PRODUCTION MUST USE PROPER CERTIFICATES
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return nil, nil, err
	}

	template := &x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject: pkix.Name{
			Organization: []string{"InsightEngine Development"},
		},
		NotBefore: time.Now(),
		NotAfter:  time.Now().Add(365 * 24 * time.Hour), // 1 year

		KeyUsage:              x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
	}

	certDER, err := x509.CreateCertificate(rand.Reader, template, template, &privateKey.PublicKey, privateKey)
	if err != nil {
		return nil, nil, err
	}

	cert, err := x509.ParseCertificate(certDER)
	if err != nil {
		return nil, nil, err
	}

	return cert, privateKey, nil
}
