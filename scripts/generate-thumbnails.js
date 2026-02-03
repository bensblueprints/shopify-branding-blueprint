const { createCanvas, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

// Thumbnail configurations for each day
const thumbnails = [
    {
        day: 1,
        title: "WHAT IS A BRAND?",
        subtitle: "Understanding the Foundation",
        colors: { start: '#1a1a2e', mid: '#16213e', end: '#0f3460' },
        accent: '#e94560'
    },
    {
        day: 2,
        title: "OWN YOUR BRAND",
        subtitle: "Asset vs Income Mindset",
        colors: { start: '#0f0f23', mid: '#1a1a40', end: '#2d2d6a' },
        accent: '#7b2cbf'
    },
    {
        day: 3,
        title: "PERFECT BRANDING",
        subtitle: "Identity & Design",
        colors: { start: '#1b1b2f', mid: '#1f4068', end: '#162447' },
        accent: '#00d9ff'
    },
    {
        day: 4,
        title: "PRODUCTS & SUPPLIERS",
        subtitle: "Building Your Catalog",
        colors: { start: '#0d1b2a', mid: '#1b263b', end: '#415a77' },
        accent: '#f77f00'
    },
    {
        day: 5,
        title: "CUSTOMIZATION",
        subtitle: "Make It Yours",
        colors: { start: '#1d1135', mid: '#2e1760', end: '#4a1c96' },
        accent: '#ff6b6b'
    },
    {
        day: 6,
        title: "3 INDUSTRIES",
        subtitle: "Clothing • Coffee • Supplements",
        colors: { start: '#0d0221', mid: '#0d324d', end: '#7b4397' },
        accent: '#ffd700'
    },
    {
        day: 7,
        title: "LAUNCH TIME",
        subtitle: "Your Brand Goes Live",
        colors: { start: '#0f0c29', mid: '#302b63', end: '#24243e' },
        accent: '#00ff88'
    }
];

function createGradient(ctx, width, height, colors) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, colors.start);
    gradient.addColorStop(0.5, colors.mid);
    gradient.addColorStop(1, colors.end);
    return gradient;
}

function drawThumbnail(config) {
    const width = 1280;
    const height = 720;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background gradient
    ctx.fillStyle = createGradient(ctx, width, height, config.colors);
    ctx.fillRect(0, 0, width, height);

    // Decorative elements - geometric shapes
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#ffffff';

    // Large circle in background
    ctx.beginPath();
    ctx.arc(width * 0.75, height * 0.3, 200, 0, Math.PI * 2);
    ctx.fill();

    // Smaller circles
    ctx.beginPath();
    ctx.arc(width * 0.15, height * 0.7, 100, 0, Math.PI * 2);
    ctx.fill();

    // Abstract lines
    ctx.globalAlpha = 0.05;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * 80);
        ctx.lineTo(width, i * 80 + 200);
        ctx.stroke();
    }

    ctx.globalAlpha = 1;

    // DAY badge
    ctx.fillStyle = config.accent;
    const badgeWidth = 280;
    const badgeHeight = 100;
    const badgeX = 80;
    const badgeY = 80;

    // Rounded rectangle for badge
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 15);
    ctx.fill();

    // Day number text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 60px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`DAY ${config.day}`, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);

    // Main title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 90px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Add text shadow for depth
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;

    ctx.fillText(config.title, 80, 240);

    // Subtitle
    ctx.font = '40px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = 10;
    ctx.fillText(config.subtitle, 80, 360);

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Brand watermark
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('BRANDING BLUEPRINT', width - 60, height - 50);

    // Accent line under title
    ctx.fillStyle = config.accent;
    ctx.fillRect(80, 350, 400, 6);

    // Progress dots at bottom
    const dotY = height - 60;
    const dotStartX = 80;
    const dotSpacing = 50;
    const dotRadius = 10;

    for (let i = 1; i <= 7; i++) {
        ctx.beginPath();
        ctx.arc(dotStartX + (i - 1) * dotSpacing, dotY, dotRadius, 0, Math.PI * 2);
        if (i <= config.day) {
            ctx.fillStyle = config.accent;
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        }
        ctx.fill();
    }

    return canvas;
}

async function generateAllThumbnails() {
    const outputDir = path.join(__dirname, '..', 'public', 'thumbnails');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('Generating course thumbnails...\n');

    for (const config of thumbnails) {
        const canvas = drawThumbnail(config);
        const filename = `day${config.day}-thumbnail.png`;
        const filepath = path.join(outputDir, filename);

        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(filepath, buffer);

        console.log(`✅ Day ${config.day}: ${config.title}`);
        console.log(`   Saved to: ${filepath}\n`);
    }

    console.log('All thumbnails generated successfully!');
    console.log(`\nThumbnails saved to: ${outputDir}`);
}

generateAllThumbnails();
