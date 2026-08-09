import { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';
import CheckIcon from '@mui/icons-material/Check';
import UndoIcon from '@mui/icons-material/Undo';
import { getProgrammes, recognizeFaces, markAttendanceBatch, lookupByBadge } from '../../services/api';
import QrScanner from '../../components/qr_scanner/QrScanner';
import { useConnectivity } from '../../hooks/useConnectivity';

const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights/';
const DETECTION_FRAME_SKIP = 8;

function getAuthUser() {
    const raw = localStorage.getItem('authUser');
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export default function CameraPage() {
    const navigate = useNavigate();
    const currentUser = getAuthUser();

    if (!currentUser) {
        navigate('/login');
        return null;
    }
    if (currentUser.role !== 'staff') {
        navigate('/');
        return null;
    }

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const displaySizeRef = useRef(null);
    const rafRef = useRef(null);
    const cancelledRef = useRef(false);
    const frameCountRef = useRef(0);
    const scanKeyRef = useRef(0);
    const facingModeRef = useRef(facingMode);

    useEffect(() => {
        facingModeRef.current = facingMode;
    }, [facingMode]);

    const { isOnline } = useConnectivity();

    const [programmes, setProgrammes] = useState([]);
    const [programmeId, setProgrammeId] = useState(null);
    const [showPicker, setShowPicker] = useState(false);

    const [error, setError] = useState(null);
    const [status, setStatus] = useState('Loading face detection models...');
    const [facingMode, setFacingMode] = useState('user');
    const [captured, setCaptured] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const [recognizing, setRecognizing] = useState(false);
    const [warmup, setWarmup] = useState(false);
    const [matches, setMatches] = useState([]);
    const [selected, setSelected] = useState(new Set());
    const [confirming, setConfirming] = useState(false);
    const [done, setDone] = useState(false);
    const [mode, setMode] = useState('facial');

    useEffect(() => {
        getProgrammes()
            .then((list) => {
                setProgrammes(list);
                if (list.length > 0) setProgrammeId(list[0].id);
            })
            .catch((e) => setError(e.message));
    }, []);

    const stopStream = useCallback(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
            videoRef.current.srcObject = null;
        }
    }, []);

    const startCamera = useCallback(async (mode) => {
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
        setCaptured(false);
        setCapturedImage(null);
        setMatches([]);
        setSelected(new Set());
        setConfirming(false);
        setDone(false);
        stopStream();
        if (mode === 'facial') {
            startCamera(facingMode);
        }

        return () => {
            cancelledRef.current = true;
            stopStream();
        };
    }, [facingMode, startCamera, stopStream, programmeId, mode]);

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

                if (facingModeRef.current === 'user') {
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

                if (facingModeRef.current === 'user') {
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

    async function handleCapture() {
        if (!programmeId) {
            setError('Please select a programme first');
            return;
        }

        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        if (facingMode === 'user') {
            const ctx = canvas.getContext('2d');
            ctx.save();
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0);
            ctx.restore();
        } else {
            canvas.getContext('2d').drawImage(video, 0, 0);
        }

        cancelledRef.current = true;
        stopStream();

        const imageBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        setCapturedImage(imageBase64);
        setCaptured(true);
        setRecognizing(true);

        try {
            const result = await recognizeFaces(programmeId, imageBase64);
            setMatches(result.matches);
            setSelected(new Set(result.matches.map((m) => m.delegateId)));
        } catch (e) {
            setError(e.message);
        } finally {
            setRecognizing(false);
        }
    }

    function toggleMatch(delegateId) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(delegateId)) next.delete(delegateId);
            else next.add(delegateId);
            return next;
        });
    }

    async function handleConfirm() {
        if (selected.size === 0 || !programmeId) return;
        setConfirming(true);
        try {
            const records = Array.from(selected).map((delegateId) => ({
                delegateId,
                status: 'present',
                method: mode === 'qr' ? 'qr' : 'auto',
            }));
            await markAttendanceBatch(programmeId, records);
            setDone(true);
        } catch (e) {
            setError(e.message);
        } finally {
            setConfirming(false);
        }
    }

    function handleRetake() {
        cancelledRef.current = false;
        setCaptured(false);
        setCapturedImage(null);
        setMatches([]);
        setSelected(new Set());
        setConfirming(false);
        setDone(false);
        setError(null);
        scanKeyRef.current += 1;
        if (mode === 'facial') {
            startCamera(facingMode);
        }
    }

    const currentProgramme = programmes.find((p) => p.id === programmeId);

    useEffect(() => {
        if (!recognizing) {
            setWarmup(false);
            return;
        }
        const timer = setTimeout(() => setWarmup(true), 8000);
        return () => clearTimeout(timer);
    }, [recognizing]);

    async function handleQrScan(decodedText) {
        if (!programmeId) return;
        setRecognizing(true);
        setCaptured(true);
        setStatus('Looking up badge...');
        try {
            const result = await lookupByBadge(programmeId, decodedText);
            setMatches(result.matches.map((m) => ({
                delegateId: m.delegateId,
                name: m.name,
                confidence: null,
                imageData: null,
            })));
            setSelected(new Set(result.matches.map((m) => m.delegateId)));
            if (result.errors.length > 0) {
                setError(result.errors.join('; '));
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setRecognizing(false);
        }
    }

    function handleModeChange(newMode) {
        if (newMode === mode) return;
        cancelledRef.current = true;
        stopStream();
        setCaptured(false);
        setCapturedImage(null);
        setMatches([]);
        setSelected(new Set());
        setConfirming(false);
        setDone(false);
        setError(null);
        cancelledRef.current = false;
        setMode(newMode);
    }

    return (
        <main className="directory-page" style={{ minHeight: '100dvh' }}>
            <header className="directory-header">
                <div className="flex items-center gap-2">
                    <h1 className="directory-title">{mode === 'facial' ? 'Facial Recognition' : 'QR Code Scanner'}</h1>
                    <div className="relative">
                        <button
                            className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 rounded-full px-3 py-1"
                            onClick={() => setShowPicker((p) => !p)}
                        >
                            {currentProgramme?.name || 'Select'}
                            <KeyboardArrowDown sx={{ fontSize: 14 }} />
                        </button>
                        {showPicker && (
                            <div className="absolute top-full left-0 mt-1 z-20 bg-white rounded-xl shadow-lg border border-slate-100 p-1 min-w-[180px]">
                                {programmes.map((p) => (
                                    <button
                                        key={p.id}
                                        className={`block w-full text-left rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                                            p.id === programmeId ? 'bg-sky-50 text-sky-700' : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                        onClick={() => { setProgrammeId(p.id); setShowPicker(false); }}
                                    >
                                        {p.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {error && (
                <div className="mx-4 mb-3 px-4 py-2 rounded-xl bg-red-50 text-red-600 text-sm flex justify-between items-center">
                    <span>{error}</span>
                    <button className="underline" onClick={() => setError(null)}>Dismiss</button>
                </div>
            )}

            <div className="px-4 pb-3">
                <div className="flex bg-slate-100 rounded-full p-0.5 max-w-[260px] mx-auto">
                    <button
                        className={`flex-1 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                            mode === 'facial' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                        onClick={() => handleModeChange('facial')}
                    >
                        Face Recognition
                    </button>
                    <button
                        className={`flex-1 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                            mode === 'qr' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                        onClick={() => handleModeChange('qr')}
                    >
                        QR Code
                    </button>
                </div>
            </div>

            {!captured ? (
                <>
                    {mode === 'facial' && (
                        <div className="flex items-center justify-center gap-1 px-4 pb-1">
                            {status !== 'Detecting faces...' && (
                                <span className="text-xs text-slate-400">{status}</span>
                            )}
                        </div>
                    )}

                    {mode === 'qr' && (
                        <div className="flex items-center justify-center gap-1 px-4 pb-1">
                            <span className="text-xs text-slate-400">Point camera at a QR code</span>
                        </div>
                    )}

                    <div className="px-4">
                        <div style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: 480,
                            margin: '0 auto',
                            background: '#000',
                            borderRadius: 12,
                            overflow: 'hidden',
                        }}>
                            {mode === 'facial' && (
                                <>
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        muted
                                        playsInline
                                        style={{
                                            display: 'block',
                                            width: '100%',
                                            height: 'auto',
                                            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                                        }}
                                    />
                                    <canvas
                                        ref={canvasRef}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: '100%',
                                        }}
                                    />
                                </>
                            )}
                            {mode === 'qr' && (
                                <QrScanner
                                    key={scanKeyRef.current}
                                    onScan={handleQrScan}
                                    onError={(msg) => setError(msg)}
                                    facingMode={facingMode}
                                />
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2 px-4 pt-3 pb-6 justify-center">
              {mode === 'facial' && (
                //render button based on connectivity
                            <button
                                className={`rounded-xl px-6 py-2.5 text-sm font-semibold transition-colors ${
                                    programmeId && isOnline
                                        ? 'bg-sky-gradient text-white'
                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                                disabled={!programmeId || !isOnline}
                                onClick={handleCapture}
                            >
                                {isOnline ? 'Capture & Recognize' : 'Unavailable while offline'}
                            </button>
                        )}
                        <button
                            className="bg-slate-100 text-slate-600 rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-slate-200 transition-colors"
                            onClick={toggleCamera}
                        >
                            Switch to {facingMode === 'user' ? 'Back' : 'Front'}
                        </button>
                    </div>
                </>
            ) : (
                <div className="px-4 pb-6">
                    {recognizing ? (
                        <div className="flex flex-col items-center gap-3 pt-8">
                            <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-slate-500">
                                {mode === 'facial'
                                    ? warmup
                                        ? 'Face recognition service is warming up, this can take a couple of minutes on first use...'
                                        : 'Recognizing faces...'
                                    : 'Looking up badge...'}
                            </p>
                        </div>
                    ) : done ? (
                        <div className="flex flex-col items-center gap-4 pt-8">
                            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                                <CheckIcon sx={{ fontSize: 28, color: '#059669' }} />
                            </div>
                            <p className="text-base font-semibold text-slate-800">Attendance marked</p>
                            <p className="text-sm text-slate-500">{selected.size} delegate(s) checked in</p>
                            <button
                                className="bg-sky-gradient text-white rounded-xl px-6 py-2.5 text-sm font-semibold"
                                onClick={handleRetake}
                            >
                                Scan Again
                            </button>
                        </div>
                    ) : (
                        <>
                            <p className="text-sm font-semibold text-slate-700 mb-2">
                                Matches ({matches.length})
                            </p>

                            {matches.length === 0 ? (
                                <div className="flex flex-col items-center gap-3 pt-6">
                                    <p className="text-sm text-slate-500">No matching delegates found</p>
                                    <button
                                        className="bg-sky-gradient text-white rounded-xl px-6 py-2.5 text-sm font-semibold"
                                        onClick={handleRetake}
                                    >
                                        Try Again
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2 mb-4">
                                    {matches.map((m) => {
                                        const isSelected = selected.has(m.delegateId);
                                        return (
                                            <div
                                                key={m.delegateId}
                                                className={`flex items-center justify-between bg-white rounded-xl px-4 py-3 border cursor-pointer transition-colors ${
                                                    isSelected ? 'border-sky-400 bg-sky-50' : 'border-slate-100'
                                                }`}
                                                onClick={() => toggleMatch(m.delegateId)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {m.imageData ? (
                                                        <img
                                                            src={`data:image/jpeg;base64,${m.imageData}`}
                                                            alt={m.name}
                                                            className="h-8 w-8 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                                                            isSelected ? 'bg-sky-gradient text-white' : 'bg-slate-100 text-slate-500'
                                                        }`}>
                                                            {m.name.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-800">{m.name}</p>
                                                        {m.confidence !== null && (
                                                            <p className="text-xs text-slate-400">
                                                                Confidence: {Math.round(m.confidence * 100)}%
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                                    isSelected ? 'bg-sky-gradient border-sky-600' : 'border-slate-300'
                                                }`}>
                                                    {isSelected && <CheckIcon sx={{ fontSize: 14, color: '#fff' }} />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {matches.length > 0 && (
                                <div className="flex gap-2">
                                    <button
                                        className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                                            selected.size === 0 || !isOnline
                                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                : 'bg-sky-gradient text-white'
                              }`}
                            //isonline used to render button based on connectivity
                                        disabled={selected.size === 0 || confirming || !isOnline}
                                        onClick={handleConfirm}
                                    >
                                        {confirming ? 'Marking...' : !isOnline ? 'Unavailable while offline' : `Confirm (${selected.size})`}
                                    </button>
                                    <button
                                        className="bg-slate-100 text-slate-600 rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-slate-200 transition-colors"
                                        onClick={handleRetake}
                                    >
                                        <UndoIcon sx={{ fontSize: 16 }} />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </main>
    );
}
