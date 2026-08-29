import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, ArrowRight, User, Briefcase } from 'lucide-react';
import { authService } from '../../services/authService';
import { Button } from '../../components/shared/AuraButton';
import { Input } from '../../components/shared/AuraInput';
import { AuthShell } from './components/AuthShell';
import {
    getPostRegistrationPath,
    getRegistrationAccountTypeFromRoleParam,
    getRegistrationNextStep,
    getRegistrationRole,
    type RegistrationAccountType,
} from '../../lib/registrationOnboarding';
import { recordOnboardingAnalytics } from '../../lib/onboardingAnalytics';
import { getSafeRegistrationErrorMessage } from './authErrorCopy';

const decorativeIconProps = {
    'aria-hidden': true,
    focusable: 'false' as const,
};

const RegisterPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const initialUserType = getRegistrationAccountTypeFromRoleParam(searchParams.get('role'));
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [userType, setUserType] = useState<RegistrationAccountType>(initialUserType);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const nextStep = getRegistrationNextStep(userType);

    useEffect(() => {
        setUserType(getRegistrationAccountTypeFromRoleParam(searchParams.get('role')));
    }, [searchParams]);

    const getEntryPoint = () => (searchParams.get('role') ? 'role_query' : 'manual');

    const selectAccountType = (nextType: RegistrationAccountType) => {
        setUserType(nextType);
        recordOnboardingAnalytics({
            action: 'account_type_selected',
            accountType: nextType,
            nextStepPath: getPostRegistrationPath(nextType),
            entryPoint: getEntryPoint(),
        });
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const nextStepPath = nextStep.path;

        recordOnboardingAnalytics({
            action: 'registration_submitted',
            accountType: userType,
            nextStepPath,
            entryPoint: getEntryPoint(),
        });

        try {
            const result = await authService.register(
                email,
                password,
                fullName,
                getRegistrationRole(userType)
            );
            recordOnboardingAnalytics({
                userId: result?.user?.id,
                action: 'registration_completed',
                accountType: userType,
                nextStepPath,
                entryPoint: getEntryPoint(),
            });
            navigate(nextStepPath);
        } catch (err: any) {
            console.error('Registration error:', err);
            recordOnboardingAnalytics({
                action: 'registration_failed',
                accountType: userType,
                nextStepPath,
                entryPoint: getEntryPoint(),
                errorCategory: String(err?.code || err?.name || err?.response?.status || 'registration_error'),
            });
            setError(getSafeRegistrationErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            title="Create your account"
            description="Choose your role and set up email access."
            footer={(
                <>
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium text-accent transition-colors hover:text-accent-hover">
                        Sign in
                    </Link>
                </>
            )}
        >
            {error && (
                <div
                    id="registration-error"
                    role="alert"
                    className="mb-4 rounded-md border border-destructive/20 bg-destructive-muted p-3"
                    data-testid="error-message"
                >
                    <p className="text-sm text-destructive">{error}</p>
                </div>
            )}

            <form
                onSubmit={handleRegister}
                className="space-y-4"
                data-testid="register-form"
                aria-label="Account registration"
                aria-describedby={error ? 'registration-error' : undefined}
            >
                <fieldset className="space-y-2" aria-describedby="registration-next-step">
                    <legend className="text-sm font-medium text-[var(--text-primary)]">Account Type</legend>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={() => selectAccountType('TALENT')}
                            className={`flex h-full flex-col items-start gap-2 rounded-md border p-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20 ${
                                userType === 'TALENT'
                                    ? 'border-accent bg-accent/10 text-accent'
                                    : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'
                            }`}
                            aria-pressed={userType === 'TALENT'}
                            aria-controls="registration-next-step"
                            aria-describedby="talent-account-type-description"
                        >
                            <span className="flex items-center gap-2 text-sm font-medium">
                                <User {...decorativeIconProps} size={16} /> Talent
                            </span>
                            <span id="talent-account-type-description" className="text-xs leading-relaxed text-[var(--text-muted)]">
                                Browse jobs, build a profile, learn skills, solve challenges, and apply.
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => selectAccountType('RECRUITER')}
                            className={`flex h-full flex-col items-start gap-2 rounded-md border p-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20 ${
                                userType === 'RECRUITER'
                                    ? 'border-accent bg-accent/10 text-accent'
                                    : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'
                            }`}
                            aria-pressed={userType === 'RECRUITER'}
                            aria-controls="registration-next-step"
                            aria-describedby="recruiter-account-type-description"
                        >
                            <span className="flex items-center gap-2 text-sm font-medium">
                                <Briefcase {...decorativeIconProps} size={16} /> Recruiter
                            </span>
                            <span id="recruiter-account-type-description" className="text-xs leading-relaxed text-[var(--text-muted)]">
                                Post jobs, review candidates, manage applications, and coordinate hiring.
                            </span>
                        </button>
                    </div>
                </fieldset>

                <div
                    id="registration-next-step"
                    role="status"
                    aria-label="Registration next step"
                    className="rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2"
                >
                    <p className="text-sm font-medium text-[var(--text-primary)]">{nextStep.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{nextStep.description}</p>
                </div>

                <Input
                    label="Full Name"
                    icon={<User {...decorativeIconProps} size={16} />}
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full name"
                    autoComplete="name"
                />

                <Input
                    label="Email"
                    icon={<Mail {...decorativeIconProps} size={16} />}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                />

                <Input
                    label="Password"
                    icon={<Lock {...decorativeIconProps} size={16} />}
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    helperText="Must be at least 8 characters"
                    autoComplete="new-password"
                />

                <Button
                    type="submit"
                    className="w-full"
                    isLoading={loading}
                >
                    Create Account
                    {!loading && <ArrowRight {...decorativeIconProps} size={16} className="ml-1.5" />}
                </Button>
            </form>
        </AuthShell>
    );
};

export default RegisterPage;
