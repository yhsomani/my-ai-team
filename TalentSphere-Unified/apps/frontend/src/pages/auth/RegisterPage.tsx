import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, ArrowRight, User, Briefcase, Layers } from 'lucide-react';
import { authService } from '../../services/authService';
import { Button } from '../../components/shared/AuraButton';
import { Input } from '../../components/shared/AuraInput';

const RegisterPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const initialUserType = searchParams.get('role')?.toLowerCase() === 'recruiter' ? 'RECRUITER' : 'TALENT';
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [userType, setUserType] = useState<'TALENT' | 'RECRUITER'>(initialUserType);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        setUserType(searchParams.get('role')?.toLowerCase() === 'recruiter' ? 'RECRUITER' : 'TALENT');
    }, [searchParams]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await authService.register(
                email,
                password,
                fullName,
                userType === 'TALENT' ? 'ROLE_USER' : 'ROLE_RECRUITER'
            );
            navigate('/dashboard');
        } catch (err: any) {
            console.error('Registration error:', err);
            const errorMessage = err?.response?.data?.message || err?.message || 'An unexpected error occurred during registration. Please try again later.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-primary)]">
            <div className="w-full max-w-md space-y-8">
                {/* Logo & Heading */}
                <div className="text-center space-y-4">
                    <Link to="/" className="inline-flex">
                        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-white">
                            <Layers size={20} />
                        </div>
                    </Link>
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">Get started with TalentSphere</p>
                    </div>
                </div>

                {/* Registration Card */}
                <div className="p-6 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]">
                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-destructive-muted border border-destructive/20" data-testid="error-message">
                            <p className="text-sm text-destructive">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-4" data-testid="register-form">
                        {/* Account Type */}
                        <fieldset className="space-y-2">
                            <legend className="text-sm font-medium text-[var(--text-primary)]">Account Type</legend>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={() => setUserType('TALENT')}
                                    className={`flex h-full flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors ${
                                        userType === 'TALENT'
                                            ? 'bg-accent/10 border-accent text-accent'
                                            : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'
                                    }`}
                                    aria-pressed={userType === 'TALENT'}
                                    aria-describedby="talent-account-type-description"
                                >
                                    <span className="flex items-center gap-2 text-sm font-medium">
                                        <User size={16} /> Talent
                                    </span>
                                    <span id="talent-account-type-description" className="text-xs leading-relaxed text-[var(--text-muted)]">
                                        Browse jobs, build a profile, learn skills, solve challenges, and apply.
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setUserType('RECRUITER')}
                                    className={`flex h-full flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors ${
                                        userType === 'RECRUITER'
                                            ? 'bg-accent/10 border-accent text-accent'
                                            : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'
                                    }`}
                                    aria-pressed={userType === 'RECRUITER'}
                                    aria-describedby="recruiter-account-type-description"
                                >
                                    <span className="flex items-center gap-2 text-sm font-medium">
                                        <Briefcase size={16} /> Recruiter
                                    </span>
                                    <span id="recruiter-account-type-description" className="text-xs leading-relaxed text-[var(--text-muted)]">
                                        Post jobs, review candidates, manage applications, and coordinate hiring.
                                    </span>
                                </button>
                            </div>
                        </fieldset>

                        <Input
                            label="Full Name"
                            icon={<User size={16} />}
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="John Doe"
                        />

                        <Input
                            label="Email"
                            icon={<Mail size={16} />}
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                        />

                        <Input
                            label="Password"
                            icon={<Lock size={16} />}
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            helperText="Must be at least 8 characters"
                        />

                        <Button
                            type="submit"
                            className="w-full"
                            isLoading={loading}
                        >
                            Create Account
                            {!loading && <ArrowRight size={16} className="ml-1.5" />}
                        </Button>
                    </form>
                </div>

                <p className="text-center text-sm text-[var(--text-secondary)]">
                    Already have an account?{' '}
                    <Link to="/login" className="text-accent hover:text-accent-hover font-medium transition-colors">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default RegisterPage;
