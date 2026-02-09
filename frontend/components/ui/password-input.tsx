'use client';

import * as React from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { calculatePasswordStrength, getPasswordStrengthLabel, getPasswordStrengthColor } from '@/lib/validations/auth';

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    showStrengthMeter?: boolean;
    error?: string;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
    ({ className, showStrengthMeter = false, error, value, ...props }, ref) => {
        const [showPassword, setShowPassword] = React.useState(false);
        const [capsLockOn, setCapsLockOn] = React.useState(false);

        const passwordValue = (value as string) || '';
        const strength = showStrengthMeter ? calculatePasswordStrength(passwordValue) : 0;
        const strengthLabel = getPasswordStrengthLabel(strength);
        const strengthColor = getPasswordStrengthColor(strength);

        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            // Detect Caps Lock
            if (e.getModifierState && e.getModifierState('CapsLock')) {
                setCapsLockOn(true);
            } else {
                setCapsLockOn(false);
            }

            // Pass through to parent handler
            if (props.onKeyDown) {
                props.onKeyDown(e);
            }
        };

        return (
            <div className="relative w-full space-y-2">
                <div className="relative">
                    <Input
                        type={showPassword ? 'text' : 'password'}
                        className={cn('pr-10', className, error && 'border-destructive focus-visible:ring-destructive')}
                        ref={ref}
                        value={value}
                        onKeyDown={handleKeyDown}
                        aria-invalid={error ? 'true' : 'false'}
                        aria-describedby={error ? 'password-error' : undefined}
                        {...props}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        tabIndex={-1}
                    >
                        {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                        ) : (
                            <Eye className="h-4 w-4" />
                        )}
                    </button>
                </div>

                {/* Caps Lock Warning */}
                {capsLockOn && (
                    <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-500" role="alert">
                        <AlertCircle className="h-3 w-3" />
                        <span>Caps Lock is on</span>
                    </div>
                )}

                {/* Password Strength Meter */}
                {showStrengthMeter && passwordValue.length > 0 && (
                    <div className="space-y-1">
                        <div className="flex gap-1">
                            {[0, 1, 2, 3, 4].map((level) => (
                                <div
                                    key={level}
                                    className={cn(
                                        'h-1 flex-1 rounded-full transition-all duration-300',
                                        level <= strength ? 'opacity-100' : 'opacity-20 bg-muted'
                                    )}
                                    style={{
                                        backgroundColor: level <= strength ? strengthColor : undefined,
                                    }}
                                    role="presentation"
                                />
                            ))}
                        </div>
                        <p
                            className="text-xs"
                            style={{ color: strengthColor }}
                            aria-live="polite"
                            aria-atomic="true"
                        >
                            Password strength: {strengthLabel}
                        </p>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <p
                        id="password-error"
                        className="text-xs text-destructive flex items-center gap-1"
                        role="alert"
                    >
                        <AlertCircle className="h-3 w-3" />
                        {error}
                    </p>
                )}
            </div>
        );
    }
);

PasswordInput.displayName = 'PasswordInput';

export { PasswordInput };
