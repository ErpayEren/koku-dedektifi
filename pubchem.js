const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            'User-Agent': 'KokuDedektifi/1.0',
            Accept: 'application/json',
          },
        },
        (response) => {
          if (response.statusCode && response.statusCode >= 400) {
            reject(new Error(`PubChem HTTP ${response.statusCode}`));
            return;
          }
          let raw = '';
          response.setEncoding('utf8');
          response.on('data', (chunk) => {
            raw += chunk;
          });
          response.on('end', () => {
            try {
              resolve(JSON.parse(raw));
            } catch (error) {
              reject(error);
            }
          });
        },
      )
      .on('error', reject);
  });
}

async function getMoleculeFromPubChem(name) {
  if (!name || !String(name).trim()) {
    throw new Error('Molecule name is required.');
  }

  const encoded = encodeURIComponent(String(name).trim());
  const cidPayload = await fetchJson(
    `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encoded}/cids/JSON`,
  );
  const cid = cidPayload?.IdentifierList?.CID?.[0] || null;

  if (!cid) {
    return {
      cid: null,
      smiles: null,
      iupac: null,
    };
  }

  const propertiesPayload = await fetchJson(
    `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/IsomericSMILES,CanonicalSMILES,SMILES,ConnectivitySMILES,IUPACName/JSON`,
  );
  const properties = propertiesPayload?.PropertyTable?.Properties?.[0] || {};

  return {
    cid,
    smiles:
      properties.IsomericSMILES ||
      properties.CanonicalSMILES ||
      properties.SMILES ||
      properties.ConnectivitySMILES ||
      null,
    iupac: properties.IUPACName || null,
  };
}

module.exports = {
  getMoleculeFromPubChem,
};

if (require.main === module) {
  const name = process.argv.slice(2).join(' ').trim();
  if (!name) {
    console.error('Usage: node pubchem.js "Ambroxide"');
    process.exit(1);
  }

  getMoleculeFromPubChem(name)
    .then((payload) => {
      console.log(JSON.stringify(payload, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
