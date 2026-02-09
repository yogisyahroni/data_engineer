'use client';

import { useState, Suspense, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Mail, ArrowRight } from 'lucide-react';
// import { WebAuthnSignin } from '@/components/auth/webauthn-signin'; // Disabled until backend API ready
import { ForgotPasswordModal } from '@/components/auth/forgot-password-modal';
import { SSOProviders } from '@/components/auth/sso-providers';
import { SecurityIndicators } from '@/components/auth/security-indicators';
import { PasswordInput } from '@/components/ui/password-input';
import { FormError } from '@/components/ui/form-error';
import { signInSchema, type SignInFormData } from '@/lib/validations/auth';

function SignInContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboards';

    const [isLoading, setIsLoading] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [successRedirect, setSuccessRedirect] = useState(false);
    const [redirectCountdown, setRedirectCountdown] = useState(1); // Reduced from 3 to 1 for faster UX

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
        setValue,
    } = useForm<SignInFormData>({
        resolver: zodResolver(signInSchema),
        defaultValues: {
            email: '',
            password: '',
            rememberMe: false,
        },
    });

    const passwordValue = watch('password');
    const rememberMeValue = watch('rememberMe');

    // Handle success redirect countdown
    useEffect(() => {
        if (successRedirect && redirectCountdown > 0) {
            const timer = setTimeout(() => {
                setRedirectCountdown(redirectCountdown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        }
        if (successRedirect && redirectCountdown === 0) {
            console.log('[SignIn] Redirecting to:', callbackUrl);
            // Use window.location.href for a hard navigation to ensure 
            // cookies are properly sent to the server for the protected page request.
            window.location.href = callbackUrl;
        }
    }, [successRedirect, redirectCountdown, callbackUrl]);

    const onSubmit = async (data: SignInFormData) => {
        setIsLoading(true);

        try {
            const result = await signIn('credentials', {
                email: data.email,
                password: data.password,
                redirect: false,
                callbackUrl,
            });

            if (result?.error) {
                // Specific error handling
                if (result.error.includes('credentials')) {
                    toast.error('Invalid email or password. Please try again.');
                } else if (result.error.includes('locked')) {
                    toast.error('Account is locked. Please contact support.');
                } else {
                    toast.error('Authentication failed. Please try again.');
                }
            } else {
                setSuccessRedirect(true);
                toast.success('Signed in successfully!');
            }
        } catch (error) {
            toast.error('An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (successRedirect) {
        return (
            <Card className="w-full max-w-md border-border shadow-2xl backdrop-blur-sm bg-card/95">
                <CardContent className="pt-12 pb-8">
                    <div className="flex flex-col items-center justify-center space-y-6">
                        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 animate-in zoom-in-50 duration-300">
                            <ArrowRight className="w-10 h-10 text-green-600 dark:text-green-500 animate-pulse" />
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-semibold">Sign In Successful!</h3>
                            <p className="text-sm text-muted-foreground">
                                Redirecting to dashboard in {redirectCountdown} seconds...
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-md border-border shadow-2xl backdrop-blur-sm bg-card/95 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
            <CardHeader className="space-y-1 text-center">
                <div className="mb-4 flex justify-center">
                    <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10">
                        <div className="text-3xl font-bold bg-gradient-to-br from-primary to-primary/70 bg-clip-text text-transparent">
                            IE
                        </div>
                    </div>
                </div>
                <CardTitle className="text-2xl font-bold">InsightEngine</CardTitle>
                <CardDescription>
                    Sign in to access your AI-powered analytics workspace
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Email Input */}
                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@company.com"
                                className="pl-9"
                                disabled={isLoading}
                                aria-invalid={errors.email ? 'true' : 'false'}
                                aria-describedby={errors.email ? 'email-error' : undefined}
                                {...register('email')}
                            />
                        </div>
                        {errors.email && (
                            <FormError id="email-error" message={errors.email.message} />
                        )}
                    </div>

                    {/* Password Input */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password">Password</Label>
                            <button
                                type="button"
                                onClick={() => setShowForgotPassword(true)}
                                className="text-xs text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded px-1"
                                disabled={isLoading}
                            >
                                Forgot password?
                            </button>
                        </div>
                        <PasswordInput
                            id="password"
                            placeholder="Enter your password"
                            disabled={isLoading}
                            showStrengthMeter={false}
                            error={errors.password?.message}
                            value={passwordValue}
                            {...register('password')}
                        />
                    </div>

                    {/* Remember Me */}
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="remember"
                            checked={rememberMeValue}
                            onCheckedChange={(checked) => setValue('rememberMe', !!checked)}
                            disabled={isLoading}
                            aria-label="Remember me for 30 days"
                        />
                        <Label
                            htmlFor="remember"
                            className="text-sm font-normal cursor-pointer select-none"
                        >
                            Remember me for 30 days
                        </Label>
                    </div>

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        className="w-full transition-all duration-200 hover:shadow-lg"
                        disabled={isLoading}
                        data-testid="signin-submit-btn"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            <>
                                Sign In
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </Button>
                </form>

                {/* Divider */}
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">
                            Or continue with
                        </span>
                    </div>
                </div>

                {/* WebAuthn - Disabled until backend API is implemented */}
                {/* <WebAuthnSignin /> */}

                {/* SSO Providers */}
                <div className="pt-2">
                    <SSOProviders isLoading={isLoading} />
                </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
                {/* Security Indicators */}
                <SecurityIndicators />

                {/* Sign Up Link */}
                <p className="text-center text-sm text-muted-foreground">
                    Don't have an account?{' '}
                    <Link
                        href="/auth/register"
                        className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded px-1"
                    >
                        Create account
                    </Link>
                </p>
            </CardFooter>

            {/* Forgot Password Modal */}
            <ForgotPasswordModal
                open={showForgotPassword}
                onOpenChange={setShowForgotPassword}
            />
        </Card>
    );
}

export default function SignInPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-muted/50 via-background to-muted/30 p-4 relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/5 rounded-full mix-blend-multiply filter blur-xl animate-blob" />
                <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-300/5 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000" />
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300/5 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000" />
            </div>

            <Suspense
                fallback={
                    <div className="flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                }
            >
                <SignInContent />
            </Suspense>
        </div>
    );
}
