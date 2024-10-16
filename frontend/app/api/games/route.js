import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mood = searchParams.get('mood') || '';

  // Placeholder response
  const games = [
    { id: 1, name: 'Adventure Game 1' },
    { id: 2, name: 'Horror Game 2' },
  ];

  const filteredGames = games.filter((game) => game.name.toLowerCase().includes(mood.toLowerCase()));
  return NextResponse.json(filteredGames);
}
