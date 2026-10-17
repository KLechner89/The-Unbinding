/* The Unbinding's soundtrack. These songs belong to this story only.
 *
 * Each song plays when the reader reaches the element marked data-music="N"
 * in index.html, where N is the song's position in this list (first song = 0).
 * Track ids come from the song's Spotify link:
 *   https://open.spotify.com/track/55q3Ro66yXWi9rsEddeEN4  ->  "55q3Ro66yXWi9rsEddeEN4"
 */
window.SCORE = {
  playerName: 'The Unbinding',   // device name shown in the reader's Spotify app
  tracks: [
    { id: '55q3Ro66yXWi9rsEddeEN4', name: 'Radiohead — Pyramid Song' },                        // Chapter I
    { id: '7pM9cLbrgRGX1hHElTX92m', name: 'Lorn — Acid Rain' },                                // Chapter II
    { id: '0ypg59NyOVCpWVzd0SUsT5', name: 'Nine Inch Nails — Every Day Is Exactly the Same' }, // Chapter III
    { id: '0q6LuUqGLUiCPP1cbdwFs3', name: 'Gorillaz — On Melancholy Hill' },                   // Chapter IV
    { id: '3Z0qLOS0cqWKPHXkbTXmNF', name: 'Cults — Gilded Lily' },                             // Chapter V
    { id: '6dBUzqjtbnIa1TwYbyw5CM', name: 'TV Girl — Lovers Rock' },                           // Chapter VI
    { id: '0uMZbmAAgOhdMrv25iPEH6', name: 'Goth — Skeletons and Sidewalks' },                  // Chapter VII
    { id: '7H0ya83CMmgFcOhw0UB6ow', name: 'Beach House — Space Song' },                        // Chapter VIII
    { id: '1caFMoQlQyF5JHvfPNe49E', name: 'Cults — Bad Things' },                              // Chapter IX
    { id: '0ByKWq0hsuYriK5avSMJ5r', name: 'José González — Crosses' },                         // Chapter X
    { id: '3DkHNCA4QRBQgTzF2T18hm', name: 'Weezer — Only in Dreams' }                          // Chapter XI
  ]
};
