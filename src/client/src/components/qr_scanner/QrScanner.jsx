import { useEffect, useRef, useCallback, useState } from 'react';
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
    const barcodeDetectorRef = useRef(null);
    const rafIdRef = useRef(null);
    const videoRef = useRef(null);
    const [fallbackActive, setFallbackActive] = useState(false);

    useEffect(() => { onScanRef.current = onScan; }, [onScan]);
    useEffect(() => { onErrorRef.current = onError; }, [onError]);

    const lastDecodeRef = useRef({ text: null, at: 0 });

    const handleDecoded = useCallback((decodedText) => {
        const now = Date.now();
        const last = lastDecodeRef.current;
        if (decodedText === last.text && now - last.at < 800) return;
        lastDecodeRef.current = { text: decodedText, at: now };
        onScanRef.current(decodedText);
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
                    fps: 20,
                    qrbox: (viewfinderWidth, viewfinderHeight) => {
                        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                        const size = Math.max(Math.floor(minEdge * 0.7), 150);
                        return { width: size, height: size };
                    },
                    disableFlip: false,
                };

                await html5Qr.start(
                    { facingMode },
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
                        setFallbackActive(true);
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
        <div style={{ position: 'relative', width: '100%', background: '#000', overflow: 'hidden' }}>
            <div
                id={SCANNER_ID}
                style={{ width: '100%', minHeight: 200, display: fallbackActive ? 'none' : 'block' }}
            />
            <video
                id={`${SCANNER_ID}-video`}
                autoPlay
                muted
                playsInline
                style={{
                    width: '100%',
                    height: 'auto',
                    display: fallbackActive ? 'block' : 'none',
                }}
            />
        </div>
    );
}
