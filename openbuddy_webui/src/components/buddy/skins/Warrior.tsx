// Warrior (GearAct4)
// lead=#a8341f, spot=#d45a44, deep=#6e2214

export function WarriorGear() {
  return (
    <>
      <g className="gear-floor" fill="#a8341f">
        <rect x="18" y="128" width="14" height="3" />
        <rect x="28" y="125" width="3" height="3" />
        <rect x="28" y="131" width="3" height="3" />
        <rect x="44" y="128" width="14" height="3" />
        <rect x="54" y="125" width="3" height="3" />
        <rect x="54" y="131" width="3" height="3" />
        <rect x="70" y="128" width="14" height="3" />
        <rect x="80" y="125" width="3" height="3" />
        <rect x="80" y="131" width="3" height="3" />
        <rect x="96" y="128" width="10" height="3" />
      </g>
      <g className="gear-left" fill="#d45a44">
        <rect x="9" y="60" width="3" height="32" />
        <rect x="4" y="84" width="13" height="3" />
        <rect x="8" y="90" width="5" height="6" fill="#6e2214" />
      </g>
      <g className="gear-right">
        <rect x="106" y="80" width="4" height="16" fill="#6e2214" />
        <rect x="102" y="76" width="12" height="4" fill="#6e2214" />
        <g className="gear-flame">
          <rect x="104" y="64" width="10" height="6" fill="#d45a44" />
          <rect x="102" y="68" width="14" height="8" fill="#d45a44" />
          <rect x="106" y="58" width="6" height="6" fill="#d45a44" />
        </g>
      </g>
      <g className="gear-top">
        <rect x="30" y="42" width="60" height="8" fill="#a8341f" />
        <rect x="22" y="36" width="76" height="6" fill="#a8341f" />
        <rect x="28" y="26" width="64" height="10" fill="#a8341f" />
        <rect x="34" y="18" width="52" height="8" fill="#a8341f" />
        <rect x="55" y="26" width="10" height="24" fill="#d45a44" />
      </g>
    </>
  );
}
