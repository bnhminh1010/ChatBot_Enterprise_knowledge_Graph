const crypto = require('crypto');

const targetHash =
  '75aa74a1ced301f367afeecb1f3030f9371c7b68fd127696223ec17de186da13';
const candidates = [
  '123456',
  'admin',
  'password',
  '12345678',
  'APTX3107',
  'admin123',
  'Admin123',
  'Abc12345',
  'Abc@12345',
];
const salts = ['APTX3107', 'aptx3107', '', 'salt'];

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

console.log('Target:', targetHash);

for (const pass of candidates) {
  for (const salt of salts) {
    // Case 1: pass + salt
    if (sha256(pass + salt) === targetHash)
      console.log(`MATCH! pass="${pass}", salt="${salt}", format=pass+salt`);

    // Case 2: salt + pass
    if (sha256(salt + pass) === targetHash)
      console.log(`MATCH! pass="${pass}", salt="${salt}", format=salt+pass`);

    // Case 3: pass + salt + pass
    if (sha256(pass + salt + pass) === targetHash)
      console.log(
        `MATCH! pass="${pass}", salt="${salt}", format=pass+salt+pass`,
      );
  }
}
