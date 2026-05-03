import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Layers } from 'lucide-react';
import { authService } from '../../services/authService';
import { Button } from '../../components/shared/AuraButton';
import { Input } from '../../components/shared/AuraInput';

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
        } catch (err: any) {
            console.error('Login error:', err);
            const errorMessage = err?.response?.data?.message || err?.message || 'An unexpected error occurred during login. Please try again later.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-primary)]">
            <div className="w-full max-w-sm space-y-8">
                {/* Logo & Heading */}
                <div className="text-center space-y-4">
                    <Link to="/" className="inline-flex">
                        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-white">
                            <Layers size={20} />
                        </div>
                    </Link>
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Sign in to TalentSphere</h1>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">Enter your credentials to continue</p>
                    </div>
                </div>

                {/* Login Card */}
                <div className="p-6 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]">
                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-destructive-muted border border-destructive/20" data-testid="error-message">
                            <p className="text-sm text-destructive">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4" data-testid="login-form">
                        <Input
                            label="Email"
                            icon={<Mail size={16} />}
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            data-testid="email-input"
                        />

                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="text-sm font-medium text-[var(--text-primary)]">Password</label>
                                <button type="button" className="text-xs text-accent hover:text-accent-hover transition-colors">
                                    Forgot password?
                                </button>
                            </div>
                            <Input
                                icon={<Lock size={16} />}
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                data-testid="password-input"
                            />
                        </div>

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

                    {/* Divider */}
                    <div className="relative my-5">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-[var(--border-default)]" />
                        </div>
                        <div className="relative flex justify-center text-xs text-[var(--text-muted)]">
                            <span className="bg-[var(--bg-secondary)] px-2">or continue with</span>
                        </div>
                    </div>

                    {/* Social Login */}
                    <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" size="sm" className="w-full">
                            <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                            </svg>
                            GitHub
                        </Button>
                        <Button variant="outline" size="sm" className="w-full">
                            <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.92 3.16-1.84 4.12-1.16 1.16-3 2.52-6 2.52-4.84 0-8.68-3.92-8.68-8.76s3.84-8.76 8.68-8.76c2.64 0 4.6 1.04 6.04 2.4l2.32-2.32c-2.08-1.92-4.84-3.32-8.36-3.32-6.64 0-12 5.36-12 12s5.36 12 12 12c3.56 0 6.24-1.16 8.32-3.32 2.16-2.12 2.84-5.12 2.84-7.64 0-.52-.04-1.04-.12-1.52H12.48z"/>
                            </svg>
                            Google
                        </Button>
                    </div>
                </div>

                <p className="text-center text-sm text-[var(--text-secondary)]">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-accent hover:text-accent-hover font-medium transition-colors">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
