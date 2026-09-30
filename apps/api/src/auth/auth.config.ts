export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    if (!secret) throw new Error('JWT_SECRET is required in production.');
    return secret;
  }

  return secret || 'dosje-dev-secret';
}
