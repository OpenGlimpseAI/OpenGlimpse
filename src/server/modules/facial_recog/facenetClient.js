import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PYTHON_SERVER_DIR = join(__dirname, '..', '..', 'python_server');
const VENV_DIR = join(__dirname, '..', '..', '..', '..', '.venv');
const PYTHON_PATH_WIN = join(VENV_DIR, 'Scripts', 'python.exe');
const PYTHON_PATH_UNIX = join(VENV_DIR, 'bin', 'python3');
const PYTHON_PATH = process.platform === 'win32' ? PYTHON_PATH_WIN : PYTHON_PATH_UNIX;
const PYTHON_SERVER_URL = process.env.PYTHON_SERVER_URL || 'http://127.0.0.1:8000';

let serverProcess = null;
let serverReady = false;
let readyPromise = null;
let readyResolve = null;

/**
 * Installs Python dependencies if needed, then starts the FastAPI server.
 * Returns a promise that resolves when the server is ready to accept requests.
 */
export function startPythonServer() {
    if (serverReady) return Promise.resolve();
    if (process.env.PYTHON_SERVER_URL) {
        serverReady = true;
        console.log(`[Python Server] Using remote server at ${PYTHON_SERVER_URL}`);
        return Promise.resolve();
    }
    if (readyPromise) return readyPromise;

    readyPromise = new Promise((resolve, reject) => {
        readyResolve = resolve;

        const requirementsPath = join(PYTHON_SERVER_DIR, 'requirements.txt');
        const checkDeps = spawn(PYTHON_PATH, ['-c', 'import deepface, fastapi, uvicorn'], {
            cwd: PYTHON_SERVER_DIR,
        });

        checkDeps.on('close', (code) => {
            if (code === 0) {
                console.log('[Python Server] Dependencies already installed');
                launchServer();
            } else if (existsSync(requirementsPath)) {
                console.log('[Python Server] Installing dependencies...');
                const pip = spawn(PYTHON_PATH, ['-m', 'pip', 'install', '-r', requirementsPath], {
                    cwd: PYTHON_SERVER_DIR,
                    stdio: 'inherit',
                });

                pip.on('close', (code) => {
                    if (code !== 0) {
                        reject(new Error(`pip install failed with code ${code}`));
                        return;
                    }
                    launchServer();
                });
            } else {
                launchServer();
            }
        });
    });

    return readyPromise;
}

function launchServer() {
    console.log('[Python Server] Starting uvicorn...');
    const serverPath = join(PYTHON_SERVER_DIR, 'server.py');

    const localPort = new URL(PYTHON_SERVER_URL).port || '8000';

    serverProcess = spawn(PYTHON_PATH, [serverPath], {
        cwd: PYTHON_SERVER_DIR,
        env: { ...process.env, PORT: localPort },
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    function onServerOutput(data) {
        const msg = data.toString();
        console.log(`[Python Server] ${msg.trim()}`);
        if (msg.includes('Uvicorn running on')) {
            serverReady = true;
            if (readyResolve) readyResolve();
        }
    }

    serverProcess.stdout.on('data', onServerOutput);
    serverProcess.stderr.on('data', onServerOutput);

    serverProcess.on('close', (code) => {
        console.log(`[Python Server] Exited with code ${code}`);
        serverReady = false;
        serverProcess = null;
    });
}

/**
 * Stops the Python server if it is running.
 */
export function stopPythonServer() {
    if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
        serverReady = false;
    }
}

const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const COLD_START_POLL_INTERVAL_MS = 3000;
const COLD_START_TIMEOUT_MS = 180000;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPythonReady(timeoutMs = COLD_START_TIMEOUT_MS) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const res = await fetch(`${PYTHON_SERVER_URL}/health`, { signal: AbortSignal.timeout(15000) });
            if (res.ok) return true;
        } catch {
            // service still booting
        }
        await sleep(COLD_START_POLL_INTERVAL_MS);
    }
    console.warn('[FaceNet] Python server did not become ready in time');
    return false;
}

async function postFormData(endpoint, formData) {
    const response = await fetch(`${PYTHON_SERVER_URL}${endpoint}`, {
        method: 'POST',
        body: formData,
    });

    const text = await response.text();

    let data;
    try {
        data = JSON.parse(text);
    } catch {
        const err = new Error(
            `Python server request to ${endpoint} failed (${response.status}): ${text.slice(0, 500)}`
        );
        err.status = response.status;
        throw err;
    }

    if (!response.ok || !data.success) {
        const serverError = data.detail || data.error || JSON.stringify(data);
        const err = new Error(`Python server request to ${endpoint} failed: ${serverError}`);
        err.status = response.status;
        throw err;
    }

    return data;
}

async function callPythonServer(endpoint, imageInput) {
    if (!serverReady) {
        await startPythonServer();
    }

    let imageBuffer;
    let fileName = 'image.jpg';

    if (typeof imageInput === 'string') {
        imageBuffer = readFileSync(imageInput);
        fileName = imageInput.split(/[/\\]/).pop();
    } else {
        imageBuffer = imageInput;
    }

    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
    formData.append('file', blob, fileName);

    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            return await postFormData(endpoint, formData);
        } catch (err) {
            lastError = err;
            const retryable = err.status && RETRYABLE_STATUSES.has(err.status);
            if (!retryable || attempt === 3) break;
            console.log(`[FaceNet] Python server not ready yet (attempt ${attempt}), waiting for it to boot...`);
            if (!(await waitForPythonReady())) break;
        }
    }

    if (lastError.status && RETRYABLE_STATUSES.has(lastError.status)) {
        throw new Error(
            `Face recognition service is unreachable (HTTP ${lastError.status} on ${endpoint}) after retries. ` +
            `The Python service on Render is down or failing to boot. ` +
            `Open its Render logs to check for OOM (Killed) or a startup error.`
        );
    }
    throw lastError;
}

export async function getFaceEmbedding(imageInput) {
    const data = await callPythonServer('/embed', imageInput);
    return data.embedding;
}

export async function detectFaces(imageInput) {
    const data = await callPythonServer('/detect', imageInput);
    return data.faces;
}

export async function getFaceEmbeddings(imageInput) {
    const data = await callPythonServer('/embed-all', imageInput);
    return data.faces.map(face => ({
        faceImage: Buffer.from(face.faceImage, 'base64'),
        embedding: face.embedding,
        bbox: face.bbox,
    }));
}
