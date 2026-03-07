declare module 'canvas-confetti' {
  type ConfettiOptions = Record<string, unknown>;
  type ConfettiFn = (options?: ConfettiOptions) => void;

  const confetti: ConfettiFn;
  export default confetti;
}
