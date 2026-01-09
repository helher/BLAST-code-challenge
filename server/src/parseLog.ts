import * as fs from "fs";
import * as readline from "readline";

export type Side = "CT" | "TERRORIST";

// ParsedEvent represents events extracted from the match log.
// Each event is identified by its 'type' and includes a timestamp ('ts') plus additional data specific to that event type.
export type ParsedEvent =
  | { type: "match_start"; ts: Date; map?: string }
  | { type: "round_start"; ts: Date }
  | { type: "round_end"; ts: Date }
  | {
      type: "kill";
      ts: Date;
      killer: { name: string; team: Side };
      victim: { name: string; team: Side };
      headshot: boolean;
    }
  | { type: "team_playing"; ts: Date; side: Side; team: string }
  | { type: "bomb_defused"; ts: Date }
  | { type: "bomb_exploded"; ts: Date };

// Regex: Matches the base structure of a CS log line.
const reBase =
  /^(?<date>\d{2}\/\d{2}\/\d{4}) - (?<time>\d{2}:\d{2}:\d{2}): (?<message>.*)$/;

// Regex: Matches a player reference in the log, extracting player name, user id, steam id, and team (CT/TERRORIST).
const rePlayer =
  /^"(?<name>[^"<]+)<(?<userid>\d+)><(?<steam>[^>]+)><(?<team>CT|TERRORIST)>"/;

// Extract timestamp and message body from the log.
// Returns null if the line does not match the expected format.
function parseBase(line: string): { ts: Date; message: string } | null {
  const match = line.match(reBase);
  if (!match?.groups) return null;

  const { date, time, message } = match.groups;

  // Convert date and time strings into a JavaScript Date object
  const [mm, dd, yyyy] = date.split("/").map(Number);
  const [HH, MM, SS] = time.split(":").map(Number);
  const ts = new Date(yyyy, mm - 1, dd, HH, MM, SS);

  return { ts, message };
}

// Extracts player name and team side from a player token in the log.
// Returns null if the token does not match the expected format.
function parsePlayerToken(token: string): { name: string; team: Side } | null {
  const match = token.match(rePlayer);
  if (!match?.groups) return null;

  return {
    name: match.groups.name.trim(),
    team: match.groups.team as Side
  };
}

export async function parseLog(filePath: string): Promise<ParsedEvent[]> {
  const events: ParsedEvent[] = [];

  // Read the log file line by line and normalize CRLF/LF line endings. 
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity
  });

  // Parsed timestamp and message from the log line.
  for await (const line of rl) {
    const parsedLine = parseBase(line);
    if (!parsedLine) continue;

    const { ts, message } = parsedLine;

    // Match start (there may be multiple; picks the last one).
    if (message.includes('World triggered "Match_Start"')) {
      const mapMatch = message.match(/on "(?<map>[^"]+)"/);
      events.push({ type: "match_start", ts, map: mapMatch?.groups?.map });
      continue;
    }

    // Detect round start events.
    if (message.includes('World triggered "Round_Start"')) {
      events.push({ type: "round_start", ts });
      continue;
    }

    // Detect round end events.
    if (message.includes('World triggered "Round_End"')) {
      events.push({ type: "round_end", ts });
      continue;
    }

    // Parse which team is currently playing on each side (CT/T)
    if (message.startsWith('Team playing "')) {
      const teamSideMatch = message.match(/^Team playing "(?<side>CT|TERRORIST)": (?<team>.+)$/);
      if (teamSideMatch?.groups) {
        events.push({
          type: "team_playing",
          ts,
          side: teamSideMatch.groups.side as Side,
          team: teamSideMatch.groups.team
        });
      }
      continue;
    }

    // Bomb outcomes (round deciding)
    if (message.includes("SFUI_Notice_Bomb_Defused") || message.includes('triggered "Defused_The_Bomb"')) {
      events.push({ type: "bomb_defused", ts });
      continue;
    }

    if (message.includes("SFUI_Notice_Target_Bombed")) {
      events.push({ type: "bomb_exploded", ts });
      continue;
    }

    // Parse kill log lines to extract killer, victim, weapon, and headshot.
    if (message.includes(" killed ")) {
      const killMatch = message.match(
        /^(?<killer>"[^"]+").* killed (?<victim>"[^"]+").* with "(?<weapon>[^"]+)"/
      );
      if (!killMatch?.groups) continue;

      const killer = parsePlayerToken(killMatch.groups.killer);
      const victim = parsePlayerToken(killMatch.groups.victim);
      if (!killer || !victim) continue;

      const headshot = message.includes("(headshot)");

      // Store the parsed kill as a structured event.
      events.push({
        type: "kill",
        ts,
        killer,
        victim,
        headshot
      });

      continue;
    }
  }

  return events;
}