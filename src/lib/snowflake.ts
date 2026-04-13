const EPOCH = 1704067200000n; // 2024-01-01
const WORKER_ID = 3n; // Sprink worker
let sequence = 0n;
let lastTimestamp = 0n;

export function snowflakeId(): string {
  let timestamp = BigInt(Date.now());
  if (timestamp === lastTimestamp) {
    sequence = (sequence + 1n) & 0xFFFn;
    if (sequence === 0n) {
      while (timestamp <= lastTimestamp) {
        timestamp = BigInt(Date.now());
      }
    }
  } else {
    sequence = 0n;
  }
  lastTimestamp = timestamp;
  const id = ((timestamp - EPOCH) << 22n) | (WORKER_ID << 12n) | sequence;
  return id.toString();
}
