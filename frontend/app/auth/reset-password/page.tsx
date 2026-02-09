'use client';

import { useState, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, Lock } from 'lucide-react';
import { PasswordInput } from '@/components/ui/password-input';
import { FormError } from '@/components/ui/form-error';
import { SecurityIndicators } from '@/components/auth/security-indicators';
import { z } from 'zod';
import { authApi } from '@/lib/api/auth';

// Schema for password reset
const resetPasswordSchema = z
    .object({
        password: z.string().min(8, 'Password must be at least 8 characters'),
        confirmPassword: z.string().min(1, 'Please confirm your password'),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [isLoading, setIsLoading] = useState(false);
    const [isValidating, setIsValidating] = useState(true);
    const [isTokenValid, setIsTokenValid] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
    } = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordSchema),
    });

    const passwordValue = watch('password');

    // Validate token on mount
    useEffect(() => {
        const validateToken = async () => {
            if (!token) {
                setIsValidating(false);
                return;
            }

            try {
                const isValid = await authApi.validateResetToken(token);
                setIsTokenValid(isValid);
            } catch {
                setIsTokenValid(false);
            } finally {
                setIsValidating(false);
            }
        };

        validateToken();
    }, [token]);

    const onSubmit = async (data: ResetPasswordFormData) => {
        if (!token) {
            toast.error('Invalid reset token');
            return;
        }

        setIsLoading(true);

        try {
            await authApi.resetPassword(token, data.password);
            setIsSuccess(true);
            toast.success('Password reset successfully!');
        } catch (error) {
            const err = error as Error;
            toast.error(err.message || 'Failed to reset password. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Show loading state while validating token
    if (isValidating) {
        return (
            <Card className="w-full max-w-md border-border shadow-2xl backdrop-blur-sm bg-card/95">
                <CardContent className="pt-12 pb-8">
                    <div className="flex flex-col items-center justify-center space-y-6">
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Validating reset link...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Show error if no token or invalid token
    if (!token || !isTokenValid) {
        return (
            <Card className="w-full max-w-md border-border shadow-2xl backdrop-blur-sm bg-card/95">
                <CardContent className="pt-12 pb-8">
                    <div className="flex flex-col items-center justify-center space-y-6">
                        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20">
                            <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-500" />
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-semibold">Invalid or Expired Link</h3>
                            <p className="text-sm text-muted-foreground">
                                This password reset link is invalid or has expired.
                            </p>
                        </div>
                        <Button onClick={() => router.push('/auth/signin')} variant="outline">
                            Back to Sign In
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Show success state
    if (isSuccess) {
        return (
            <Card className="w-full max-w-md border-border shadow-2xl backdrop-blur-sm bg-card/95">
                <CardContent className="pt-12 pb-8">
                    <div className="flex flex-col items-center justify-center space-y-6">
                        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20">
                            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-500" />
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-semibold">Password Reset Successful!</h3>
                            <p className="text-sm text-muted-foreground">
                                Your password has been reset successfully. You can now sign in with your new password.
                            </p>
                        </div>
                        <Button onClick={() => router.push('/auth/signin')} className="mt-4">
                            Sign In
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
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
                        <Lock className="w-8 h-8 text-primary" />
                    </div>
                </div>
                <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
                <CardDescription>Enter your new password below</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* New Password */}
                    <div className="space-y-2">
                        <Label htmlFor="password">New Password</Label>
                        <PasswordInput
                            id="password"
                            placeholder="Enter your new password"
                            disabled={isLoading}
                            showStrengthMeter={true}
                            error={errors.password?.message}
                            value={passwordValue}
                            {...register('password')}
                        />
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <PasswordInput
                            id="confirmPassword"
                            placeholder="Confirm your new password"
                            disabled={isLoading}
                            showStrengthMeter={false}
                            error={errors.confirmPassword?.message}
                            {...register('confirmPassword')}
                        />
                    </div>

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        className="w-full transition-all duration-200 hover:shadow-lg"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Resetting password...
                            </>
                        ) : (
                            <>
                                Reset Password
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
                <SecurityIndicators />

                <p className="text-center text-sm text-muted-foreground">
                    Remember your password?{' '}
                    <Link
                        href="/auth/signin"
                        className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded px-1"
                    >
                        Sign in
                    </Link>
                </p>
            </CardFooter>
        </Card>
    );
}

export default function ResetPasswordPage() {
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
                <ResetPasswordContent />
            </Suspense>
        </div>
    );
}
