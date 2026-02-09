import { withAuth } from "next-auth/middleware"

export default withAuth({
    pages: {
        signIn: '/auth/signin',
    },
})

export const config = {
    // Protect all routes except auth, api, static files, and root
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - / (root path - handles its own redirect logic)
         * - auth (authentication routes)
         * - api (API routes, handled separately or by backend)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - manifest.webmanifest (PWA manifest)
         * - icon-*.png, icon.svg (PWA icons)
         * 
         * CRITICAL: /dashboards IS NOW PROTECTED (removed from exclusion)
         */
        "/((?!auth|api|_next/static|_next/image|favicon.ico|manifest.webmanifest|icon-|$).*)"
    ]
}

