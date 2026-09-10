// CSS Modules — o bundler (Vite/Storybook) transforma em runtime; isto só
// existe para o `tsc --noEmit` entender o import sem reclamar.
declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}
