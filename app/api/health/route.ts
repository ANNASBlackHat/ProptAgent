import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';

export async function GET() {
  let databaseStatus = 'unknown';

  try {
    const conn = await dbConnect();
    const readyState = conn.connection.readyState;
    // Mongoose connection states: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    databaseStatus = states[readyState] || 'unknown';
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'unknown';
    databaseStatus = `disconnected (error: ${errMsg})`;
  }

  return NextResponse.json({
    success: true,
    message: 'PropAgent API running',
    timestamp: new Date().toISOString(),
    database: databaseStatus,
  });
}
