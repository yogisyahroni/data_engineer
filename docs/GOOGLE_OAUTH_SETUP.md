# Google OAuth2 SSO Setup Guide

## Overview

This guide explains how to configure Google Workspace Single Sign-On (SSO) for InsightEngine (TASK-007-008).

## Prerequisites

- Google Cloud Project
- Google Workspace admin access (optional, for domain-wide deployment)
- Access to Google Cloud Console

## Setup Steps

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your Project ID

### 2. Enable Google+ API

1. Navigate to **APIs & Services** > **Library**
2. Search for "Google+ API"
3. Click **Enable**

### 3. Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Select **Internal** (for Google Workspace) or **External** (for public apps)
3. Fill in required fields:
   - **App name**: InsightEngine
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Add scopes:
   - `...auth/userinfo.email`
   - `...auth/userinfo.profile`
   - `openid`
5. Click **Save and Continue**

### 4. Create OAuth 2.0 Client ID

1. Navigate to **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
3. Select **Web application**
4. Configure:
   - **Name**: InsightEngine Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (development)
     - `https://yourdomain.com` (production)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/callback/google` (development)
     - `https://yourdomain.com/api/auth/callback/google` (production)
5. Click **Create**
6. **IMPORTANT**: Copy the **Client ID** and **Client Secret**

### 5. Update Environment Variables

Add the credentials to your `.env` file:

```bash
# Google OAuth2 Configuration
GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-client-secret
```

### 6. Restart the Application

```bash
# In frontend directory
npm run dev
```

## Testing

1. Navigate to `http://localhost:3000/auth/signin`
2. Click "Continue with Google Workspace"
3. Sign in with your Google account
4. Grant permissions
5. You should be redirected to `/dashboards`

## Security Best Practices

### Production Deployment

1. **Use HTTPS**: Always use HTTPS in production
2. **Restrict Origins**: Only whitelist your actual domain
3. **Enable Domain Verification**: Verify domain ownership in Google Console
4. **Review Permissions**: Regularly audit OAuth scopes
5. **Monitor Usage**: Check OAuth usage in Google Cloud Console

### Google Workspace Admin

For organization-wide deployment:

1. Go to **Google Workspace Admin Console**
2. Navigate to **Security** > **API Controls** > **Manage Third-Party App Access**
3. Add InsightEngine OAuth Client ID to trusted apps
4. Set access level (domain-wide or specific OUs)

## Troubleshooting

### "Redirect URI Mismatch" Error

- Verify the redirect URI in Google Console EXACTLY matches:
  - `http://localhost:3000/api/auth/callback/google` (dev)
  - Do NOT include trailing slashes
  - Protocol (http/https) must match

### "Access Blocked: This app's request is invalid"

- Ensure OAuth consent screen is properly configured
- Check that all required scopes are added
- Verify app is published (if using External user type)

### "Invalid Client" Error

- Double-check `GOOGLE_CLIENT_ID` in `.env`
- Ensure Client ID ends with `.apps.googleusercontent.com`
- Verify no extra spaces in .env file

### User Not Redirected After Login

- Check NextAuth configuration in `lib/auth/auth-options.ts`
- Verify redirect callback is set to `/dashboards`
- Check browser console for errors

## Implementation Details

### Files Modified (TASK-007-008)

- `frontend/lib/auth/auth-options.ts` - Added GoogleProvider
- `frontend/components/auth/sso-providers.tsx` - Integrated signIn
- `frontend/components/auth/google-button.tsx` - New component
- `frontend/.env` - Added Google OAuth credentials

### Architecture

```mermaid
User clicks "Continue with Google"
                ↓
NextAuth triggers signIn('google')
                ↓
Redirects to Google OAuth consent page
                ↓
User grants permission
                ↓
Google redirects to /api/auth/callback/google
                ↓
NextAuth validates response, creates session
                ↓
User redirected to /dashboards
```

## References

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [NextAuth.js Google Provider](https://next-auth.js.org/providers/google)
- [Google Cloud Console](https://console.cloud.google.com/)

## Support

For issues, contact the development team or refer to the main README.
