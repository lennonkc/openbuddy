// Scholar (GearAct2)
// lead=#7a4ec4, spot=#b48ade, deep=#4a2d7a

export function ScholarGear() {
  return (
    <>
      <g className="gear-floor" fill="#7a4ec4" opacity="0.7">
        <rect x="14" y="128" width="10" height="3" />
        <rect x="28" y="128" width="10" height="3" />
        <rect x="42" y="128" width="10" height="3" />
        <rect x="56" y="128" width="10" height="3" />
        <rect x="70" y="128" width="10" height="3" />
        <rect x="84" y="128" width="10" height="3" />
        <rect x="98" y="128" width="10" height="3" />
      </g>
      <g className="gear-left">
        <rect x="2" y="64" width="14" height="14" fill="#b48ade" />
        <rect x="5" y="67" width="8" height="8" fill="transparent" />
        <g className="gear-tassel">
          <rect x="14" y="78" width="3" height="3" fill="#4a2d7a" />
          <rect x="16" y="81" width="3" height="3" fill="#4a2d7a" />
          <rect x="18" y="84" width="3" height="3" fill="#4a2d7a" />
        </g>
      </g>
      <g className="gear-right" fill="#b48ade">
        <rect x="100" y="62" width="12" height="8" />
        <rect x="102" y="64" width="8" height="4" fill="transparent" />
        <rect x="105" y="70" width="3" height="22" />
        <rect x="108" y="86" width="6" height="3" />
        <rect x="108" y="90" width="4" height="3" />
      </g>
      <g className="gear-top">
        <rect x="20" y="44" width="80" height="6" fill="#7a4ec4" />
        <rect x="30" y="32" width="60" height="14" fill="#7a4ec4" />
        <rect x="55" y="26" width="10" height="6" fill="#7a4ec4" />
        <rect x="60" y="28" width="6" height="4" fill="#b48ade" />
      </g>
    </>
  );
}
