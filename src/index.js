export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === '/api/spotify/refresh') {
      if (request.method !== 'POST' || !env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
        return new Response('Not found', { status: 404 });
      }

      const form = await request.formData();
      const refreshToken = form.get('refresh_token');
      if (typeof refreshToken !== 'string' || !refreshToken) {
        return Response.json({ error: 'refresh_token is required' }, { status: 400 });
      }

      const spotifyResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken })
      });

      return new Response(spotifyResponse.body, {
        status: spotifyResponse.status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }
  }
};
