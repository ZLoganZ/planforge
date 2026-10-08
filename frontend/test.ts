import { useRouter } from 'next/navigation'; declare const r: ReturnType<typeof useRouter>; r.push({ pathname: '/login' } as any);
