import { ParsedEvent, Side } from "./parseLog.js";

// Match phases based on MR15 format.
type Phase = "H1" | "H2" | "OT";

//How a round was decided.
type OutcomeMethod =
  | "bomb_defused"
  | "bomb_exploded"
  | "last_kill"
  | "unknown";

// Types extracted from ParsedEvent.
type KillEvent = Extract<ParsedEvent, { type: "kill" }>;
type MatchStartEvent = Extract<ParsedEvent, { type: "match_start" }>;

// Representation of a single round.
type Round = {
  startTs: Date;
  endTs?: Date;
  kills: KillEvent[];
  bombDefused: boolean;
  bombExploded: boolean;
};

// Returns the last element in an array (or undefined if empty).
function last<T>(arr: T[]): T | undefined {
  return arr.length ? arr[arr.length - 1] : undefined;
}

// Used to retrieve the most recent matching event from the log.
function findLast<T>(
  items: T[],
  matches: (item: T) => boolean
): T | undefined {
  for (let i = items.length - 1; i >= 0; i--) {
    if (matches(items[i])) return items[i];
  }
  return undefined;
}


// Type guard used to safely narrow ParsedEvent to match_start.
function isMatchStartEvent(e: ParsedEvent): e is MatchStartEvent {
  return e.type === "match_start";
}

// Determines which phase a round belongs to.
function getPhase(roundNumber: number): Phase {
  if (roundNumber <= 15) return "H1";
  if (roundNumber <= 30) return "H2";
  return "OT";
}

