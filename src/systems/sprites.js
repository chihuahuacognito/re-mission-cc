// Logical sprite names -> texture keys. Hunt-level code references these
// names only, so real PNG art can replace the procedural textures later by
// loading images under the same keys in BootScene — zero scene-code changes.
export const SPRITES = {
  cancer: 'cancer',
  cancerCracked: 'cancerCracked',
  healthy: 'healthyCell',
  rbc: 'rbc',
  bokeh: 'bokeh',
};
