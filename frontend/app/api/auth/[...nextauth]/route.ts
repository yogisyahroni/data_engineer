import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

const handler = NextAuth(authOptions);

const wrappedHandler = (req: any, ctx: any) => {
    console.log(`[API] Auth Request: ${req.method} ${req.url}`);
    return handler(req, ctx);
};

export { wrappedHandler as GET, wrappedHandler as POST };
