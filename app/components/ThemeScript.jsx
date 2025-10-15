// components/ThemeScript.jsx
export default function ThemeScript() {
  // This runs before paint (inlined), avoids FOUC
  const code = `
  (function() {
    try {
      const ls = localStorage.getItem('theme'); // "light" | "dark" | "system" | null
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldDark = ls === 'dark' || (ls !== 'light' && systemPrefersDark);

      document.documentElement.classList.toggle('dark', shouldDark);

      // Keep iOS/Android chrome bars legible
      const meta = document.querySelector('meta[name="theme-color"]') || (function(){
        const m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); return m;
      })();
      meta.content = shouldDark ? '#0a0a0a' : '#ffffff';

      // If user chose "system", react to future system changes
      if (!ls || ls === 'system') {
        const mql = window.matchMedia('(prefers-color-scheme: dark)');
        const apply = (e) => {
          const dark = e ? e.matches : mql.matches;
          document.documentElement.classList.toggle('dark', dark);
          meta.content = dark ? '#0a0a0a' : '#ffffff';
        };
        mql.addEventListener('change', apply);
      }
    } catch (e) {}
  })();`;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: code }}
      suppressHydrationWarning
    />
  );
}
