import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Le défaut (1 Mo) est trop bas pour les pièces jointes de devoirs
      // (PDF scanné, photo) envoyées avec le reste du formulaire.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
