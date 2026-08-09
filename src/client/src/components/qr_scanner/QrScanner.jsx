import { useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const SCANNER_ID = 'openglimpse-qr-scanner';

export default function QrScanner({ onScan, onError, facingMode = 'environment' }) {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const qrRef = useRef(null);
    const canvasSizedRef = useRef(false);

    // Use refs to hold the latest callbacks without breaking the useEffect dependency cycle
    const onScanRef = useRef(onScan);
    const onErrorRef = useRef(onError);

    useEffect(() => { onScanRef.current = onScan; }, [onScan]);
    useEffect(() => { onErrorRef.current = onError; }, [onError]);

    const updateCanvasSize = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current?.parentElement;
        if (!canvas || !container) return;
        const rect = container.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            canvas.width = rect.width;
            canvas.height = rect.height;
            canvasSizedRef.current = true;
        }
    }, []);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        canvasSizedRef.current = false;

        const qrCode = new Html5Qrcode(SCANNER_ID);
        qrRef.current = qrCode;

        let stopped = false;
        let isStarting = false;

        const safelyStop = async () => {
            if (stopped) return;
            stopped = true;
            try {
                // Only stop if it's actually scanning
                if (qrCode.isScanning) {
                    await qrCode.stop();
                }
                qrCode.clear(); // Clears the DOM elements created by the scanner
            } catch (err) {
                console.warn("Failed to stop scanner cleanly:", err);
            }
        };

        const startScanner = async () => {
            if (isStarting) return;
            isStarting = true;

            try {
                await qrCode.start(
                    { facingMode },
                    {
                        fps: 15,
                        qrbox: (w, h) => {
                            // Prevent returning 0 dimensions which crashes html5-qrcode
                            const width = Math.max(50, Math.floor(w * 0.8));
                            const height = Math.max(50, Math.floor(h * 0.8));
                            return { width, height };
                        },
                        aspectRatio: 4 / 3,
                        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
                    },
                    (decodedText, decodedResult) => {
                        if (!canvasSizedRef.current) updateCanvasSize();

                        const canvas = canvasRef.current;
                        if (canvas && decodedResult) {
                            const ctx = canvas.getContext('2d');
                            ctx.clearRect(0, 0, canvas.width, canvas.height);

                            const pts = decodedResult.cornerPoints;
                            if (pts && pts.length === 4) {
                                ctx.strokeStyle = '#00ff00';
                                ctx.lineWidth = 4;
                                ctx.beginPath();
                                ctx.moveTo(pts[0].x, pts[0].y);
                                for (let i = 1; i < pts.length; i++) {
                                    ctx.lineTo(pts[i].x, pts[i].y);
                                }
                                ctx.closePath();
                                ctx.stroke();

                                const midX = pts.reduce((s, p) => s + p.x, 0) / 4;
                                const midY = pts.reduce((s, p) => s + p.y, 0) / 4;
                                ctx.fillStyle = '#00ff00';
                                ctx.font = 'bold 14px sans-serif';
                                ctx.textAlign = 'center';
                                ctx.fillText('✓ Verified', midX, midY - 10);
                            } else if (decodedResult.boundingBox) {
                                const b = decodedResult.boundingBox;
                                ctx.strokeStyle = '#00ff00';
                                ctx.lineWidth = 4;
                                ctx.strokeRect(b.x, b.y, b.width, b.height);
                            }
                        }

                        onScanRef.current(decodedText);
                        safelyStop();
                    },
                    () => {} // Verbose error callback (ignored)
                );
            } catch (err) {
                if (onErrorRef.current) {
                    onErrorRef.current(err?.message || 'Failed to start QR scanner');
                }
            } finally {
                isStarting = false;
            }
        };

        // Timeout prevents race conditions with React Strict Mode unmounting
        const timeoutId = setTimeout(startScanner, 100);

        updateCanvasSize();

        const ro = new ResizeObserver(() => updateCanvasSize());
        ro.observe(container.parentElement);

        return () => {
            clearTimeout(timeoutId);
            ro.disconnect();
            safelyStop();
        };
    }, [facingMode, updateCanvasSize]);

    return (
        <div style={{ position: 'relative', width: '100%', maxWidth: 480, margin: '0 auto' }}>
            <div
                id={SCANNER_ID}
                ref={containerRef}
                style={{ borderRadius: 12, overflow: 'hidden', background: '#000' }}
            />
            <canvas
                ref={canvasRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                }}
            />
        </div>
    );
}