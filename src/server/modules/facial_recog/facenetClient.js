import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PYTHON_SERVER_DIR = join(__dirname, '..', '..', '..', 'python_server');
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
        if (existsSync(requirementsPath)) {
            console.log('[Python Server] Installing dependencies...');
            const pip = spawn('pip', ['install', '-r', requirementsPath], {
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

    return readyPromise;
}

function launchServer() {
    console.log('[Python Server] Starting uvicorn...');
    const serverPath = join(PYTHON_SERVER_DIR, 'server.py');

    serverProcess = spawn('python', [serverPath], {
        cwd: PYTHON_SERVER_DIR,
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    serverProcess.stdout.on('data', (data) => {
        const msg = data.toString();
        console.log(`[Python Server] ${msg.trim()}`);
        if (msg.includes('Facenet model loaded successfully')) {
            serverReady = true;
            if (readyResolve) readyResolve();
        }
    });

    serverProcess.stderr.on('data', (data) => {
        console.error(`[Python Server] ${data.toString().trim()}`);
    });

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

/**
 * Calls the Python FastAPI server to get the Facenet embedding for an image.
 * @param {string|Buffer} imageInput - A file path or a Buffer containing the image.
 * @returns {Promise<number[]>} - The 128-d Facenet embedding.
 */
export async function getFaceEmbedding(imageInput) {
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

    const response = await fetch(`${SERVER_URL}/embed`, {
        method: 'POST',
        body: formData,
    });

    const data = await response.json();

    if (!data.success) {
        throw new Error(data.error || 'Failed to get embedding from Python server.');
    }

    return data.embedding;
}

/**
 * Calls the Python FastAPI server to detect faces in an image.
 * @param {string|Buffer} imageInput - A file path or a Buffer containing the image.
 * @returns {Promise<Array<{x: number, y: number, w: number, h: number}>>} - Array of face bounding boxes.
 */
export async function detectFaces(imageInput) {
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

    const response = await fetch(`${SERVER_URL}/detect`, {
        method: 'POST',
        body: formData,
    });

    const data = await response.json();

    if (!data.success) {
        throw new Error(data.error || 'Failed to detect faces from Python server.');
    }

    return data.faces;
}

/**
 * Calls the Python FastAPI server to detect all faces and get embeddings for each.
 * @param {string|Buffer} imageInput - A file path or a Buffer containing the image.
 * @returns {Promise<Array<{faceImage: Buffer, embedding: number[], bbox: {x: number, y: number, w: number, h: number}}>>}
 */
export async function getFaceEmbeddings(imageInput) {
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

    const response = await fetch(`${SERVER_URL}/embed-all`, {
        method: 'POST',
        body: formData,
    });

    const data = await response.json();

    if (!data.success) {
        throw new Error(data.error || 'Failed to get embeddings from Python server.');
    }

    return data.faces.map(face => ({
        faceImage: Buffer.from(face.faceImage, 'base64'),
        embedding: face.embedding,
        bbox: face.bbox,
    }));
}
