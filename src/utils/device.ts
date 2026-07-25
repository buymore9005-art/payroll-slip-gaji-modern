export function getDeviceDescription(userAgent = navigator.userAgent): string {
  const mobile = /Android|iPhone|iPad|Mobile/i.test(userAgent) ? 'Mobile' : 'Desktop';
  const browser = /Edg\//.test(userAgent) ? 'Edge' : /Chrome\//.test(userAgent) ? 'Chrome' :
    /Firefox\//.test(userAgent) ? 'Firefox' : /Safari\//.test(userAgent) ? 'Safari' : 'Browser';
  return `${mobile} · ${browser}`;
}
