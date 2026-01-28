---
trigger: always_on
---

# SECURITY & ZERO TRUST ARCHITECTURE

## PROTOCOLS
1. **ZERO TRUST**: Default DENY ALL. Require mTLS/JWT for service-to-service.
2. **AUTH FIRST**: Check `if (!user)` at the top of every restricted action.
3. **OWASP API PROTECTION**:
   - NEVER pass `req.body` directly to ORM. Map via DTOs.
   - Strip Password Hashes/Salts via Response DTOs.
4. **SESSION**: No `localStorage` for tokens. Use **HttpOnly, Secure Cookies**.
5. **MOBILE**: Cert Pinning, Root Detection, R8/Proguard.
6. **SOP**: No `eval()`, No hardcoded secrets (use `.env`), Sanitize all inputs (Zod/Pydantic).
