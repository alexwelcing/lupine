import fs from 'fs';

async function testStitch() {
  const token = 'AQ.Ab8RN6L1h51-3dHjPxsJRGoc-ykQDm09hNI8K1_VjqcogM8vbg';
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
