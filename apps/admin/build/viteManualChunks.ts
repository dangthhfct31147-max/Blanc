const VENDOR_GROUPS: Array<{
  chunk: string;
  matches: (pkg: string) => boolean;
}> = [
  {
    chunk: 'router-vendor',
    matches: (pkg) =>
      pkg === 'react-router' ||
      pkg === 'react-router-dom' ||
      pkg === '@remix-run/router',
  },
  {
    chunk: 'ui-vendor',
    matches: (pkg) =>
      pkg === 'react-hot-toast',
  },
  {
    chunk: 'charts-vendor',
    matches: (pkg) => pkg === 'recharts' || pkg === 'victory-vendor',
  },
  {
    chunk: 'icons-vendor',
    matches: (pkg) => pkg === 'lucide-react',
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
