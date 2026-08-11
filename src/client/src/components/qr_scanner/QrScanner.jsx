import { useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const SCANNER_ID = 'openglimpse-qr-scanner-region';

function friendlyDecodeError(err) {
    const msg = typeof err === 'string' ? err : err?.message;
    if (msg && /no multiformat|not found|parse error/i.test(msg)) {
        return 'Could not read the QR code. Keep the code fully in view, well-lit, and in focus.';
    }
    return msg || 'Failed to read QR code';
}

export default function QrScanner({ onScan, onError, facingMode = 'environment' }) {
    const onScanRef = useRef(onScan);
    const onErrorRef = useRef(onError);
    const html5QrRef = useRef(null);
    const lastScanRef = useRef('');
    const scanCooldownRef = useRef(false);
    const barcodeDetectorRef = useRef(null);
    const rafIdRef = useRef(null);
    const videoRef = useRef(null);

    useEffect(() => { onScanRef.current = onScan; }, [onScan]);
    useEffect(() => { onErrorRef.current = onError; }, [onError]);

    const handleDecoded = useCallback((decodedText) => {
        if (scanCooldownRef.current) return;
        if (decodedText === lastScanRef.current) return;
        lastScanRef.current = decodedText;
        scanCooldownRef.current = true;
        onScanRef.current(decodedText);
        setTimeout(() => { scanCooldownRef.current = false; }, 2000);
    }, []);

    const startBarcodeDetectorFallback = useCallback(async (video) => {
        if (!('BarcodeDetector' in window)) return;
        try {
            barcodeDetectorRef.current = new BarcodeDetector({
                formats: ['qr_code'],
            });
            const detectFrame = async () => {
                if (!barcodeDetectorRef.current || !video.videoWidth) {
                    rafIdRef.current = requestAnimationFrame(() => detectFrame());
                    return;
                }
                try {
                    const detections = await barcodeDetectorRef.current.detect(video);
                    if (detections.length > 0) {
                        handleDecoded(detections[0].rawValue);
                    }
                } catch {
                    // ignore detection errors
                }
                rafIdRef.current = requestAnimationFrame(() => detectFrame());
            };
            detectFrame();
        } catch {
            barcodeDetectorRef.current = null;
        }
    }, [handleDecoded]);

    useEffect(() => {
        let cancelled = false;
        let html5Qr = null;

        const startScanner = async () => {
            if (!navigator.mediaDevices?.getUserMedia) {
                if (!cancelled && onErrorRef.current) {
                    onErrorRef.current('Camera access requires HTTPS. Access this page via HTTPS or localhost.');
                }
                return;
            }

            try {
                const element = document.getElementById(SCANNER_ID);
                if (!element) return;

                html5Qr = new Html5Qrcode(SCANNER_ID);
                html5QrRef.current = html5Qr;

                const config = {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                    videoConstraints: {
                        facingMode,
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                    },
                };

                await html5Qr.start(
                    facingMode,
                    config,
                    (decodedText) => {
                        if (!cancelled) handleDecoded(decodedText);
                    },
                    () => {
                        // per-frame scan failure — ignore silently
                    }
                );

                if (cancelled) {
                    await html5Qr.stop();
                    return;
                }
            } catch (err) {
                if (cancelled) return;
                // Fallback: use BarcodeDetector API directly
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode,
                            width: { ideal: 1280 },
                            height: { ideal: 720 },
                        },
                    });
                    if (cancelled) {
                        stream.getTracks().forEach((t) => t.stop());
                        return;
                    }
                    const video = document.getElementById(`${SCANNER_ID}-video`);
                    if (video) {
                        video.srcObject = stream;
                        await video.play();
                        videoRef.current = video;
                        await startBarcodeDetectorFallback(video);
                    }
                } catch (fallbackErr) {
                    if (!cancelled && onErrorRef.current) {
                        onErrorRef.current(friendlyDecodeError(fallbackErr));
                    }
                }
            }
        };

        const timeoutId = setTimeout(startScanner, 100);

        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
            }
            if (barcodeDetectorRef.current) {
                barcodeDetectorRef.current = null;
            }
            if (videoRef.current?.srcObject) {
                videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
                videoRef.current = null;
            }
            if (html5QrRef.current) {
                html5QrRef.current.stop().catch(() => {});
                html5QrRef.current = null;
            }
        };
    }, [facingMode, handleDecoded, startBarcodeDetectorFallback]);

    return (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', background: '#000' }}>
            <div
                id={SCANNER_ID}
                style={{ width: '100%', height: '100%' }}
            />
            <video
                id={`${SCANNER_ID}-video`}
                autoPlay
                muted
                playsInline
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'none',
                }}
            />
        </div>
    );
}
