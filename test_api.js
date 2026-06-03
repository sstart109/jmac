const url = 'https://www.gty.org/api/core-non-user';

async function getYearCount(year) {
  const path = `/api/website/sermons-by-field?locale=en&year=${year}&start=0&limit=1000`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: JSON.stringify({ relativePath: path })
    });
    const json = await res.json();
    return json.length;
  } catch (err) {
    console.error(`Error for ${year}:`, err.message);
    return 0;
  }
}

async function run() {
  let total = 0;
  for (let y = 1969; y <= 2026; y++) {
    const count = await getYearCount(y);
    console.log(`Year ${y}: ${count} sermons`);
    total += count;
    // sleep 200ms
    await new Promise(r => setTimeout(r, 200));
  }
  console.log(`Total sermons across all years: ${total}`);
}

run();
