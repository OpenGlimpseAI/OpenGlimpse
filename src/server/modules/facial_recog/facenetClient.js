import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PYTHON_SERVER_DIR = join(__dirname, '..', '..', 'python_server');
const PYTHON_PATH = join(__dirname, '..', '..', '..', '..', '.venv', 'Scripts', 'python.exe');
const SERVER_URL = 'http://127.0.0.1:8000';

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

    serverProcess = spawn(PYTHON_PATH, [serverPath], {
        cwd: PYTHON_SERVER_DIR,
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

    const response = await fetch(`${SERVER_URL}${endpoint}`, {
        method: 'POST',
        body: formData,
    });

    let data;
    try {
        data = await response.json();
    } catch {
        const text = await response.text();
        throw new Error(
            `Python server request to ${endpoint} failed (${response.status}): ${text.slice(0, 500)}`
        );
    }

    if (!response.ok || !data.success) {
        const serverError = data.detail || data.error || JSON.stringify(data);
        throw new Error(`Python server request to ${endpoint} failed: ${serverError}`);
    }

    return data;
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
