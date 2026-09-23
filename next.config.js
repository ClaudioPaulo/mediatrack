/** @type {import('next').NextConfig} */
const nextConfig = {
  // Export estático puro (sem servidor Node): necessário para embrulhar a app
  // em Capacitor (iOS/Android) e permite alojar o resultado em qualquer CDN
  // estática. Nada aqui usa Server Components/Route Handlers dinâmicos.
  output: 'export',
  images: {
    // A otimização de imagem da Vercel não existe em export estático nem no
    // Capacitor; os componentes <Image> já usam domínios https normais.
    unoptimized: true,
  },
};

module.exports = nextConfig;
