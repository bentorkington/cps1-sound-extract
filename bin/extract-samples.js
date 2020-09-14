#!/usr/bin/env node

const fs = require('fs');
const program = require('commander');

const FIRST_OKI_SAMPLE = 1; // sample 0 is always empty
const MAX_OKI_SAMPLE = 127;
const OKI_ADDRESS_LEN = 3;
const OKI_ENTRY_SIZE = 8;

program.version('0.0.1')
  .arguments('<game>')
  .action((game, options) => {
    const gameLayout = require(`../games/${game}.json`);
    const sample0 = fs.readFileSync(gameLayout.sampleRoms[0]);
    const sample1 = fs.readFileSync(gameLayout.sampleRoms[1]);
    const sampleRoms = Buffer.concat([sample0, sample1]);
    
    for (var i = FIRST_OKI_SAMPLE; i <= MAX_OKI_SAMPLE; i++) {
        const offset = (i * OKI_ENTRY_SIZE);
        const start = sampleRoms.readUIntBE(offset + 0, OKI_ADDRESS_LEN);
        const end = sampleRoms.readUIntBE(offset + OKI_ADDRESS_LEN, OKI_ADDRESS_LEN);
        length = end - start;
        if (length > 0) {
            console.log(`sample ${i} start 0x${start.toString(16)} end 0x${end.toString(16)}`);
            fs.writeFileSync(`sample_${i}.vox`, sampleRoms.slice(start, end));
        }
    }
  });

program.parse(process.argv);
