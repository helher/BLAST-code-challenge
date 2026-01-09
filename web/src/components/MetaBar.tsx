type Meta = {
  mapName: string;
  mapWinner: string | null;
  matchLengthMin: number;
  avgRoundLengthSec: number;
};

export default function MetaBar({ meta }: { meta: Meta }) {
  return (
    <section className="metaBar">
      <div className="metaItem">
        <div className="metaLabel">MAP</div>
        <div className="metaValue">
          <img
            className="metaIcon"
            src="https://raw.githubusercontent.com/vgalisson/csgo-map-icons/62aea83e8533a7d22328ca693acc52807f6bab85/svg/map_icon_de_nuke.svg"
            alt="Nuke"
          />
          {meta.mapName}
        </div>
      </div>

      <div className="metaItem">
        <div className="metaLabel">MAP WINNER</div>
        <div className="metaValue">{meta.mapWinner ?? "—"}</div>
      </div>

      <div className="metaItem">
        <div className="metaLabel">MATCH LENGTH</div>
        <div className="metaValue">{meta.matchLengthMin} minutes</div>
      </div>

      <div className="metaItem">
        <div className="metaLabel">AVG ROUND LENGTH</div>
        <div className="metaValue">{meta.avgRoundLengthSec} seconds</div>
      </div>
    </section>
  );
}
