const fs = require('fs');
const path = require('path');
const { sequelize, Programme, Delegate, ProgrammeDelegate } = require('../src/server/database/db.cjs');
const { User, FaceEmbeddings } = require('../src/server/database/dbcrudmethods');

const TEST_IMAGES_DIR = path.join(__dirname, '..', 'src', 'server', 'modules', 'facial_recog', 'test-images');
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.bmp', '.webp'];

function getDefaultImage(subfolderPath) {
    const files = fs.readdirSync(subfolderPath);
    for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (IMAGE_EXTENSIONS.includes(ext) && path.basename(file, ext).toLowerCase() === 'default') {
            return path.join(subfolderPath, file);
        }
    }
    return null;
}

function getTestImages(subfolderPath) {
    const files = fs.readdirSync(subfolderPath);
    const testImages = [];
    for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        const name = path.basename(file, ext).toLowerCase();
        if (IMAGE_EXTENSIONS.includes(ext) && name !== 'default') {
            testImages.push(path.join(subfolderPath, file));
        }
    }
    return testImages;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function clearDatabase() {
    const tables = [
        'offline_queue', 'chat_messages', 'scan_events', 'programme_delegates',
        'ready_to_depart', 'attendance_records', 'staff', 'delegates',
        'routes', 'programmes', 'faceEmbeddings', 'admins', 'attendees',
        'messages', 'users'
    ];
    console.log('Clearing database...');
    for (const table of tables) {
        await sequelize.query(`DELETE FROM "${table}"`);
    }
    console.log('Database cleared.\n');
}

async function seed() {
    console.log('Starting seed...\n');

    await clearDatabase();
    await delay(1000);

    const folders = fs.readdirSync(TEST_IMAGES_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

    if (folders.length === 0) {
        console.log('No subfolders found in test-images/');
        console.log('Expected structure:');
        console.log('  test-images/');
        console.log('    <person-name>/');
        console.log('      default.jpg   (primary face)');
        console.log('      test1.jpg     (optional test images)');
        console.log('      test2.jpg');
        process.exit(0);
    }

    console.log(`Found ${folders.length} person(s): ${folders.join(', ')}\n`);

    const results = [];

    for (const folder of folders) {
        const subfolderPath = path.join(TEST_IMAGES_DIR, folder);
        console.log(`Processing: ${folder}`);

        const defaultImage = getDefaultImage(subfolderPath);
        if (!defaultImage) {
            console.log(`  Skipped - no default image found (expected default.jpg/png/etc)`);
            continue;
        }

        const testImages = getTestImages(subfolderPath);
        console.log(`  Default: ${path.basename(defaultImage)}`);
        if (testImages.length > 0) {
            console.log(`  Test images: ${testImages.map(f => path.basename(f)).join(', ')}`);
        }

        const user = await User.create(folder);
        console.log(`  Created user: ${user.id}`);

        const imageData = fs.readFileSync(defaultImage);
        const ext = path.extname(defaultImage).toLowerCase();
        const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
        const photoUrl = `data:${mime};base64,${imageData.toString('base64')}`;
        let faceCount = 0;
        try {
            const records = await FaceEmbeddings.createFromImage(user.id, imageData, 'primary');
            faceCount = records.length;
            console.log(`  Registered ${records.length} face(s) as primary`);
        } catch (err) {
            console.error(`  Failed to process face: ${err.message}`);
        }
        results.push({ name: folder, userId: user.id, faces: faceCount, photoUrl });

        console.log('');
    }

    console.log('Seeding programme and delegates...\n');

    const programme = await Programme.create({
        name: 'Test Programme',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        status: 'active',
    });
    console.log(`  Created programme: ${programme.id} ("${programme.name}")`);

    for (const r of results) {
        const delegate = await Delegate.create({ name: r.name, photoUrl: r.photoUrl });
        await delegate.update({ userId: r.userId });
        await ProgrammeDelegate.create({ programmeId: programme.id, delegateId: delegate.id });
        console.log(`  Linked delegate "${r.name}" (id: ${delegate.id}) → user (id: ${r.userId})`);
    }

    console.log('\nSeed complete!\n');
    console.log('Users created:');
    for (const r of results) {
        console.log(`  ${r.name} (id: ${r.userId}, faces: ${r.faces})`);
    }
    console.log(`\nProgramme: ${programme.id} ("${programme.name}")`);
    console.log(`Delegates: ${results.length}`);

    process.exit(0);
}

seed().catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
});
