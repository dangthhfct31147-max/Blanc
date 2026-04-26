const VENDOR_GROUPS: Array<{
  chunk: string;
  matches: (pkg: string) => boolean;
}> = [
  {
    chunk: 'react-vendor',
    matches: (pkg) =>
      pkg === 'react' ||
      pkg === 'react-dom' ||
      pkg === 'react-is' ||
      pkg === 'scheduler',
  },
  {
    chunk: 'router-vendor',
    matches: (pkg) =>
      pkg === 'react-router' ||
      pkg === 'react-router-dom' ||
      pkg === '@remix-run/router',
  },
  {
    chunk: 'clerk-vendor',
    matches: (pkg) => pkg.startsWith('@clerk/'),
  },
  {
    chunk: 'ui-vendor',
    matches: (pkg) =>
      pkg === 'clsx' ||
      pkg === 'goober' ||
      pkg === 'react-hot-toast' ||
      pkg === 'tailwind-merge',
  },
  {
    chunk: 'motion-vendor',
    matches: (pkg) =>
      pkg === 'framer-motion' || pkg === 'motion-dom' || pkg === 'motion-utils',
  },
  {
    chunk: 'charts-vendor',
    matches: (pkg) => pkg === 'recharts',
  },
  {
    chunk: 'icons-vendor',
    matches: (pkg) => pkg === 'lucide-react',
  },
  {
    chunk: 'effects-vendor',
    matches: (pkg) => pkg === 'canvas-confetti',
  },
  {
    chunk: 'ai-vendor',
    matches: (pkg) => pkg === '@google/genai',
  },
];

function getNodeModulePackage(id: string) {
  const normalizedId = id.replace(/\\/g, '/');
  const nodeModulesSegment = '/node_modules/';
  const nodeModulesIndex = normalizedId.lastIndexOf(nodeModulesSegment);

  if (nodeModulesIndex === -1) {
    return null;
  }

  const packagePath = normalizedId.slice(nodeModulesIndex + nodeModulesSegment.length);

  if (packagePath.startsWith('@')) {
    const [scope, name] = packagePath.split('/');
    return scope && name ? `${scope}/${name}` : null;
  }

  const [name] = packagePath.split('/');
  return name || null;
}

export function createManualChunks(id: string) {
  if (!id.includes('node_modules')) {
    return undefined;
  }

  const pkg = getNodeModulePackage(id);
  if (!pkg) {
    return 'vendor';
  }

  const match = VENDOR_GROUPS.find((group) => group.matches(pkg));
  return match?.chunk ?? 'vendor';
}
