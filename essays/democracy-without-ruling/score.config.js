/* Democracy Without Ruling's soundtrack (Spotify playlist "Exhausted Democracy",
 * https://open.spotify.com/playlist/4k4LF8rwKcPruRamdvnxjo).
 *
 * loop: true  means the songs simply play in this order while the reader reads,
 * and start again from the first after the last. (No chapter-by-chapter switching.)
 * Track ids come from the song's Spotify link:
 *   https://open.spotify.com/track/6wnmRxEbwUK7WLyUtiRuT7  ->  "6wnmRxEbwUK7WLyUtiRuT7"
 */
window.SCORE = {
  playerName: 'Democracy Without Ruling',   // device name shown in the reader's Spotify app
  loop: true,
  tracks: [
    { id: '6wnmRxEbwUK7WLyUtiRuT7', name: 'Radiohead — Fitter Happier' },
    { id: '1ZBqJilDGBVYktvlCEo9jC', name: 'Interpol — Obstacle 1' },
    { id: '7hanhZrUArC9qUerln4jh1', name: 'The National — Fake Empire' },
    { id: '6MsEmkwmyhQZSVeDNhQ2aH', name: 'Interpol — This Mirror Weighs a Ton' },
    { id: '4Wgj6jzoI2gYlumXdYAB8U', name: 'Radiohead — The National Anthem' }
  ]
};
