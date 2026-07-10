import React, { useRef, useEffect, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

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
    const [videoSize, setVideoSize] = useState(null);
    const [facingMode, setFacingMode] = useState('user');
    const [capturedImage, setCapturedImage] = useState(null);
    const [uploadStatus, setUploadStatus] = useState(null);
    const [targetUserId, setTargetUserId] = useState('');

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
            canvas.style.width = renderedWidth + 'px';
            canvas.style.height = renderedHeight + 'px';
            setVideoSize(displaySize);

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

                ctx.save();
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);

                resized.forEach((d) => {
                    const box = d.box;
                    ctx.strokeStyle = '#00ff00';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(box.x, box.y, box.width, box.height);
                });

                ctx.restore();

                rafRef.current = requestAnimationFrame(detectLoop);
            })
            .catch((err) => {
                if (!cancelledRef.current) setError(err.message);
            });
    }

    function capturePhoto() {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = video.videoWidth;
        tempCanvas.height = video.videoHeight;
        tempCanvas.getContext('2d').drawImage(video, 0, 0);
        setCapturedImage(tempCanvas.toDataURL('image/jpeg', 0.8));
        setUploadStatus(null);
    }

    async function uploadPhoto() {
        if (!capturedImage || !targetUserId.trim()) return;
        setUploadStatus('Uploading...');
        try {
            const base64 = capturedImage.split(',')[1];
            const res = await fetch(`/api/user/${encodeURIComponent(targetUserId.trim())}/face`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64 }),
            });
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(errText || `Server returned ${res.status}`);
            }
            const data = await res.json();
            setUploadStatus(`Uploaded! ${data.length} face(s) registered.`);
            setCapturedImage(null);
        } catch (err) {
            setUploadStatus(`Upload failed: ${err.message}`);
        }
    }

    function toggleCamera() {
        setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
    }

    return (
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Typography variant="h5">Facial Recognition</Typography>
            {error && <Alert severity="error">{error}</Alert>}
            {!error && <Typography>{status}</Typography>}
            <Box sx={{ position: 'relative', display: 'inline-block' }}>
                <Box
                    component="video"
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    sx={{
                        display: 'block',
                        width: videoSize ? videoSize.width : undefined,
                        height: videoSize ? videoSize.height : undefined,
                        transform: 'scaleX(-1)',
                    }}
                />
                <Box
                    component="canvas"
                    ref={canvasRef}
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: videoSize ? videoSize.width : undefined,
                        height: videoSize ? videoSize.height : undefined,
                    }}
                />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="contained" onClick={toggleCamera}>
                    Switch to {facingMode === 'user' ? 'Back' : 'Front'} Camera
                </Button>
                <Button variant="contained" color="secondary" onClick={capturePhoto}>
                    Take Picture
                </Button>
            </Box>
            <TextField
                label="User ID"
                size="small"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                sx={{ width: 250 }}
            />
            {capturedImage && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <Box component="img" src={capturedImage} alt="Captured"
                        sx={{ width: 160, height: 'auto', borderRadius: 1, border: '1px solid #ccc' }} />
                    <Button variant="contained" color="success" onClick={uploadPhoto}
                        disabled={!targetUserId.trim()}>
                        Send to Server
                    </Button>
                </Box>
            )}
            {uploadStatus && (
                <Alert severity={uploadStatus.startsWith('Uploaded') ? 'success' : 'error'}>
                    {uploadStatus}
                </Alert>
            )}
        </Box>
    );
}
