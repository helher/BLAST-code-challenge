import { useMemo, useState } from "react";

type PlayerRow = {
  name: string;
  teamName: string;
  kills: number;
  deaths: number;
  kd: number;
};

type Team = {
  name: string;
  logoUrl: string;
};

// Given a player’s name, return the URL of that player’s national flag.
// Note: I am aware that this is hardcoded. For this task I hardcoded the mapping because the players are fixed. However, in a "real" system this would probably come from the API.
const flagByPlayer: Record<string, string> = {
  ZywOo:
    "https://upload.wikimedia.org/wikipedia/commons/c/c3/Flag_of_France.svg",
  apEX: "https://upload.wikimedia.org/wikipedia/commons/c/c3/Flag_of_France.svg",
  shox: "https://upload.wikimedia.org/wikipedia/commons/c/c3/Flag_of_France.svg",
  misutaaa:
    "https://upload.wikimedia.org/wikipedia/commons/c/c3/Flag_of_France.svg",
  Kyojin:
    "https://upload.wikimedia.org/wikipedia/commons/c/c3/Flag_of_France.svg",
  s1mple:
    "https://upload.wikimedia.org/wikipedia/commons/4/49/Flag_of_Ukraine.svg",
  b1t: "https://upload.wikimedia.org/wikipedia/commons/4/49/Flag_of_Ukraine.svg",
  electronic:
    "https://upload.wikimedia.org/wikipedia/en/f/f3/Flag_of_Russia.svg",
  Perfecto: "https://upload.wikimedia.org/wikipedia/en/f/f3/Flag_of_Russia.svg",
  Boombl4: "https://upload.wikimedia.org/wikipedia/en/f/f3/Flag_of_Russia.svg",
};

// Normalises a playe name into a slug. Used to create predictable asset paths based on player names.
function playerSlug(name: string) {
  return (
    name
      .trim()
      .toLowerCase()
      // Replaces one or more spaces with underscores.
      .replace(/\s+/g, "_")
      // Removes everything that is not: letters, numbers, underscores.
      .replace(/[^a-z0-9_]/g, "")
  );
}

// Maps a player name to a static image path.
function playerImageSrc(playerName: string) {
  return `/assets/players/${playerSlug(playerName)}.png`;
}

// Attempts to load a player image based on a naming convention.
function PlayerAvatar({ name }: { name: string }) {
  const [broken, setBroken] = useState(false);

  // Falls back to a placeholder if the image cannot be loaded.
  if (broken) {
    return <div className="avatar" aria-label={`${name} avatar placeholder`} />;
  }

  return (
    <img
      className="avatarImg"
      src={playerImageSrc(name)}
      alt={`${name} avatar`}
      loading="lazy"
      onError={() => setBroken(true)}
    />
  );
}

// Component that renders a team's player stats.
function TeamTable({ team, players }: { team: Team; players: PlayerRow[] }) {
  return (
    <div className="teamCard">
      <div className="teamHeader">
        <div className="teamIdentity">
          <img className="teamLogo" src={team.logoUrl} alt={team.name} />
          <div className="teamName">{team.name}</div>
        </div>
      </div>

      <div className="tableHeader">
        <div>PLAYER</div>
        <div className="statHead">K</div>
        <div className="statHead">D</div>
        <div className="statHead">K/D</div>
      </div>

      <div className="rows">
        {players.map((player) => {
          const flag = flagByPlayer[player.name];
          return (
            <div className="row" key={player.name}>
              <div className="playerCell">
                <PlayerAvatar name={player.name} />
                <span className="flag">
                  {flag ? <img src={flag} alt="" /> : null}
                </span>
                <span className="playerName">{player.name}</span>
              </div>
              <div className="numCell">{player.kills}</div>
              <div className="numCell">{player.deaths}</div>
              <div className="numCell">{player.kd.toFixed(2)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TeamTables({
  teamAName,
  teamBName,
  players,
}: {
  teamAName: string;
  teamBName: string;
  players: PlayerRow[];
}) {
  const parsedTeamNames = useMemo(() => {
    return Array.from(new Set(players.map((player) => player.teamName)));
  }, [players]);

  // Regex to identify teams across different naming conventions
  const isNavi = (name: string) => /navi|natus/i.test(name);
  const isVitality = (name: string) => /vitality/i.test(name);

  function resolveTeamName(
    predicate: (name: string) => boolean,
    fallbackA: string,
    fallbackB: string
  ) {
    const fromParsed = parsedTeamNames.find(predicate);
    if (fromParsed) return fromParsed;

    if (predicate(fallbackA)) return fallbackA;
    if (predicate(fallbackB)) return fallbackB;

    // If nothing matches, return fallbackA to keep UI stable.
    return fallbackA;
  }

  // Determine which parsed team names correspond to NAVI and Vitality.
  // Fallback order is intentionally inverted to avoid both teams resolving to the same name.
  const naviName = resolveTeamName(isNavi, teamAName, teamBName);
  const vitalityName = resolveTeamName(isVitality, teamBName, teamAName);

  const navi: Team = {
    name: naviName,
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/5/52/NAVI-Logo.svg",
  };

  const vitality: Team = {
    name: vitalityName,
    logoUrl: "/assets/team/Team_Vitality_Logo_2020.svg",
  };

  // Sorts players by kills (primary) and K/D ratio (secondary: if kills are similar).
  const sortByPerformance = (playerOne: PlayerRow, playerTwo: PlayerRow) =>
    playerTwo.kills - playerOne.kills || playerTwo.kd - playerOne.kd;

  // Group players by team and sort them by performance.
  const playersByTeam = useMemo(() => {
    return {
      navi: players
        .filter((player) => player.teamName === naviName)
        .sort(sortByPerformance),
      vitality: players
        .filter((player) => player.teamName === vitalityName)
        .sort(sortByPerformance),
    };
  }, [players, naviName, vitalityName]);

  return (
    <section className="teamsGrid">
      <TeamTable team={navi} players={playersByTeam.navi} />
      <TeamTable team={vitality} players={playersByTeam.vitality} />
    </section>
  );
}