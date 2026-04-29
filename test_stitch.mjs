import fs from 'fs';

async function testStitch() {
  const token = process.env.STITCH_API_TOKEN || '<YOUR_API_TOKEN_HERE>';
  try {
    const res = await fetch('https://stitch.googleapis.com/v1/projects', {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });

    const data = await res.text();
    console.log("Status with Bearer:", res.status);
    console.log("Data:", data.substring(0, 500));
  } catch (e) {
    console.error(e);
  }
}

testStitch();
