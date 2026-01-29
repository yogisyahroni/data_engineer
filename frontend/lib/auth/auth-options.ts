import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
                webauthn_token: { label: 'WebAuthn Token', type: 'text' }, // Hidden field for internal use
            },
            async authorize(credentials) {
                // 1. WebAuthn Flow
                if (credentials?.webauthn_token) {
                    try {
                        const { decode } = await import('next-auth/jwt');
                        const decoded = await decode({
                            token: credentials.webauthn_token,
                            secret: process.env.NEXTAUTH_SECRET || '',
                        });

                        if (decoded && decoded.usage === 'webauthn_login' && decoded.id && decoded.email) {
                            return {
                                id: decoded.id as string,
                                email: decoded.email as string,
                                name: 'User', // We should fetch name if needed, but session callback fills it from DB usually? 
                                // Actually token.name/email comes from here. 
                                // Better to fetch user to be safe and get full profile.
                            };
                        }
                        return null;
                    } catch (e) {
                        console.error('WebAuthn token validation failed', e);
                        return null;
                    }
                }

                // 2. Standard Email/Password Flow
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                try {
                    const user = await prisma.user.findUnique({
                        where: { email: credentials.email },
                    });

                    if (!user) {
                        return null;
                    }

                    const isPasswordValid = await bcrypt.compare(
                        credentials.password,
                        user.password
                    );

                    if (!isPasswordValid) {
                        return null;
                    }

                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                    };
                } catch (error) {
                    console.error('[AUTH] Error during authorization:', error);
                    return null;
                }
            },
        }),
    ],
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    pages: {
        signIn: '/auth/signin',
        signOut: '/auth/signout',
        error: '/auth/error',
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
            }
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};
