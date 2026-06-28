import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { authService } from '../../services/authService';
import { Button } from '../../components/shared/AuraButton';
import { Input } from '../../components/shared/AuraInput';
import { AuthShell } from './components/AuthShell';
import { getSafeLoginErrorMessage } from './authErrorCopy';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
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

            <form
                onSubmit={handleLogin}
                className="space-y-4"
                data-testid="login-form"
                aria-describedby={error ? 'login-error' : undefined}
            >
                <Input
                    label="Email"
                    icon={<Mail size={16} />}
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
                    icon={<Lock size={16} />}
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
                    {!loading && <ArrowRight size={16} className="ml-1.5" />}
                </Button>
            </form>
        </AuthShell>
    );
};

export default LoginPage;
