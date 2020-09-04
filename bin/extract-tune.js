#!/usr/bin/env node

const BinaryFile = require('binary-file');
const MidiWriter = require('midi-writer-js');
const fs = require('fs');
const chalk = require('chalk');

const layout = require('../games/sf2ua.json');

const audioRom = new BinaryFile('./sf2_09.bin', 'r');

let tracks = [];
const takeJumps = false;

const notes = "C C# D D# E F F# G G# A A# B".split(' ');
const durations = "64 64 32 16 8 4 2 1".split(' ');

async function convertSong(file, songid) {
  try {
    await file.open();
    console.log("file opened");
    const posn = await file.seek(0x1106 + (2 * songid));
    console.log("Position: 0x" + posn.toString(16));
    const res = await file.readUInt16();
    console.log("Address: 0x" + res.toString(16));
    await file.seek(res);
    const type = await file.readUInt8();
    console.log("Type: " + type);
    for (let i=0; i<12; i++) {
      tracks.push(await file.readUInt16());  
    }
    console.log(tracks);

    // const midiTracks = tracks.map((t) => {
    //   return await convertTrack(file, t);
    // });
    const midiTracks = [];

    for (var i = 0; i<8; ++i) {
      console.log(chalk.yellow(`##########  TRACK ${i}`));
      midiTracks[i] = await convertTrack(file, tracks[i]);
    }

    var writer = new MidiWriter.Writer(midiTracks);
    var fileBytes = writer.buildFile();

    fs.writeFile('out.mid', fileBytes, (err) => {
      if (err) throw err;
      console.log("It's saved!");
    });
  } catch (err) { 
    console.log(`There was an error: ${err}`);
  }
}

async function convertTrack(file, base) {
  const midiTrack = new MidiWriter.Track();

  try {
    await file.seek(base);
    let run = true;
    let elapsed = 1;
    let restTime = [];
    let noteOffset = 40;
    let increaseByHalf = false;
    let repeats = [1, 1, 1, 1]

    let instaddr = 0;

    const debug = (str) => {
      console.log(`${instaddr.toString(16)} ${str} @ ${elapsed}`);
    }

    while (run) {
      instaddr = await file.tell();
      const instruction = await file.readUInt8();
      if (instruction >= 0x20) {
        const duration = ((instruction & 0xe0) >> 5) - 1;
        const note = (instruction & 0x1f) + noteOffset;
        const octave = Math.trunc(note / 12) - 2;

        if ((instruction & 0x1f) == 0) {
          restTime.push(durations[duration]);
          debug(`⌘ ${durations[duration]}`);
        } else {
          debug(`♩ ${notes[note % 12]}${octave} ${durations[duration]} ` );
          var noteEvent = new MidiWriter.NoteEvent({
            pitch: note,
            duration: durations[duration],
            wait: restTime,
          });
          midiTrack.addEvent(noteEvent);
          restTime = [];
        }
        elapsed += 1 / durations[duration];
      } else {
        //console.log(`Instruction ${instruction.toString(16)} @ ${elapsed}`);
        // midiTrack.addMarker(`Instruction ${instruction.toString(16)}`);
        switch (instruction) {
          case 0x00:
            debug(`OKI_00`);
            // flip 0x2, bit 0x20
            break;
          case 0x01:
            debug(`OKI_01`);
            // flip 0x2, bit 0x40
            break;
          case 0x02:
            debug(`OKI_02`);
            increaseByHalf  = true;
            break;
          case 0x03:
            debug(`OKI_03`);
            break;
          case 0x04:
            debug(`OKI_04 ${await file.readUInt8()}`);
            break;
          case 0x05:  // GOTO?
            debug(`OKI_05 ${await file.readUInt16()}`);
            break;
          case 0x06:
            debug(`OKI_06 ${await file.readUInt8()}`);
            break;
          case 0x07:
            noteOffset = 192 - await file.readUInt8();  
            //debug(`OKI_07 note offset is ${noteOffset}`);
            
            break;
          case 0x08:
            var instrument = await file.readUInt8();
            console.log(`Instrument is ${instrument}`);
            midiTrack.addEvent(new MidiWriter.ProgramChangeEvent({instrument: 1}));
            break;
          case 0x09:
            debug(`OKI_09 ${await file.readUInt8()}`);
            break;

          case 0x0a:
            debug(`OKI_${instruction.toString(16)} ${await file.readUInt8()}`);
            break;
          case 0x0b:
            debug(`OKI_${instruction.toString(16)} ${await file.readUInt8()}`); // guessed
            break;
          case 0x0c: 
            debug(`OKI_${instruction.toString(16)} ${await file.readUInt8()}`); // guessed
            break;

    
          case 0x0d:
            var oki_d = await file.readUInt8();
            debug(`OKI_0D 0x${oki_d.toString(16)}`);
            break;

            // these are identical
          case 0x0e:
          case 0x12: 
          case 0x0f:
          case 0x13:
          case 0x10:
          case 0x14:
          case 0x11:
          case 0x15:
            var repRegIndex = (instruction - 0xe) % 4;
            

            var p = await file.readUInt8();
            var addr = await file.readUInt16();
            debug(`${chalk.green("OKI_JUMP")} ${instruction.toString(16)} ${p} jump ${addr.toString(16)} reg ${repeats[repRegIndex]}`);

            if (instruction > 0x11) {
              if (repeats[repRegIndex] == 1) {
                repeats[repRegIndex] -= 1
                // do YAMA_CMD_04 for p
                if (takeJumps)
                  await file.seek(addr);
              } 
            } else {
              if (repeats[repRegIndex]) {
                repeats[repRegIndex] -= 1;
                if (repeats[repRegIndex]) {
                  if (takeJumps)
                  await file.seek(addr);
                }
              } else {
                repeats[repRegIndex] = p;
                if (takeJumps)
                  await file.seek(addr);    
              }
            }

            break;

          case 0x16:
            const loop = await file.readUInt16();
            console.log(`Loop back to 0x${loop.toString(16)}`);
            break;

          case 0x17:
            run = false;
            console.log("End of track");
            break;

          case 0x18:
            await file.readUInt8(); // just skips a byte
            break;

          case 0x19:
            debug(`OKI_${instruction.toString(16)} ${await file.readUInt8()}`); // saves the byte in struct_d200.0x14
            break;


          case 0x1a:
            debug(`OKI_${instruction.toString(16)} ${await file.readUInt8()}`); // guessed
            break;

          default:
            console.log("Unknown instruction 0x" + instruction.toString(16));
            break;
        }
      }

    }
    return midiTrack;
  } catch(err) {
    console.log(`There was an error: ${err}`);
  }
}

convertSong(audioRom, 0xb );



