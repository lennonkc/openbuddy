// Navigator (GearAct3)
// lead=#26408b, spot=#4a6eb8, deep=#1a2d5f

export function NavigatorGear() {
  return (
    <>
      <g className="gear-floor" stroke="#26408b" strokeWidth="1.2" fill="none" opacity="0.7">
        <ellipse cx="60" cy="128" rx="42" ry="4" />
        <ellipse cx="60" cy="128" rx="29" ry="3" />
        <ellipse cx="60" cy="128" rx="16" ry="2" />
      </g>
      <g className="gear-left">
        <rect x="2" y="62" width="16" height="32" fill="#4a6eb8" />
        <rect x="0" y="62" width="2" height="6" fill="#26408b" />
        <rect x="0" y="88" width="2" height="6" fill="#26408b" />
        <rect x="18" y="62" width="2" height="6" fill="#26408b" />
        <rect x="18" y="88" width="2" height="6" fill="#26408b" />
        <rect x="5" y="70" width="10" height="2" fill="#26408b" />
        <rect x="5" y="76" width="10" height="2" fill="#26408b" />
        <rect x="5" y="82" width="10" height="2" fill="#26408b" />
      </g>
      <g className="gear-right">
        <rect x="100" y="68" width="18" height="18" fill="#4a6eb8" />
        <g className="gear-needle">
          <rect x="108" y="70" width="2" height="14" fill="#26408b" />
          <rect x="102" y="76" width="14" height="2" fill="#26408b" />
          <rect x="108" y="64" width="2" height="4" fill="#26408b" />
        </g>
      </g>
      <g className="gear-top">
        <rect x="14" y="40" width="92" height="10" fill="#26408b" />
        <rect x="34" y="26" width="52" height="14" fill="#26408b" />
        <rect x="92" y="30" width="4" height="18" fill="#26408b" />
        <rect x="88" y="44" width="8" height="5" fill="#26408b" />
      </g>
    </>
  );
}
