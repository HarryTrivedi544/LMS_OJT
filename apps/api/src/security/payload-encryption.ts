export const isPayloadEncryptionRequired = (path: string) => {
  const publicPaths = [
    "/api/v1/auth/login",
    "/api/v1/auth/refresh",
    "/api/v1/health",
  ];

  return !publicPaths.some((publicPath) => path.startsWith(publicPath));
};
