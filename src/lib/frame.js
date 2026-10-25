// Design frame is 430px wide. `u(n)` converts a Figma px value to a length that
// scales with the page column (--u is set on the App wrapper).
export const FRAME_W = 430;
export const u = (n) => `calc(var(--u) * ${n})`;
