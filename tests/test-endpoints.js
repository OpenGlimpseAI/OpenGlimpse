const fs = require('fs');
const path = require('path');

const PYTHON_URL = 'http://127.0.0.1:8000';
const TEST_IMAGES_DIR = path.join(__dirname, 'modules', 'facial_recog', 'test-images');

async function testEmbed() {
    const testImage = path.join(TEST_IMAGES_DIR, 'dwayne', 'default.png');
    if (!fs.existsSync(testImage)) {
        console.log('Test image not found:', testImage);
        return;
    }

    console.log('Testing /embed endpoint...');
    const imageBuffer = fs.readFileSync(testImage);
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    formData.append('file', blob, 'default.png');

    try {
        const response = await fetch(`${PYTHON_URL}/embed`, { method: 'POST', body: formData });
        const data = await response.json();
        console.log('Response:', JSON.stringify(data, null, 2));
        if (data.success) {
            console.log('Embedding length:', data.embedding.length);
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
}

async function testDetect() {
    const testImage = path.join(TEST_IMAGES_DIR, 'dwayne', 'default.png');
    if (!fs.existsSync(testImage)) {
        console.log('Test image not found:', testImage);
        return;
    }

    console.log('\nTesting /detect endpoint...');
    const imageBuffer = fs.readFileSync(testImage);
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    formData.append('file', blob, 'default.png');

    try {
        const response = await fetch(`${PYTHON_URL}/detect`, { method: 'POST', body: formData });
        const data = await response.json();
        console.log('Response:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
    }
}

async function testEmbedAll() {
    const testImage = path.join(TEST_IMAGES_DIR, 'dwayne', 'default.png');
    if (!fs.existsSync(testImage)) {
        console.log('Test image not found:', testImage);
        return;
    }

    console.log('\nTesting /embed-all endpoint...');
    const imageBuffer = fs.readFileSync(testImage);
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    formData.append('file', blob, 'default.png');

    try {
        const response = await fetch(`${PYTHON_URL}/embed-all`, { method: 'POST', body: formData });
        const data = await response.json();
        if (data.success) {
            console.log(`Found ${data.faces.length} face(s)`);
            for (const [i, face] of data.faces.entries()) {
                console.log(`  Face ${i + 1}: embedding length=${face.embedding.length}, bbox=`, face.bbox);
            }
        } else {
            console.log('Response:', JSON.stringify(data, null, 2));
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
}

async function main() {
    console.log('Make sure the Python server is running:');
    console.log('  cd src/server/python_server');
    console.log('  python server.py\n');

    await testEmbed();
    await testDetect();
    await testEmbedAll();
    console.log('\nDone.');
}

main();
