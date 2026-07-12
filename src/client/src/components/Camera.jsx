import { useRef, useEffect, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights/';
const DETECTION_FRAME_SKIP = 8;

export default function Camera() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const displaySizeRef = useRef(null);
    const rafRef = useRef(null);
    const cancelledRef = useRef(false);
    const frameCountRef = useRef(0);
    const [error, setError] = useState(null);
    const [status, setStatus] = useState('Loading face detection models...');
    const [facingMode, setFacingMode] = useState('user');

    const stopStream = useCallback(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
            videoRef.current.srcObject = null;
        }
    }, []);

    const startCamera = useCallback(async (mode) => {
        const cancelled = cancelledRef.current;
        try {
            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
            ]);
            if (cancelledRef.current) return;
            setStatus('Starting camera...');

            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error('Camera access requires HTTPS. Access this page via HTTPS or localhost.');
            }
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: mode },
            });
            if (cancelledRef.current) return;
            const video = videoRef.current;
            if (!video) return;
            video.srcObject = stream;

            await new Promise((resolve) => {
                video.addEventListener('loadedmetadata', resolve, { once: true });
            });

            if (cancelledRef.current) return;
            try {
                await video.play();
            } catch (playErr) {
                if (!cancelledRef.current) setError(playErr.message);
                return;
            }

            const { videoWidth, videoHeight } = video;
            const canvas = canvasRef.current;
            const renderedWidth = video.offsetWidth || videoWidth;
            const renderedHeight = video.offsetHeight || videoHeight;
            const displaySize = { width: renderedWidth, height: renderedHeight };
            displaySizeRef.current = displaySize;

            faceapi.matchDimensions(canvas, displaySize);

            setStatus('Detecting faces...');
            detectLoop();
        } catch (err) {
            if (!cancelledRef.current) setError(err.message);
        }
    }, []);

    useEffect(() => {
        cancelledRef.current = false;
        stopStream();
        startCamera(facingMode);

        return () => {
            cancelledRef.current = true;
            stopStream();
        };
    }, [facingMode, startCamera, stopStream]);

    function detectLoop() {
        if (cancelledRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) {
            rafRef.current = requestAnimationFrame(detectLoop);
            return;
        }

        frameCountRef.current += 1;
        if (frameCountRef.current % DETECTION_FRAME_SKIP !== 0) {
            rafRef.current = requestAnimationFrame(detectLoop);
            return;
        }

        faceapi
            .detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
            .then((detections) => {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                const displaySize = displaySizeRef.current;
                const resized = faceapi.resizeResults(detections, displaySize);

                if (facingMode === 'user') {
                    ctx.save();
                    ctx.translate(canvas.width, 0);
                    ctx.scale(-1, 1);
                }

                resized.forEach((d) => {
                    const box = d.box;
                    ctx.strokeStyle = '#00ff00';
                    ctx.lineWidth = 4;
                    ctx.strokeRect(box.x, box.y, box.width, box.height);
                });

                if (facingMode === 'user') {
                    ctx.restore();
                }

                rafRef.current = requestAnimationFrame(detectLoop);
            })
            .catch((err) => {
                if (!cancelledRef.current) setError(err.message);
            });
    }

    function toggleCamera() {
        setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
    }

    return (
        <Box sx={{ p: { xs: 1.5, sm: 3 }, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Typography variant="h5">Facial Recognition</Typography>
            {error && <Alert severity="error" sx={{ width: '100%', maxWidth: 480 }}>{error}</Alert>}
            {!error && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {status === 'Loading face detection models...' && <CircularProgress size={18} />}
                    <Typography variant="body2" color="text.secondary">{status}</Typography>
                </Box>
            )}
            <Box sx={{ position: 'relative', width: '100%', maxWidth: 480, mx: 'auto', bgcolor: 'black', borderRadius: 1, overflow: 'hidden' }}>
                <Box
                    component="video"
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    sx={{
                        display: 'block',
                        width: '100%',
                        height: 'auto',
                        transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                    }}
                />
                <Box
                    component="canvas"
                    ref={canvasRef}
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                    }}
                />
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Button variant="contained" size="large" onClick={toggleCamera}>
                    Switch to {facingMode === 'user' ? 'Back' : 'Front'} Camera
                </Button>
            </Box>
        </Box>
    );
}
