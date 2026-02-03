import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface QRScannerProps {
    onResult: (text: string) => void;
    onError?: (error: string) => void;
    onClose?: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onResult, onError, onClose }) => {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);

    useEffect(() => {
        // Initialize scanner
        try {
            const scanner = new Html5QrcodeScanner(
                "reader",
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                    supportedScanTypes: [] // Default for camera
                },
                /* verbose= */ false
            );

            scanner.render(
                (decodedText) => {
                    // Success callback
                    scanner.clear().catch(console.error);
                    onResult(decodedText);
                },
                (_errorMessage) => {
                    // Error callback (called frequently when no QR found)
                    // We typically ignore this unless it's a critical setup error
                    // console.log(errorMessage);
                }
            );

            scannerRef.current = scanner;
        } catch (err: any) {
            console.error("Scanner init error:", err);
            setScanError("Failed to initialize camera. Please ensure you have granted permission.");
            if (onError) onError(err.message);
        }

        // Cleanup
        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
            }
        };
    }, []); // Empty dependency array to run once

    return (
        <div className="w-full max-w-sm mx-auto">
            {scanError ? (
                <Card className="p-6 border-destructive/50 bg-destructive/5 text-center">
                    <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
                    <p className="text-destructive mb-4">{scanError}</p>
                    {onClose && <Button onClick={onClose} variant="outline">Close</Button>}
                </Card>
            ) : (
                <div className="space-y-4">
                    <div id="reader" className="overflow-hidden rounded-lg border-2 border-slate-200"></div>
                    <div className="text-center">
                        {onClose && (
                            <Button onClick={onClose} variant="secondary" className="mt-2">
                                Cancel Scanning
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default QRScanner;
