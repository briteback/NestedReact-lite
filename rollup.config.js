import babel from 'rollup-plugin-babel';

export default {
  entry: 'src/main.js',
  format: 'es',
  dest: 'nestedreact.js', // equivalent to --output
  plugins: [
    babel()
  ]
};
