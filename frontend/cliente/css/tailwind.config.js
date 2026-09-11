/* Extraída, palavra por palavra, das configurações em linha que a
   mesa.html e a takeaway.html tinham. As duas eram idênticas, por isso
   um ficheiro serve as duas. */
module.exports = {
  content: [
    '../mesa.html',
    '../takeaway.html',
    '../js/ementa-comum.js',
  ],
  theme: {
    extend: {
      colors: {
        carvao:  '#121212',
        carvao2: '#1a1a1a',
        carvao3: '#242424',
        copper:  '#c9832f',
        copperdark: '#8a5a1f',
        gold:    '#e8b34f',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px -8px rgba(0,0,0,0.55)',
        liftup: '0 -8px 24px -6px rgba(0,0,0,0.55)',
      },
    },
  },
};
