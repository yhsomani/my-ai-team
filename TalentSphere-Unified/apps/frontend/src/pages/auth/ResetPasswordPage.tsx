import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, KeyRound } from 'lucide-react';
import { authService } from '../../services/authService';
import { Button } from '../../components/shared/AuraButton';
import { Input } from '../../components/shared/AuraInput';
import { useToast } from '../../components/shared/Toast';
import { AuthShell } from './components/AuthShell';
import { getSafePasswordUpdateErrorMessage } from './authErrorCopy';

const decorativeIconProps = {
    'aria-hidden': true,
    focusable: 'false' as const,
};

const SESSION_CHECK_ATTEMPTS = 4;
const SESSION_CHECK_DELAY_MS = 400;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type ResetPhase = 'checking' | 'ready' | 'expired';

const ResetPasswordPage: React.FC = () => {
    const [phase, setPhase] = useState<ResetPhase>('checking');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();
    const navigate = useNavigate();
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        let cancelled = false;

        const verifyRecoverySession = async () => {
            for (let attempt = 0; attempt < SESSION_CHECK_ATTEMPTS; attempt += 1) {
                try {
                    const session = await authService.getSession();
                    if (session) {
                        if (!cancelled) setPhase('ready');
                        return;
                    }
                } catch {
                    // Keep polling; a transient failure during the URL
                    // session exchange must not end the recovery flow.
                }
                if (attempt < SESSION_CHECK_ATTEMPTS - 1) {
                    await wait(SESSION_CHECK_DELAY_MS);
                }
            }
            if (!cancelled) setPhase('expired');
        };

        verifyRecoverySession();

        return () => {
            cancelled = true;
            mountedRef.current = false;
        };
    }, []);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 8) {
            setError('Use a password with at least 8 characters.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setSubmitting(true);
        try {
            await authService.updateUser({ password });
            try {
                await authService.logout();
            } catch {
                // The password is already updated; continue to sign-in
                // even if ending the old session fails.
            }
            addToast({
                type: 'success',
                title: 'Password updated',
                message: 'Sign in with your new password.',
            });
            navigate('/login', { replace: true });
        } catch (err) {
            console.error('Reset password error:', err);
            if (mountedRef.current) {
                setError(getSafePasswordUpdateErrorMessage(err));
            }
        } finally {
            if (mountedRef.current) {
                setSubmitting(false);
            }
        }
    };

    if (phase === 'checking') {
        return (
            <AuthShell
                title="Reset your password"
                description="We are verifying your reset link."
                maxWidthClassName="max-w-sm"
                footer={(
                    <Link to="/login" className="font-medium text-accent transition-colors hover:text-accent-hover">
                        Back to sign in
                    </Link>
                )}
            >
                <p role="status" aria-live="polite" data-testid="reset-status" className="py-4 text-center text-sm text-[var(--text-secondary)]">
                    Verifying your reset link…
                </p>
            </AuthShell>
        );
    }

    if (phase === 'expired') {
        return (
            <AuthShell
                title="Reset your password"
                description="Start again from the sign-in page to receive a fresh link."
                maxWidthClassName="max-w-sm"
                footer={(
                    <Link to="/login" className="font-medium text-accent transition-colors hover:text-accent-hover">
                        Back to sign in
                    </Link>
                )}
            >
                <div
                    role="alert"
                    data-testid="reset-expired"
                    className="mb-2 rounded-md border border-destructive/20 bg-destructive-muted p-3"
                >
                    <p className="text-sm text-destructive">
                        This password reset link is invalid or has expired.
                    </p>
                    <p className="mt-1 text-sm text-destructive">
                        Open the sign-in page, choose “Forgot your password?”, and request a new link.
                    </p>
                </div>
            </AuthShell>
        );
    }

    return (
        <AuthShell
            title="Set a new password"
            description="Choose a new password for your TalentSphere account."
            maxWidthClassName="max-w-sm"
            footer={(
                <Link to="/login" className="font-medium text-accent transition-colors hover:text-accent-hover">
                    Back to sign in
                </Link>
            )}
        >
            {error && (
                <div
                    id="reset-error"
                    role="alert"
                    className="mb-4 rounded-md border border-destructive/20 bg-destructive-muted p-3"
                    data-testid="reset-error-message"
                >
                    <p className="text-sm text-destructive">{error}</p>
                </div>
            )}

            <form
                onSubmit={handleUpdate}
                className="space-y-4"
                data-testid="reset-form"
                aria-label="Set new password"
                aria-describedby={error ? 'reset-error' : undefined}
            >
                <Input
                    id="new-password"
                    label="New password"
                    icon={<Lock {...decorativeIconProps} size={16} />}
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    helperText="Must be at least 8 characters"
                    data-testid="new-password-input"
                />

                <Input
                    id="confirm-password"
                    label="Confirm new password"
                    icon={<KeyRound {...decorativeIconProps} size={16} />}
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    autoComplete="new-password"
                    data-testid="confirm-password-input"
                />

                <Button
                    type="submit"
                    className="w-full"
                    isLoading={submitting}
                    data-testid="reset-submit"
                >
                    Update password
                </Button>
            </form>
        </AuthShell>
    );
};

export default ResetPasswordPage;
