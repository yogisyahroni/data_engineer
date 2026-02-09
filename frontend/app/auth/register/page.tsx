'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Mail, User, ArrowRight, CheckCircle2 } from 'lucide-react';
import { PasswordInput } from '@/components/ui/password-input';
import { FormError } from '@/components/ui/form-error';
import { SecurityIndicators } from '@/components/auth/security-indicators';
import { SSOProviders } from '@/components/auth/sso-providers';
import {
    registerSchema,
    type RegisterFormData,
    calculatePasswordStrength,
    getPasswordStrengthLabel,
    getPasswordStrengthColor,
} from '@/lib/validations/auth';
import { authApi } from '@/lib/api/auth';

export default function RegisterPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [registeredEmail, setRegisteredEmail] = useState('');

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
        setValue,
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            email: '',
            username: '',
            password: '',
            confirmPassword: '',
            fullName: '',
            agreeTerms: false,
        },
    });

    // Watch password for strength meter
    const passwordValue = watch('password');
    const passwordStrength = calculatePasswordStrength(passwordValue);
    const passwordStrengthLabel = getPasswordStrengthLabel(passwordStrength);
    const passwordStrengthColor = getPasswordStrengthColor(passwordStrength);

    const onSubmit = async (data: RegisterFormData) => {
        setIsLoading(true);

        try {
            const response = await authApi.register(data);

            if (response.status === 'success') {
                setIsSuccess(true);
                setRegisteredEmail(response.data.email);
                toast.success('Account created successfully! Please sign in.');
            }
        } catch (error) {
            const err = error as Error & { status?: number; errors?: Array<{ field: string; message: string }> };

            if (err.status === 409) {
                // Conflict - email or username already exists
                toast.error(err.message || 'Email or username already exists');
            } else if (err.status === 400 && err.errors) {
                // Validation errors
                err.errors.forEach((fieldError) => {
                    toast.error(`${fieldError.field}: ${fieldError.message}`);
                });
            } else {
                toast.error(err.message || 'Registration failed. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Success state - show confirmation and redirect option
    if (isSuccess) {
        return (
            <Card className="w-full max-w-md border-border shadow-2xl backdrop-blur-sm bg-card/95">
                <CardContent className="pt-12 pb-8">
                    <div className="flex flex-col items-center justify-center space-y-6">
                        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 animate-in zoom-in-50 duration-300">
                            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-500" />
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-semibold">Registration Successful!</h3>
                            <p className="text-sm text-muted-foreground">
                                Your account <strong>{registeredEmail}</strong> has been created.
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Please sign in to continue.
                            </p>
                        </div>
                        <Button
                            onClick={() => router.push('/auth/signin')}
                            className="mt-4"
                        >
                            Go to Sign In
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
                        <div className="text-3xl font-bold bg-gradient-to-br from-primary to-primary/70 bg-clip-text text-transparent">
                            IE
                        </div>
                    </div>
                </div>
                <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
                <CardDescription>
                    Sign up to start your AI-powered analytics journey
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Full Name Input */}
                    <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name (Optional)</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="fullName"
                                type="text"
                                placeholder="John Doe"
                                className="pl-9"
                                disabled={isLoading}
                                aria-invalid={errors.fullName ? 'true' : 'false'}
                                aria-describedby={errors.fullName ? 'fullname-error' : undefined}
                                {...register('fullName')}
                            />
                        </div>
                        {errors.fullName && (
                            <FormError id="fullname-error" message={errors.fullName.message} />
                        )}
                    </div>

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

                    {/* Username Input */}
                    <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="username"
                                type="text"
                                placeholder="johndoe123"
                                className="pl-9"
                                disabled={isLoading}
                                aria-invalid={errors.username ? 'true' : 'false'}
                                aria-describedby={errors.username ? 'username-error' : undefined}
                                {...register('username')}
                            />
                        </div>
                        {errors.username && (
                            <FormError id="username-error" message={errors.username.message} />
                        )}
                        <p className="text-xs text-muted-foreground">
                            3-50 characters, letters, numbers, underscores, hyphens only
                        </p>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <PasswordInput
                            id="password"
                            placeholder="Create a strong password"
                            disabled={isLoading}
                            showStrengthMeter={true}
                            strength={passwordStrength}
                            error={errors.password?.message}
                            value={passwordValue}
                            {...register('password')}
                        />
                        {passwordValue && (
                            <div className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground">Strength:</span>
                                <span style={{ color: passwordStrengthColor }}>
                                    {passwordStrengthLabel}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Confirm Password Input */}
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <PasswordInput
                            id="confirmPassword"
                            placeholder="Confirm your password"
                            disabled={isLoading}
                            showStrengthMeter={false}
                            error={errors.confirmPassword?.message}
                            {...register('confirmPassword')}
                        />
                    </div>

                    {/* Terms Agreement */}
                    <div className="space-y-2">
                        <div className="flex items-start space-x-2">
                            <Checkbox
                                id="agreeTerms"
                                checked={watch('agreeTerms')}
                                onCheckedChange={(checked) => setValue('agreeTerms', !!checked)}
                                disabled={isLoading}
                                aria-label="Agree to terms and conditions"
                            />
                            <div className="grid gap-1.5 leading-none">
                                <Label
                                    htmlFor="agreeTerms"
                                    className="text-sm font-normal cursor-pointer select-none"
                                >
                                    I agree to the{' '}
                                    <Link
                                        href="/terms"
                                        className="text-primary hover:underline"
                                        target="_blank"
                                    >
                                        Terms of Service
                                    </Link>{' '}
                                    and{' '}
                                    <Link
                                        href="/privacy"
                                        className="text-primary hover:underline"
                                        target="_blank"
                                    >
                                        Privacy Policy
                                    </Link>
                                </Label>
                                {errors.agreeTerms && (
                                    <FormError message={errors.agreeTerms.message} />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        className="w-full transition-all duration-200 hover:shadow-lg"
                        disabled={isLoading}
                        data-testid="register-submit-btn"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating account...
                            </>
                        ) : (
                            <>
                                Create Account
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

                {/* SSO Providers */}
                <div className="pt-2">
                    <SSOProviders isLoading={isLoading} />
                </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
                {/* Security Indicators */}
                <SecurityIndicators />

                {/* Sign In Link */}
                <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{' '}
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
