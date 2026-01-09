import { useEffect, useMemo, useState } from "react";
import Hero from "./components/Hero";
import MetaBar from "./components/MetaBar";
import RoundSummary from "./components/RoundSummary";
import TeamTables from "./components/TeamTables";

type Player = {
  name: string;
  teamName: string;
  kills: number;
  deaths: number;
  kd: number;
};

type SummaryResponse = {
  mapName: string;
  mapWinner: string;
  matchLengthMin: number;
  avgRoundLengthSec: number;
  teamAName: string;
  teamBName: string;
  halftimeRound: number;
  players: Player[];
};

type RoundOutcome = {
  round: number;
  phase: "H1" | "H2" | "OT";
  method: "bomb_defused" | "bomb_exploded" | "last_kill" | "unknown";
  winnerSide: "CT" | "TERRORIST" | null;
  winnerTeam: string | null;
  teamAScoreAfter: number;
  teamBScoreAfter: number;
};

type RoundsResponse = {
  rounds: RoundOutcome[];
  halftimeRound: number;
  teamAName: string;
  teamBName: string;
};

export default function App() {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [rounds, setRounds] = useState<RoundsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load all required match data on initial render.
  useEffect(() => {
    (async () => {
      try {
        const [s, r] = await Promise.all([
          fetch("/api/summary").then((x) => x.json()),
          fetch("/api/rounds").then((x) => x.json()),
        ]);
        setSummary(s);
        setRounds(r);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load data");
      }
    })();
  }, []);

  // Extract the metadata needed by the UI from the match summary.
  const meta = useMemo(() => {
    if (!summary) return null;
    return {
      mapName: summary.mapName,
      mapWinner: summary.mapWinner,
      matchLengthMin: summary.matchLengthMin,
      avgRoundLengthSec: summary.avgRoundLengthSec,
    };
  }, [summary]);

  return (
    <div>
      <Hero />
      {/* Conditional rendering to display UI sections only when the required data is available. */}
      <main className="container">
        {error && <div className="errorBox">{error}</div>}

        {meta && <MetaBar meta={meta} />}

        {rounds && <RoundSummary rounds={rounds.rounds} />}

        {summary && (
          <TeamTables
            teamAName={summary.teamAName}
            teamBName={summary.teamBName}
            players={summary.players}
          />
        )}
      </main>
    </div>
  );
}