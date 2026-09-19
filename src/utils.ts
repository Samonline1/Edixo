export function extractVideoData(url: string): { id: string | null, startTime?: number } {
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  let id = null;

  if (match && match[2].length === 11) {
    id = match[2];
  }
  
  let startTime: number | undefined;
  
  // Parse t= parameter (can be t=909 or t=1h2m3s)
  try {
    // Basic regex for t=123 or t=123s
    const tMatch = url.match(/[?&]t=(\d+)s?/);
    if (tMatch) {
      startTime = parseInt(tMatch[1], 10);
    } else {
      // Parse format like t=1h2m3s
      const hMatch = url.match(/[?&]t=.*(?:^|[^0-9])(\d+)h/);
      const mMatch = url.match(/[?&]t=.*(?:^|[^0-9])(\d+)m/);
      const sMatch = url.match(/[?&]t=.*(?:^|[^0-9])(\d+)s/);
      
      if (hMatch || mMatch || sMatch) {
        let total = 0;
        if (hMatch) total += parseInt(hMatch[1], 10) * 3600;
        if (mMatch) total += parseInt(mMatch[1], 10) * 60;
        if (sMatch) total += parseInt(sMatch[1], 10);
        if (total > 0) startTime = total;
      }
    }
  } catch (e) {
    console.error("Could not parse time", e);
  }

  return { id, startTime };
}
