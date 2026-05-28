// SVG rotation origins (from MotionBuddy.tsx GSAP svgOrigin values)
export const ORIGINS = {
  ra: [116, 42],
  la: [30, 55],
  rl: [90, 96],
  ll: [42, 98],
  hd: [70, 12],
  w: [65, 65],
};

// Each frame: { ra, la, rl, ll, bodyTy, bodyTx, bodyRot, eyeScaleY, grayscale }
// Angles in degrees, translations in SVG units
export const STATES = {
  idle: {
    duration: 1500,
    frames: [
      { ra: 0, la: 0, rl: 0, ll: 0, bodyTy: 0, eyeScaleY: 1 },
      { ra: 2, la: -2, rl: 3, ll: -2, bodyTy: -1, eyeScaleY: 1 },
      { ra: 4, la: -4, rl: 5, ll: -4, bodyTy: -2, eyeScaleY: 1 },
      { ra: 6, la: -6, rl: 8, ll: -5, bodyTy: -2.5, eyeScaleY: 0.08 },
      { ra: 4, la: -4, rl: 5, ll: -4, bodyTy: -1.5, eyeScaleY: 1 },
      { ra: 1, la: -1, rl: 2, ll: -1, bodyTy: -0.5, eyeScaleY: 1 },
    ],
  },
  listening: {
    duration: 1200,
    frames: [
      { ra: 0, la: 0, rl: 0, ll: 0, bodyTy: 0, eyeScaleY: 1 },
      { ra: -8, la: 5, rl: -2, ll: 3, bodyTy: -4, eyeScaleY: 1 },
      { ra: -15, la: 10, rl: -4, ll: 5, bodyTy: -8, eyeScaleY: 1 },
      { ra: -20, la: 12, rl: -5, ll: 3, bodyTy: -5, eyeScaleY: 1 },
      { ra: -12, la: 8, rl: -3, ll: 2, bodyTy: -2, eyeScaleY: 1 },
      { ra: -5, la: 3, rl: -1, ll: 1, bodyTy: -1, eyeScaleY: 1 },
    ],
  },
  thinking: {
    duration: 1600,
    frames: [
      { ra: -5, la: 2, rl: 0, ll: 0, bodyTy: 0, bodyRot: 1, eyeScaleY: 1 },
      { ra: -12, la: 4, rl: 0, ll: 0, bodyTy: 0, bodyRot: 2, eyeScaleY: 1 },
      { ra: -18, la: 5, rl: 0, ll: 0, bodyTy: 0, bodyRot: 3, eyeScaleY: 1 },
      { ra: -15, la: 3, rl: 0, ll: 0, bodyTy: 0, bodyRot: 2, eyeScaleY: 1 },
    ],
  },
  speaking: {
    duration: 1200,
    frames: [
      { ra: 0, la: 0, rl: 0, ll: 0, bodyTy: 0, eyeScaleY: 1 },
      { ra: -10, la: 3, rl: 0, ll: 0, hdTy: 0.5, bodyTy: -1.5, bodyRot: -1, eyeScaleY: 1 },
      { ra: -22, la: 6, rl: 0, ll: 0, hdTy: 1, bodyTy: -3, bodyRot: -2, eyeScaleY: 1 },
      { ra: -15, la: 4, rl: 0, ll: 0, hdTy: 1.5, bodyTy: -1.5, bodyRot: -1, eyeScaleY: 1 },
      { ra: -25, la: 5, rl: 0, ll: 0, hdTy: 1, bodyTy: -2, bodyRot: -1.5, eyeScaleY: 1 },
      { ra: -8, la: 3, rl: 0, ll: 0, hdTy: 0.5, bodyTy: -1, bodyRot: -0.5, eyeScaleY: 1 },
    ],
  },
  error: {
    duration: 800,
    frames: [
      { ra: 5, la: -4, rl: 2, ll: -1, bodyTx: 0, bodyTy: 0, eyeScaleY: 0.08 },
      { ra: 8, la: -6, rl: 3, ll: -2, bodyTx: 3, bodyTy: 0, eyeScaleY: 0.08 },
      { ra: 12, la: -10, rl: 4, ll: -3, bodyTx: -3, bodyTy: 0, eyeScaleY: 0.08 },
      { ra: 6, la: -5, rl: 2, ll: -1, bodyTx: 1, bodyTy: 0, eyeScaleY: 0.08 },
    ],
  },
  disconnected: {
    duration: 0,
    frames: [
      { ra: 0, la: 0, rl: 0, ll: 0, bodyTy: 0, eyeScaleY: 1, grayscale: true },
    ],
  },
};
