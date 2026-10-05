import app from './app.js';
import { pool } from './db/client.js';
import { releaseExpiredReservations } from './reservations/service.js';

const port = Number(process.env.PORT ?? 3000);
const server = app.listen(port, () => console.log(`FlashReserve listening on ${port}`));
const expirySweep = setInterval(() => {
  void releaseExpiredReservations().catch((error: unknown) => {
    console.error('Failed to release expired reservations', error);
  });
}, 15_000);
void releaseExpiredReservations().catch((error: unknown) => {
  console.error('Failed to release expired reservations at startup', error);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    clearInterval(expirySweep);
    server.close(() => void pool.end().finally(() => process.exit(0)));
  });
}
