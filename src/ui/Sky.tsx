/** The night behind every screen: faint threads drifting towards the goal and a warm ember breathing low. */
export function Sky() {
  return (
    <div class="sky" aria-hidden="true">
      <div class="sky__ember" />
      <svg class="sky__threads sky__threads--a" viewBox="0 0 390 844" preserveAspectRatio="xMidYMax slice">
        <path d="M-20 120 C 120 140, 260 420, 410 560" />
        <path d="M-20 300 C 140 300, 250 520, 410 640" />
        <path d="M60 -20 C 100 200, 220 460, 410 600" />
        <path d="M200 -20 C 200 240, 300 480, 410 620" />
      </svg>
      <svg class="sky__threads sky__threads--b" viewBox="0 0 390 844" preserveAspectRatio="xMidYMax slice">
        <path d="M-20 520 C 120 500, 260 620, 410 700" />
        <path d="M-20 700 C 150 690, 280 720, 410 740" />
        <path d="M-20 820 C 160 790, 300 770, 410 760" />
      </svg>
    </div>
  );
}
