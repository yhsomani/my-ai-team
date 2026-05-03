import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/shared/AuraButton';

const NotFound: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-primary)]">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="text-7xl font-bold tracking-tighter text-[var(--text-primary)]">
                    4<span className="text-accent">0</span>4
                </div>
                <div className="space-y-2">
                    <h2 className="text-xl font-semibold">Page not found</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                        The page you're looking for doesn't exist or has been moved.
                    </p>
                </div>
                <div className="flex items-center justify-center gap-3">
                    <Button variant="outline" onClick={() => navigate(-1)}>
                        <ArrowLeft size={16} className="mr-1.5" />
                        Go Back
                    </Button>
                    <Button onClick={() => navigate('/')}>
                        <Home size={16} className="mr-1.5" />
                        Home
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