// Responsible for deriving rounds, scores,team identity, and player statistics.
export function buildMatch(allEvents: ParsedEvent[]) {
  // Logs may contain multiple Match_Start events (warmup/restarts). Use of the last one as the actual match start.
  const matchStartEvent = findLast(allEvents, isMatchStartEvent);
  if (!matchStartEvent) throw new Error("No match start found");

  const matchStartTs = matchStartEvent.ts;

  // Map name is optional in the log; fall back to Nuke if missing. A little hard-coded :/
  const mapName =
    "map" in matchStartEvent && typeof matchStartEvent.map === "string"
      ? matchStartEvent.map
      : "Nuke";

  // Only consider events that occur after the match actually starts.
  const matchEvents = allEvents.filter((e) => e.ts >= matchStartTs);

  //Track which team started on which side. Used to assign stable Team A / Team B identities.
  const startedSides: Record<Side, string> = { CT: "", TERRORIST: "" };
  for (const e of matchEvents) {
    if (e.type === "team_playing") startedSides[e.side] = e.team;
  }

  // Collect team names seen in the match.
  const teamNameSet = new Set<string>();
  for (const e of matchEvents) {
    if (e.type === "team_playing") teamNameSet.add(e.team);
  }
  const derivedTeamNames = Array.from(teamNameSet);

  // Resolve stable Team A / Team B naming.
  const teamAName = startedSides.CT || derivedTeamNames[0] || "Team A";
  const teamBName =
    (startedSides.TERRORIST && startedSides.TERRORIST !== teamAName
      ? startedSides.TERRORIST
      : derivedTeamNames.find((n) => n !== teamAName)) || "Team B";

  // Standard MR15 halftime.
  const halftimeRound = 15;

  // Resolves which team name corresponds to a side (CT/T) at a given round, accounting for the halftime side swap.  
  function teamForSideAtRound(side: Side, roundNumber: number): string {
    const swapped = roundNumber > halftimeRound;
    if (!swapped) return side === "CT" ? teamAName : teamBName;
    return side === "CT" ? teamBName : teamAName;
  }

  // Group events into rounds.
  const rounds: Round[] = [];
  let currentRoundIndex = -1;

  for (const e of matchEvents) {
    if (e.type === "round_start") {
      currentRoundIndex++;
      rounds[currentRoundIndex] = {
        startTs: e.ts,
        kills: [],
        bombDefused: false,
        bombExploded: false,
      };
      continue;
    }

    // Ignore events that occur before the first round starts.
    if (currentRoundIndex < 0) continue;

    if (e.type === "round_end") {
      rounds[currentRoundIndex].endTs = e.ts;
      continue;
    }

    if (e.type === "kill") {
      rounds[currentRoundIndex].kills.push(e);
      continue;
    }

    if (e.type === "bomb_defused") {
      rounds[currentRoundIndex].bombDefused = true;
      continue;
    }

    if (e.type === "bomb_exploded") {
      rounds[currentRoundIndex].bombExploded = true;
      continue;
    }
  }

  // Fallback for rare cases where "Round_End" is missing.
  for (const r of rounds) {
    if (!r.endTs) {
      const lastKill = last(r.kills);
      r.endTs = lastKill?.ts ?? r.startTs;
    }
  }

  // Determine match end time. Prefer the last "Round_End", otherwise fall back to the last event.
  type RoundEndEvent = Extract<ParsedEvent, { type: "round_end" }>;
  function isRoundEndEvent(e: ParsedEvent): e is RoundEndEvent {
    return e.type === "round_end";
  }

  const lastRoundEnd = findLast(matchEvents, isRoundEndEvent);
  const matchEndTs =
    lastRoundEnd?.ts ?? last(matchEvents)?.ts ?? matchStartTs;

  // Scoreboard progression and round outcomes.
  let teamAScore = 0;
  let teamBScore = 0;

  const roundOutcomes: Array<{
    round: number;
    phase: Phase;
    method: OutcomeMethod;
    winnerSide: Side | null;
    winnerTeam: string | null;
    teamAScoreAfter: number;
    teamBScoreAfter: number;
  }> = [];

  const scoreboard = rounds.map((round, i) => {
    const roundNumber = i + 1;
    const phase = getPhase(roundNumber);

    let winnerSide: Side | undefined;
    let method: OutcomeMethod = "unknown";

    if (round.bombDefused) {
      winnerSide = "CT";
      method = "bomb_defused";
    } else if (round.bombExploded) {
      winnerSide = "TERRORIST";
      method = "bomb_exploded";
    } else {
      const lastKill = last(round.kills);
      if (lastKill) {
        winnerSide = lastKill.killer.team;
        method = "last_kill";
      }
    }

    let winnerTeam: string | null = null;

    if (winnerSide) {
      winnerTeam = teamForSideAtRound(winnerSide, roundNumber);
      if (winnerTeam === teamAName) teamAScore++;
      else if (winnerTeam === teamBName) teamBScore++;
    }

    roundOutcomes.push({
      round: roundNumber,
      phase,
      method,
      winnerSide: winnerSide ?? null,
      winnerTeam,
      teamAScoreAfter: teamAScore,
      teamBScoreAfter: teamBScore,
    });

    return { round: roundNumber, phase, teamAScore, teamBScore };
  });

  // Determine map winner from the final score.
  const final = last(scoreboard);
  const mapWinner =
    !final
      ? null
      : final.teamAScore > final.teamBScore
      ? teamAName
      : teamBName;

  // Aggregate player statistics from each kill in the round. 
  const players: Record<
    string,
    { kills: number; deaths: number; teamName: string }
  > = {};

  for (let i = 0; i < rounds.length; i++) {
    const roundNumber = i + 1;
    const round = rounds[i];

    for (const kill of round.kills) {
      const killerTeamName = teamForSideAtRound(
        kill.killer.team,
        roundNumber
      );
      const victimTeamName = teamForSideAtRound(
        kill.victim.team,
        roundNumber
      );

      players[kill.killer.name] ??= {
        kills: 0,
        deaths: 0,
        teamName: killerTeamName,
      };
      players[kill.victim.name] ??= {
        kills: 0,
        deaths: 0,
        teamName: victimTeamName,
      };

      players[kill.killer.name].teamName = killerTeamName;
      players[kill.victim.name].teamName = victimTeamName;

      players[kill.killer.name].kills++;
      players[kill.victim.name].deaths++;
    }
  }

  // Calculate average active round duration (start to end).
  const durations = rounds.map(
    (round) => (round.endTs!.getTime() - round.startTs.getTime()) / 1000
  );

  const avgRoundLengthSec =
    durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

  return {
    mapName,
    matchStartTs,
    matchEndTs,
    mapWinner,
    teamAName,
    teamBName,
    startedSides,
    halftimeRound,
    scoreboard,
    roundOutcomes,
    players,
    avgRoundLengthSec,
  };
}