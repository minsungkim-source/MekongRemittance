/** Tailwind handles layout and spacing utilities. The drafting-paper palette,
 *  the type roles and the component styles stay in globals.css: they were
 *  designed and contrast-checked as a set, and utility classes would only
 *  scatter them. The tokens are surfaced here so utilities can reach them. */
export default {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './lib/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)', 'paper-2': 'var(--paper-2)', sheet: 'var(--surface)',
        ink: 'var(--ink)', 'ink-2': 'var(--ink-2)', 'ink-3': 'var(--ink-3)',
        blueprint: 'var(--petrol)', ember: 'var(--ember)',
        rule: 'var(--rule)', 'rule-2': 'var(--rule-2)',
      },
      fontFamily: {
        mono: 'var(--mono)', sans: 'var(--sans)',
        cond: 'var(--cond)', hand: 'var(--hand)',
      },
    },
  },
  plugins: [],
};
