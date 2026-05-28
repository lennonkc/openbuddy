// Toolsmith (GearAct3Harness)
// lead=#26408b, spot=#4a6eb8, deep=#1a2d5f

export function ToolsmithGear() {
  return (
    <>
      <g className="gear-floor" stroke="#26408b" strokeWidth="1.2" fill="none" opacity="0.7">
        <ellipse cx="60" cy="128" rx="42" ry="4" />
        <ellipse cx="60" cy="128" rx="29" ry="3" />
        <ellipse cx="60" cy="128" rx="16" ry="2" />
      </g>
      <g className="gear-left">
        <rect x="4" y="58" width="10" height="6" fill="#26408b" />
        <rect x="6" y="64" width="6" height="6" fill="#4a6eb8" />
        <rect x="8" y="70" width="2" height="26" fill="#1a2d5f" />
      </g>
      <g className="gear-right">
        <g className="gear-cog">
          <rect x="106" y="64" width="12" height="4" fill="#26408b" />
          <rect x="106" y="80" width="12" height="4" fill="#26408b" />
          <rect x="100" y="70" width="4" height="10" fill="#26408b" />
          <rect x="116" y="70" width="4" height="10" fill="#26408b" />
          <rect x="104" y="68" width="16" height="14" fill="#4a6eb8" />
          <rect x="108" y="72" width="8" height="6" fill="transparent" />
        </g>
      </g>
      <g className="gear-top">
        <rect x="48" y="22" width="24" height="6" fill="#26408b" />
        <rect x="38" y="22" width="3" height="8" fill="#1a2d5f" />
        <rect x="79" y="22" width="3" height="8" fill="#1a2d5f" />
        <rect x="30" y="28" width="60" height="22" fill="#26408b" />
        <rect x="58" y="30" width="4" height="20" fill="#4a6eb8" />
      </g>
    </>
  );
}
