import { handleAuth, handleLogin } from '@auth0/nextjs-auth0';
import { NextRequest } from 'next/server';

// 1. Statically bind authorization parameters using the official SDK sub-handler
const authHandler = handleAuth({
  login: handleLogin((req: any) => {
    // Safely extract the query string from the raw incoming address
    const { searchParams } = new URL(req.url);
    const connection = searchParams.get('connection');

    return {
      authorizationParams: connection ? { connection } : undefined
    };
  })
});

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ auth0: string }> }
) {
  // 2. Resolve the modern Next.js 15/16 async params promise safely
  const resolvedParams = await params; 
  
  // 3. Match the exact layout shape expected by the underlying engine
  const syntheticContext = {
    params: {
      auth0: resolvedParams.auth0
    }
  };

  return authHandler(request, syntheticContext as any);
}
