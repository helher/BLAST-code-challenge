import Fastify from "fastify";
import { parseLog } from "./parseLog.js";
import { buildMatch } from "./buildMatch.js";

// Create a Fastify server instance. Responsible for handling HTTP requests and responses.
const app = Fastify();

// Function that rounds a number to two decimals.
function roundToTwoDecimals(n: number) {
  return Math.round(n * 100) / 100;
}

async function main() {
   // Parse the raw CS log file into structured events.
  const events = await parseLog("../data/match.log");

  // Transform parsed events into higher-level match data.
  const match = buildMatch(events);

  // Expose match summary data to the frontend.
  app.get("/api/summary", () => ({
    mapName: match.mapName,
    mapWinner: match.mapWinner,
    matchLengthMin: Math.round(
      (match.matchEndTs.getTime() - match.matchStartTs.getTime()) / 1000 / 60
    ),
    avgRoundLengthSec: Math.round(match.avgRoundLengthSec),

    teamAName: match.teamAName,
    teamBName: match.teamBName,

    // Convert player stats into an array for rendering. 
    players: Object.entries(match.players).map(([name, stats]) => ({
      name,
      teamName: stats.teamName,
      kills: stats.kills,
      deaths: stats.deaths,
      kd: stats.deaths === 0 
        ? stats.kills 
        : roundToTwoDecimals(stats.kills / stats.deaths),
    })),
  }));

  // Expose round-by-round data (used by RoundSummary.tsc in the UI).
  app.get("/api/rounds", () => ({
    rounds: match.roundOutcomes,
    halftimeRound: match.halftimeRound,
  }));

  // Public endpoint: round-by-round score progression (used by the UI).
  app.get("/api/scoreboard", () => match.scoreboard);
  
  // Debug endpoint: detailed per-round outcome data (not used by the UI).
  app.get("/api/debug/round-outcomes", () => match.roundOutcomes);

  await app.listen({ port: 3001 });
}

// Run the server and handle startup errors.
main().catch((err) => {
  console.error(err);
  process.exit(1);
});