/* The Carriage and the Platform's soundtrack (Spotify playlist "Carriage and the Platform",
 * https://open.spotify.com/playlist/3QnofKcptpqCeJz4X5zUGm).
 *
 * loop: true  means the songs simply play in this order while the reader reads,
 * and start again from the first after the last. (No chapter-by-chapter switching.)
 * Track ids come from the song's Spotify link:
 *   https://open.spotify.com/track/5xcunlfaZvD9BDQsLONI7A  ->  "5xcunlfaZvD9BDQsLONI7A"
 */
window.SCORE = {
  playerName: 'The Carriage and the Platform',   // device name shown in the reader's Spotify app
  loop: true,
  tracks: [
    { id: '5xcunlfaZvD9BDQsLONI7A', name: 'Orbital — HALCYON + ON + ON' },
    { id: '7JqUzCEIijure99GZ6w2bk', name: 'Sideluv — No Feelings' }
  ]
};
