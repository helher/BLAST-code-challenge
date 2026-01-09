type OutcomeMethod = "bomb_defused" | "bomb_exploded" | "last_kill" | "unknown";
type Side = "CT" | "TERRORIST";

// Aggregates data needed to render round summaries
type RoundOutcome = {
  round: number;
  phase: "H1" | "H2" | "OT";
  method: OutcomeMethod;
  // Unknown cases do not crash the UI
  winnerSide: Side | null;
  // null allows: edge cases, incomplete logs
  winnerTeam: string | null;
  // The position after the round is finished: used for accumulation in the UI
  teamAScoreAfter: number;
  teamBScoreAfter: number;
};

const ICON = {
  ctKills: "https://hulun.dk/img/ct_round_win_by_kills.svg",
  tKills: "https://hulun.dk/img/t_round_win_by_kills.svg",
  bombDefused: "https://hulun.dk/img/bomb_defused.svg",
  bombExploded: "https://hulun.dk/img/bomb_exploded.svg",
};

// Maps a round outcome to its corresponding UI icon. 
function iconFor(round: RoundOutcome): string {
  if (round.method === "bomb_defused") return ICON.bombDefused;
  if (round.method === "bomb_exploded") return ICON.bombExploded;
  if (round.method === "last_kill") {
    return round.winnerSide === "CT" ? ICON.ctKills : ICON.tKills;
  }
  // For unknown: render CT kills icon but lower opacity so layout stays stable
  return ICON.ctKills;
}

// Calculates how many rounds each side (CT/T) has won in a given half and aggregates wins per side. 
function halfSideWins(rounds: RoundOutcome[], phase: "H1" | "H2") {
  const list = rounds
    .filter((round) => round.phase === phase);
  let ct = 0;
  let t = 0;

  for (const round of list) {
    if (round.winnerSide === "CT") ct++;
    else if (round.winnerSide === "TERRORIST") t++;
  }

  return { ct, t };
}

function sideClassFor(round: RoundOutcome): string {
  // Stagger CT icons at the top and T icons at the bottom.
  if (round.winnerSide === "CT") return "roundIcon--ct";
  if (round.winnerSide === "TERRORIST") return "roundIcon--t";

  // For "unknown": keep layout stable; default to CT position. Could probably be made better :')
  return "roundIcon--ct";
}

// Split rounds by half and precompute win counts per side
export default function RoundSummary({ rounds }: { rounds: RoundOutcome[] }) {
  const h1 = rounds.filter((round) => round.phase === "H1");
  const h2 = rounds.filter((round) => round.phase === "H2");

  const h1Wins = halfSideWins(rounds, "H1");
  const h2Wins = halfSideWins(rounds, "H2");


  return (
    <section>
      <div className="roundSummary">
        <div className="sectionTitle">ROUND SUMMARY</div>

        <div className="roundRow">
          <div className="halfScore">
            <div className="scoreNumber">{h1Wins.ct}</div>
            <div className="label">1st</div>
            <div className="scoreNumber">{h1Wins.t}</div>
          </div>

          {/* First half */}
          <div className="roundIcons">
            {h1.map((r) => {
              const src = iconFor(r);
              const isUnknown = r.method === "unknown" || !r.winnerSide;
              const iconPositionClass = sideClassFor(r);

              return (
                <div key={`h1-${r.round}`} className="roundSlot">
                  <img
                    className={`roundIcon ${iconPositionClass}`}
                    src={src}
                    alt={`Round ${r.round}`}
                    style={{ opacity: isUnknown ? 0.25 : 1 }}
                  />
                </div>
              );
            })}
          </div>

          <div className="halfDivider" />

          {/* Second half */}
          <div className="roundIcons">
            {h2.map((r) => {
              const src = iconFor(r);
              const isUnknown = r.method === "unknown" || !r.winnerSide;
              const iconPositionClass = sideClassFor(r);

              return (
                <div key={`h2-${r.round}`} className="roundSlot">
                  <img
                    className={`roundIcon ${iconPositionClass}`}
                    src={src}
                    alt={`Round ${r.round}`}
                    style={{ opacity: isUnknown ? 0.25 : 1 }}
                  />
                </div>
              );
            })}
          </div>

          <div className="halfScore">
            <div className="scoreNumber">{h2Wins.ct}</div>
            <div className="label">2nd</div>
            <div className="scoreNumber">{h2Wins.t}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
