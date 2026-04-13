export const cacheKeys = {
  userFacts: (userId: string) => `sprink:facts:${userId}`,
  session: (sessionId: string) => `sprink:session:${sessionId}`,
};

export const cacheTTL = {
  userFacts: 30,
  session: 7 * 24 * 3600,
};
