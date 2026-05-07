import React, { useState, useEffect } from 'react';
import { Lock, Bell, CreditCard, User, Mail, Smartphone, LogOut, Shield, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/shared/AuraButton';
import { Input } from '../../components/shared/AuraInput';
import { Badge } from '../../components/shared/Badge';
import { Toggle } from '../../components/shared/Toggle';
import Card from '../../components/shared/GlassCard';
import { Skeleton } from '../../components/shared/Skeleton';
import { EmptyState } from '../../components/shared/EmptyState';
import { useAppSelector } from '../../store/hooks';
import { profileService } from '../../services/profileService';
import { settingsService } from '../../services/settingsService';
import { useToast } from '../../components/shared/Toast';

const SettingsPage: React.FC = () => {
    const { user } = useAppSelector((state) => state.auth);
    const { addToast } = useToast();
    const [activeSection, setActiveSection] = useState<'General' | 'Security' | 'Notifications' | 'Billing'>('General');
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [profileData, setProfileData] = useState<any>(null);
    const [billingData, setBillingData] = useState<any>(null);
    
    const [notifications, setNotifications] = useState({
        jobAlerts: true,
        connectionRequests: true,
        challenges: false,
        systemUpdates: true,
    });

    useEffect(() => {
        const fetchSettingsData = async () => {
            if (!user) return;
            try {
                setLoading(true);
                const [profileRes, billRes, plansRes] = await Promise.allSettled([
                    profileService.getProfile(user.id),
                    settingsService.getBilling(user.id),
                    settingsService.getPlans()
                ]);

                if (profileRes.status === 'fulfilled') {
                    setProfileData(profileRes.value);
                } else {
                    throw new Error('Failed to load profile data');
                }

                if (billRes.status === 'fulfilled' && billRes.value) {
                    setBillingData({
                        transactions: billRes.value,
                        plan: 'Pro Plan', // Placeholder until user-service handles subscription state
                        credits: 1250,
                        cardType: 'Visa',
                        cardLast4: '4242'
                    });
                }
            } catch (err: any) {
                console.error("Failed to load settings data", err);
                setError("Unable to connect to system services. Please try again later.");
            } finally {
                setLoading(false);
            }
        };
        fetchSettingsData();
    }, [user]);

    const sections = [
        { id: 'General' as const, icon: <User size={16} />, label: 'General' },
        { id: 'Security' as const, icon: <Lock size={16} />, label: 'Security' },
        { id: 'Notifications' as const, icon: <Bell size={16} />, label: 'Notifications' },
        { id: 'Billing' as const, icon: <CreditCard size={16} />, label: 'Billing' },
    ];

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/';
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48 mb-6" />
                <div className="flex flex-col lg:flex-row gap-6">
                    <Skeleton className="lg:w-56 h-64 shrink-0 rounded-xl" />
                    <Skeleton className="flex-1 h-96 rounded-xl" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <PageHeader title="Settings" description="Manage your account preferences and configuration." />
                <EmptyState title="Error Loading Settings" description={error} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Settings" description="Manage your account preferences and configuration." />

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar Navigation */}
                <nav className="lg:w-56 shrink-0">
                    <Card className="p-1.5">
                        {sections.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                                    activeSection === section.id
                                        ? 'bg-accent/10 text-accent font-medium'
                                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]'
                                }`}
                            >
                                {section.icon}
                                {section.label}
                            </button>
                        ))}
                        <div className="my-1.5 border-t border-[var(--border-default)]" />
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive-muted transition-colors"
                        >
                            <LogOut size={16} />
                            Sign out
                        </button>
                    </Card>
                </nav>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {activeSection === 'General' && (
                        <Card className="p-6 space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-1">General Information</h3>
                                <p className="text-sm text-[var(--text-secondary)]">Update your personal details.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input 
                                    label="Display Name" 
                                    icon={<User size={16} />} 
                                    value={profileData?.fullName || ''} 
                                    onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
                                />
                                <Input 
                                    label="Email" 
                                    icon={<Mail size={16} />} 
                                    value={user?.email || ''} 
                                    type="email" 
                                    readOnly 
                                />
                                <Input 
                                    label="Phone" 
                                    icon={<Smartphone size={16} />} 
                                    value={profileData?.phone || ''} 
                                    onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">Bio</label>
                                <textarea
                                    className="w-full rounded-lg border border-[var(--border-default)] bg-transparent px-3 py-2 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors resize-none"
                                    value={profileData?.bio || ''}
                                    onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                                />
                            </div>
                            <div className="pt-4 border-t border-[var(--border-default)]">
                                <Button
                                    onClick={async () => {
                                        if (!user) return;
                                        try {
                                            addToast({ type: 'info', title: 'Saving...', duration: 2000 });
                                            await profileService.updateProfile(user.id, {
                                                fullName: profileData.fullName,
                                                bio: profileData.bio,
                                                phone: profileData.phone
                                            });
                                            addToast({ type: 'success', title: 'Settings saved successfully', duration: 4000 });
                                        } catch (err) {
                                            console.error('Failed to save settings:', err);
                                            addToast({ type: 'error', title: 'Save Failed', message: 'Please try again later.' });
                                        }
                                    }}
                                >Save Changes</Button>
                            </div>                        </Card>
                    )}

                    {activeSection === 'Security' && (
                        <div className="space-y-4">
                            <Card className="p-6 space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold mb-1">Security</h3>
                                    <p className="text-sm text-[var(--text-secondary)]">Manage your security settings and password.</p>
                                </div>
                                <div className="flex items-center justify-between p-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)]">
                                    <div>
                                        <p className="text-sm font-medium">Two-Factor Authentication</p>
                                        <Badge variant="success" className="mt-1">Enabled</Badge>
                                    </div>
                                    <Button variant="outline" size="sm">Configure</Button>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-sm font-medium">Change Password</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input type="password" label="Current Password" placeholder="••••••••" />
                                        <Input type="password" label="New Password" placeholder="••••••••" />
                                    </div>
                                    <Button variant="outline">Update Password</Button>
                                </div>
                            </Card>

                            <Card className="p-6 border-destructive/20">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-medium text-destructive">Delete Account</h4>
                                        <p className="text-xs text-[var(--text-muted)] mt-0.5">Permanently delete your account and all associated data.</p>
                                    </div>
                                    <Button variant="destructive" size="sm">Delete Account</Button>
                                </div>
                            </Card>
                        </div>
                    )}

                    {activeSection === 'Notifications' && (
                        <Card className="p-6 space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-1">Notifications</h3>
                                <p className="text-sm text-[var(--text-secondary)]">Choose what notifications you want to receive.</p>
                            </div>
                            <div className="space-y-1">
                                <Toggle
                                    checked={notifications.jobAlerts}
                                    onChange={(v) => setNotifications(p => ({ ...p, jobAlerts: v }))}
                                    label="Job Alerts"
                                    description="Get notified about new job opportunities matching your profile."
                                    className="p-4 rounded-lg hover:bg-[var(--bg-primary)] transition-colors"
                                />
                                <Toggle
                                    checked={notifications.connectionRequests}
                                    onChange={(v) => setNotifications(p => ({ ...p, connectionRequests: v }))}
                                    label="Connection Requests"
                                    description="Notifications when someone wants to connect with you."
                                    className="p-4 rounded-lg hover:bg-[var(--bg-primary)] transition-colors"
                                />
                                <Toggle
                                    checked={notifications.challenges}
                                    onChange={(v) => setNotifications(p => ({ ...p, challenges: v }))}
                                    label="Challenge Updates"
                                    description="Updates about challenges and competitions."
                                    className="p-4 rounded-lg hover:bg-[var(--bg-primary)] transition-colors"
                                />
                                <Toggle
                                    checked={notifications.systemUpdates}
                                    onChange={(v) => setNotifications(p => ({ ...p, systemUpdates: v }))}
                                    label="System Updates"
                                    description="Critical security and platform updates."
                                    className="p-4 rounded-lg hover:bg-[var(--bg-primary)] transition-colors"
                                />
                            </div>
                        </Card>
                    )}

                    {activeSection === 'Billing' && (
                        <div className="space-y-4">
                            <Card className="p-6 space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold mb-1">Billing</h3>
                                    <p className="text-sm text-[var(--text-secondary)]">Manage your subscription and payment methods.</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-5 rounded-xl bg-gradient-to-br from-accent to-blue-600 text-white">
                                        <div className="flex items-center justify-between mb-8">
                                            <Zap size={20} />
                                            <Badge className="bg-white/20 text-white border-white/20">{billingData?.plan || 'Free Plan'}</Badge>
                                        </div>
                                        <p className="text-xs text-white/60 mb-1">Available Credits</p>
                                        <p className="text-3xl font-semibold">{billingData?.credits || 0} <span className="text-sm font-normal text-white/60">XP</span></p>
                                    </div>
                                    <div className="p-5 rounded-xl border border-[var(--border-default)]">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-xs text-[var(--text-muted)]">Payment Method</span>
                                            <Badge variant="outline">{billingData?.cardType || 'None'}</Badge>
                                        </div>
                                        <p className="text-lg font-medium mb-1">{billingData?.cardLast4 ? `•••• •••• •••• ${billingData.cardLast4}` : 'No card linked'}</p>
                                        <p className="text-xs text-[var(--text-muted)]">{billingData?.cardExpiry ? `Expires ${billingData.cardExpiry}` : ''}</p>
                                        <Button variant="ghost" size="sm" className="mt-3 p-0 h-auto">Update payment method</Button>
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-6">
                                <h4 className="text-sm font-semibold mb-4">Transaction History</h4>
                                <div className="divide-y divide-[var(--border-default)]">
                                    {billingData?.transactions?.length > 0 ? billingData.transactions.map((tx: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between py-3">
                                            <div>
                                                <p className="text-sm font-medium">{tx.type}</p>
                                                <p className="text-xs text-[var(--text-muted)]">{tx.date}</p>
                                            </div>
                                            <span className={`text-sm font-medium ${tx.amount.startsWith('+') ? 'text-success' : 'text-[var(--text-secondary)]'}`}>
                                                {tx.amount}
                                            </span>
                                        </div>
                                    )) : (
                                        <div className="py-8 text-center text-sm text-[var(--text-muted)]">No recent transactions.</div>
                                    )}
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
