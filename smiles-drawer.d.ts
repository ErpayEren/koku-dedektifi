declare module 'smiles-drawer' {
  export interface SmilesTree {
    branches?: unknown[];
  }

  export interface DrawOptions {
    width?: number;
    height?: number;
    bondThickness?: number;
    bondLength?: number;
    shortBondLength?: number;
    padding?: number;
    compactDrawing?: boolean;
    explicitHydrogens?: boolean;
    terminalCarbons?: boolean;
  }

  export class SvgDrawer {
    constructor(options?: DrawOptions);
    draw(tree: SmilesTree, target: SVGSVGElement, themeName?: string, infoOnly?: boolean): void;
  }

  export function parse(
    smiles: string,
    successCallback: (tree: SmilesTree) => void,
    errorCallback?: (error: Error) => void,
  ): void;

  const SmilesDrawer: {
    parse: typeof parse;
    SvgDrawer: typeof SvgDrawer;
  };

  export default SmilesDrawer;
}
