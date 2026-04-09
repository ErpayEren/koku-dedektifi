const ENDPOINT = 'https://koku-dedektifi.vercel.app/api/ops?r=catalog-backfill-evidence';
const LIMIT = 500;

async function runBackfill() {
  let offset = 0;
  let totalRows = 0;
  let totalFragrances = 0;

  while (true) {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offset, limit: LIMIT }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Backfill failed at offset=${offset}: ${JSON.stringify(payload)}`);
    }

    const batchFragrances = Number(payload.fragranceBatchCount || 0);
    const matchedRows = Number(payload.matchedRows || 0);
    totalFragrances += batchFragrances;
    totalRows += matchedRows;

    process.stdout.write(
      `\rBackfill offset=${offset} +fragrances=${batchFragrances} +rows=${matchedRows} totalRows=${totalRows}`,
    );

    if (payload.done) break;
    offset = Number(payload.nextOffset || offset + LIMIT);
  }

  process.stdout.write('\n');
  console.log(`Backfill tamamlandi. Fragrance processed: ${totalFragrances}, Evidence rows produced: ${totalRows}`);
}

runBackfill().catch((error) => {
  console.error(error);
  process.exit(1);
});
