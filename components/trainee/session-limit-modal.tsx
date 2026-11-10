import { X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SessionLimitModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SessionLimitModal({
    isOpen,
    onClose
}: SessionLimitModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-lg font-semibold text-red-600 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        Session Limit Reached
                    </h3>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>
                <div className="p-6">
                    <p className="text-gray-600 mb-6">
                        You have used all your available sessions. Please contact your trainer to add more sessions to your account.
                    </p>
                    <div className="flex justify-end">
                        <Button onClick={onClose} className="bg-red-600 hover:bg-red-700 text-white">
                            I Understand
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
