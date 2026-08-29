import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { authService } from '../../services/authService';
import { Button } from '../../components/shared/AuraButton';
import { Input } from '../../components/shared/AuraInput';
import { AuthShell } from './components/AuthShell';
import { getSafeLoginErrorMessage, getSafeResetRequestErrorMessage } from './authErrorCopy';

const decorativeIconProps = {
    'aria-hidden': true,
    focusable: 'false' as const,
};

type LoginMode = 'signin' | 'forgot';

const LoginPage: React.FC = () => {
    const [mode, setMode] = useState<LoginMode>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotError, setForgotError] = useState<string | null>(null);
    const [forgotSent, setForgotSent] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await authService.login(email, password);
            navigate('/dashboard');
        } catch (err) {
            console.error('Login error:', err);
            setError(getSafeLoginErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setForgotLoading(true);
        setForgotError(null);
        setForgotSent(false);

        try {
            await authService.resetPassword(forgotEmail);
            setForgotSent(true);
        } catch (err) {
            console.error('Password reset request error:', err);
            setForgotError(getSafeResetRequestErrorMessage(err));
        } finally {
            setForgotLoading(false);
        }
    };

    const switchToForgotMode = () => {
        setError(null);
        setForgotEmail(email);
        setForgotSent(false);
        setForgotError(null);
        setMode('forgot');
    };

    const switchToSignInMode = () => {
        setForgotError(null);
        setForgotSent(false);
        setMode('signin');
    };

    return (
        <AuthShell
            title="Sign in to TalentSphere"
            description="Use your email and password to continue."
            maxWidthClassName="max-w-sm"
            footer={(
                <>
                    Don't have an account?{' '}
                    <Link to="/register" className="font-medium text-accent transition-colors hover:text-accent-hover">
                        Sign up
                    </Link>
                </>
            )}
        >
            {error && (
                <div
                    id="login-error"
                    role="alert"
                    className="mb-4 rounded-md border border-destructive/20 bg-destructive-muted p-3"
                    data-testid="error-message"
                >
                    <p className="text-sm text-destructive">{error}</p>
                </div>
            )}

            {mode === 'signin' ? (
                <>
                    <form
                        onSubmit={handleLogin}
                        className="space-y-4"
                        data-testid="login-form"
                        aria-label="Email sign in"
                        aria-describedby={error ? 'login-error' : undefined}
                    >
                        <Input
                            label="Email"
                            icon={<Mail {...decorativeIconProps} size={16} />}
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            autoComplete="email"
                            data-testid="email-input"
                        />

                        <Input
                            id="login-password"
                            label="Password"
                            icon={<Lock {...decorativeIconProps} size={16} />}
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            autoComplete="current-password"
                            data-testid="password-input"
                        />

                        <Button
                            type="submit"
                            className="w-full"
                            isLoading={loading}
                            data-testid="login-submit"
                        >
                            Sign in
                            {!loading && <ArrowRight {...decorativeIconProps} size={16} className="ml-1.5" />}
                        </Button>
                    </form>

                    <div className="mt-4 text-center">
                        <button
                            type="button"
                            onClick={switchToForgotMode}
                            className="text-sm font-medium text-accent transition-colors hover:text-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded"
                            data-testid="forgot-password-link"
                        >
                            Forgot your password?
                        </button>
                    </div>
                </>
            ) : (
                <>
                    {forgotSent && (
                        <div
                            role="status"
                            className="mb-4 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3"
                            data-testid="forgot-success"
                            aria-live="polite"
                        >
                            <p className="text-sm text-emerald-600 dark:text-emerald-400">
                                If an account exists for that email, a reset link is on its way. Check your inbox and spam folder.
                            </p>
                        </div>
                    )}

                    {forgotError && (
                        <div
                            id="forgot-error"
                            role="alert"
                            className="mb-4 rounded-md border border-destructive/20 bg-destructive-muted p-3"
                            data-testid="forgot-error-message"
                        >
                            <p className="text-sm text-destructive">{forgotError}</p>
                        </div>
                    )}

                    <form
                        onSubmit={handleForgotPassword}
                        className="space-y-4"
                        data-testid="forgot-form"
                        aria-label="Password reset request"
                        aria-describedby={forgotError ? 'forgot-error' : undefined}
                    >
                        <Input
                            label="Email"
                            icon={<Mail {...decorativeIconProps} size={16} />}
                            type="email"
                            required
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            placeholder="you@example.com"
                            autoComplete="email"
                            data-testid="forgot-email-input"
                        />

                        <Button
                            type="submit"
                            className="w-full"
                            isLoading={forgotLoading}
                            data-testid="forgot-submit"
                        >
                            Send reset link
                        </Button>
                    </form>

                    <div className="mt-4 text-center">
                        <button
                            type="button"
                            onClick={switchToSignInMode}
                            className="text-sm font-medium text-accent transition-colors hover:text-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded"
                            data-testid="forgot-back"
                        >
                            Back to sign in
                        </button>
                    </div>
                </>
            )}
        </AuthShell>
    );
};

export default LoginPage;
