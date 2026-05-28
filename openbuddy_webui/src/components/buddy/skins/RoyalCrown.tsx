// Royal Crown (GearAct1)
// lead=#d4a02a, spot=#f0c860, deep=#8a6320

export function RoyalCrownGear() {
  return (
    <>
      <g className="gear-floor">
        <rect x="10" y="124" width="100" height="5" fill="#d4a02a" />
        <rect x="14" y="129" width="92" height="3" fill="#8a6320" />
      </g>
      <g className="gear-left">
        <rect x="2" y="70" width="14" height="14" fill="#f0c860" />
        <rect x="0" y="74" width="2" height="6" fill="#f0c860" />
        <rect x="16" y="74" width="2" height="6" fill="#f0c860" />
        <rect x="6" y="74" width="2" height="6" fill="#8a6320" />
        <rect x="8" y="72" width="2" height="2" fill="#8a6320" />
        <rect x="10" y="74" width="2" height="6" fill="#8a6320" />
        <rect x="8" y="80" width="2" height="2" fill="#8a6320" />
      </g>
      <g className="gear-right" fill="#f0c860">
        <rect x="102" y="68" width="16" height="4" />
        <rect x="104" y="72" width="12" height="4" />
        <rect x="106" y="76" width="8" height="4" />
        <rect x="108" y="80" width="4" height="4" />
        <rect x="106" y="84" width="8" height="4" />
        <rect x="104" y="88" width="12" height="4" />
        <rect x="102" y="92" width="16" height="4" />
      </g>
      <g className="gear-top">
        <g fill="#d4a02a">
          <rect x="22" y="34" width="8" height="14" />
          <rect x="42" y="30" width="8" height="18" />
          <rect x="56" y="24" width="8" height="24" />
          <rect x="70" y="30" width="8" height="18" />
          <rect x="90" y="34" width="8" height="14" />
        </g>
        <rect x="22" y="42" width="76" height="8" fill="#d4a02a" />
        <rect x="58" y="38" width="4" height="4" className="gear-jewel" fill="#f0c860" />
      </g>
    </>
  );
}
