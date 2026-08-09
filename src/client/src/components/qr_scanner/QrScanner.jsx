import { useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const DECODER_ID = 'openglimpse-qr-decoder';

function friendlyDecodeError(err) {
    const msg = typeof err === 'string' ? err : err?.message;
    if (msg && /no multiformat|not found|parse error/i.test(msg)) {
        return 'Could not read the QR code. Keep the code fully in view, well-lit, and in focus, then capture again.';
    }
    return msg || 'Failed to read QR code';
}

async function decodeQrFromCanvas(canvas) {
    if ('BarcodeDetector' in window) {
        try {
            const detector = new BarcodeDetector({ formats: ['qr_code'] });
            const detections = await detector.detect(canvas);
            if (detections.length > 0) return detections[0].rawValue;
        } catch (err) {
            // Fall through to the html5-qrcode decoder
        }
    }
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob) throw new Error('Failed to capture image');
    const file = new File([blob], 'qr-capture.jpg', { type: 'image/jpeg' });
    const qrCode = new Html5Qrcode(DECODER_ID);
    return qrCode.scanFile(file, false);
}

export default function QrScanner({ onScan, onError, facingMode = 'environment' }) {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const capturingRef = useRef(false);

    // Use refs to hold the latest callbacks without breaking the useEffect dependency cycle
    const onScanRef = useRef(onScan);
    const onErrorRef = useRef(onError);

    useEffect(() => { onScanRef.current = onScan; }, [onScan]);
    useEffect(() => { onErrorRef.current = onError; }, [onError]);

    useEffect(() => {
        let cancelled = false;

        const startCamera = async () => {
            try {
                if (!navigator.mediaDevices?.getUserMedia) {
                    throw new Error('Camera access requires HTTPS. Access this page via HTTPS or localhost.');
                }
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode,
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                    },
                });
                if (cancelled) return;
                streamRef.current = stream;
                const video = videoRef.current;
                if (!video) return;
                video.srcObject = stream;

                await new Promise((resolve) => {
                    video.addEventListener('loadedmetadata', resolve, { once: true });
                });

                if (cancelled) return;
                try {
                    await video.play();
                } catch (playErr) {
                    if (!cancelled && onErrorRef.current) onErrorRef.current(playErr.message);
                }
            } catch (err) {
                if (!cancelled && onErrorRef.current) {
                    onErrorRef.current(err?.message || 'Failed to start camera');
                }
            }
        };

        // Timeout prevents race conditions with React Strict Mode unmounting
        const timeoutId = setTimeout(startCamera, 100);

        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
            }
        };
    }, [facingMode]);

    const handleCapture = useCallback(async () => {
        if (capturingRef.current) return;
        const video = videoRef.current;
        if (!video || video.readyState < 2) {
            if (onErrorRef.current) onErrorRef.current('Camera is not ready yet');
            return;
        }
        capturingRef.current = true;
        try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (facingMode === 'user') {
                ctx.save();
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(video, 0, 0);
                ctx.restore();
            } else {
                ctx.drawImage(video, 0, 0);
            }

            const decodedText = await decodeQrFromCanvas(canvas);
            onScanRef.current(decodedText);
        } catch (err) {
            if (onErrorRef.current) {
                onErrorRef.current(friendlyDecodeError(err));
            }
        } finally {
            capturingRef.current = false;
        }
    }, [facingMode]);

    return (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', background: '#000' }}>
            <div id={DECODER_ID} style={{ display: 'none' }} />
            <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                }}
            />
            <button
                type="button"
                onClick={handleCapture}
                className="absolute left-1/2 -translate-x-1/2 bottom-4 bg-sky-gradient text-white rounded-xl px-6 py-2.5 text-sm font-semibold shadow-sm"
            >
                Capture &amp; Scan
            </button>
        </div>
    );
}
