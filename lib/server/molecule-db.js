const fs = require('fs');
const path = require('path');
const vm = require('vm');

let dbCache = null;

const SUBSCRIPT_MAP = {
  '₀': '0',
  '₁': '1',
  '₂': '2',
  '₃': '3',
  '₄': '4',
  '₅': '5',
  '₆': '6',
  '₇': '7',
  '₈': '8',
  '₉': '9',
};

function loadDatabase() {
  if (dbCache) return dbCache;

  const filePath = path.join(process.cwd(), 'molecules2.js');
  const source = fs.readFileSync(filePath, 'utf8');
  const sandbox = { window: {} };

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'molecules2.js' });

  dbCache = {
    smilesDb: sandbox.window.SMILES_DB || {},
    noteHints: sandbox.window.MOLECULE_NOTE_HINTS || {},
  };

  return dbCache;
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeFormula(value) {
  return cleanString(value).replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (char) => SUBSCRIPT_MAP[char] || char);
}

function getMoleculeInfo(nameOrSmiles) {
  const query = cleanString(nameOrSmiles);
  if (!query) return null;

  const { smilesDb } = loadDatabase();
  if (smilesDb[query]) {
    return { ...smilesDb[query], formula: normalizeFormula(smilesDb[query]?.formula), name: query };
  }

  const lower = query.toLowerCase();
  for (const [name, value] of Object.entries(smilesDb)) {
    if (name.toLowerCase() === lower) return { ...value, formula: normalizeFormula(value?.formula), name };
    if (value?.smiles === query) return { ...value, formula: normalizeFormula(value?.formula), name };
  }

  return null;
}

module.exports = {
  getMoleculeInfo,
  loadDatabase,
};
