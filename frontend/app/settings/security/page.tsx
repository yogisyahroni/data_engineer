'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Lock, CheckCircle2, Shield, Key } from 'lucide-react';
import { PasswordInput } from '@/components/ui/password-input';
import { FormError } from '@/components/ui/form-error';
import { Separator } from '@/components/ui/separator';
import { z } from 'zod';
import { authApi } from '@/lib/api/auth';
import {
    calculatePasswordStrength,
    getPasswordStrengthLabel,
    getPasswordStrengthColor,
} from '@/lib/validations/auth';

// Schema for change password
const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, 'Current password is required'),
        newPassword: z.string().min(8, 'Password must be at least 8 characters'),
        confirmPassword: z.string().min(1, 'Please confirm your password'),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    });

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export default function SecuritySettingsPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
        reset,
    } = useForm<ChangePasswordFormData>({
        resolver: zodResolver(changePasswordSchema),
    });

    const newPasswordValue = watch('newPassword');
    const passwordStrength = calculatePasswordStrength(newPasswordValue);
    const passwordStrengthLabel = getPasswordStrengthLabel(passwordStrength);
    const passwordStrengthColor = getPasswordStrengthColor(passwordStrength);

    const onSubmit = async (data: ChangePasswordFormData) => {
        setIsLoading(true);

        try {
            await authApi.changePassword(data.currentPassword, data.newPassword);
            setIsSuccess(true);
            toast.success('Password changed successfully!');
            reset();

            // Reset success state after 3 seconds
            setTimeout(() => {
                setIsSuccess(false);
            }, 3000);
        } catch (error) {
            const err = error as Error;
            toast.error(err.message || 'Failed to change password. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container max-w-4xl py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Shield className="h-8 w-8 text-primary" />
                    Security Settings
                </h1>
                <p className="text-muted-foreground mt-2">
                    Manage your account security and password settings
                </p>
            </div>

            {/* Change Password Section */}
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Key className="h-5 w-5" />
                        Change Password
                    </CardTitle>
                    <CardDescription>
                        Update your password to keep your account secure
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isSuccess ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20">
                                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-500" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-lg font-semibold">Password Changed Successfully!</h3>
                                <p className="text-sm text-muted-foreground">
                                    Your password has been updated. Please use your new password for future logins.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            {/* Current Password */}
                            <div className="space-y-2">
                                <Label htmlFor="currentPassword">Current Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="currentPassword"
                                        type="password"
                                        placeholder="Enter your current password"
                                        className="pl-9"
                                        disabled={isLoading}
                                        aria-invalid={errors.currentPassword ? 'true' : 'false'}
                                        {...register('currentPassword')}
                                    />
                                </div>
                                {errors.currentPassword && (
                                    <FormError message={errors.currentPassword.message} />
                                )}
                            </div>

                            <Separator />

                            {/* New Password */}
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">New Password</Label>
                                <PasswordInput
                                    id="newPassword"
                                    placeholder="Enter your new password"
                                    disabled={isLoading}
                                    showStrengthMeter={true}
                                    strength={passwordStrength}
                                    error={errors.newPassword?.message}
                                    value={newPasswordValue}
                                    {...register('newPassword')}
                                />
                                {newPasswordValue && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-muted-foreground">Strength:</span>
                                        <span style={{ color: passwordStrengthColor }}>
                                            {passwordStrengthLabel}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Confirm New Password */}
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                <PasswordInput
                                    id="confirmPassword"
                                    placeholder="Confirm your new password"
                                    disabled={isLoading}
                                    showStrengthMeter={false}
                                    error={errors.confirmPassword?.message}
                                    {...register('confirmPassword')}
                                />
                            </div>

                            {/* Password Requirements */}
                            <div className="bg-muted p-4 rounded-lg">
                                <h4 className="text-sm font-medium mb-2">Password Requirements:</h4>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                    <li className={newPasswordValue.length >= 8 ? 'text-green-600' : ''}>
                                        • At least 8 characters
                                    </li>
                                    <li className={/[A-Z]/.test(newPasswordValue) ? 'text-green-600' : ''}>
                                        • At least one uppercase letter
                                    </li>
                                    <li className={/[a-z]/.test(newPasswordValue) ? 'text-green-600' : ''}>
                                        • At least one lowercase letter
                                    </li>
                                    <li className={/\d/.test(newPasswordValue) ? 'text-green-600' : ''}>
                                        • At least one number
                                    </li>
                                    <li className={/[^a-zA-Z0-9]/.test(newPasswordValue) ? 'text-green-600' : ''}>
                                        • At least one special character
                                    </li>
                                </ul>
                            </div>

                            {/* Submit Button */}
                            <div className="flex justify-end">
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="min-w-[150px]"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        'Change Password'
                                    )}
                                </Button>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>

            {/* Security Tips Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Security Tips</CardTitle>
                    <CardDescription>Best practices to keep your account secure</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <h4 className="font-medium">Use a Strong Password</h4>
                            <p className="text-sm text-muted-foreground">
                                Combine uppercase, lowercase, numbers, and special characters for maximum security.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-medium">Don't Reuse Passwords</h4>
                            <p className="text-sm text-muted-foreground">
                                Use unique passwords for different accounts to prevent credential stuffing attacks.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-medium">Update Regularly</h4>
                            <p className="text-sm text-muted-foreground">
                                Change your password every 3-6 months or immediately if you suspect compromise.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-medium">Enable 2FA When Available</h4>
                            <p className="text-sm text-muted-foreground">
                                Two-factor authentication adds an extra layer of security to your account.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
