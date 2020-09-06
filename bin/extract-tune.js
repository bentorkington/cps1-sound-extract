#!/usr/bin/env node

const MidiWriter = require('midi-writer-js');
const fs = require('fs');
const chalk = require('chalk');
const program = require('commander');

let tracks = [];
const takeJumps = false;

const notes = "C C# D D# E F F# G G# A A# B".split(' ');
const durations = "16 16 8 4 2 1 0.5 0.25".split(' ');

async function convertSong(layout, songid) {
  try {
    const tuneRom = fs.readFileSync(layout.audioRom);
    console.log("file opened");
    const trackAddr = tuneRom.readUInt16BE(parseInt(layout.songs, 16) + (2 * songid));
    console.log("Address: 0x" + trackAddr.toString(16));

    const type = tuneRom.readInt8(trackAddr);
    console.log("Type: " + type);
    for (let i=0; i<12; i++) {
      tracks.push(tuneRom.readUInt16BE(trackAddr + (i * 2) + 1));  
    }
    console.log(tracks.map((x) => `0x${x.toString(16)}`));

    const midiTracks = [];

    if (program.track) {
      if (program.track < 8) {
        console.log(chalk.yellow(`##########  TRACK ${program.track}`));
        midiTracks[program.track] = await convertTrack(tuneRom, tracks[program.track]);
      } else {
        // todo Oki
      }
    } else {
      for (var i = 0; i<8; ++i) {
        console.log(chalk.yellow(`##########  TRACK ${i}`));
        midiTracks[i] = await convertTrack(tuneRom, tracks[i]);
      }
      // todo: convert four sample tracks  
    }

    if (program.saveMidi) {
      const filename = program.saveMidi === true ? `track-${songid}.mid` : program.saveMidi;
  
      fs.writeFile(filename, new MidiWriter.Writer(midiTracks).buildFile(), (err) => {
        if (err) throw err;
        console.log(`saved MIDI to ${filename}`);
      });
    }

  } catch (err) { 
    console.log(`There was an error: ${err}`);
  }
}

async function convertTrack(tuneRom, base) {
  const midiTrack = new MidiWriter.Track();

  try {
    let posn = base;
    let run = true;
    let elapsed = 1;
    let restTime = [];
    let noteOffset = 40;
    let increaseByHalf = false;
    let repeats = [1, 1, 1, 1];
    const [timeUpper, timeLower] = program.timeSignature.split('/').map((x) => parseInt(x, 10));
    midiTrack.setTimeSignature(timeUpper, timeLower);

    let instaddr = 0;

    let bar = 1;
    let beat = 1;

    const debug = (str) => {
      if (program.dump) console.log(`${instaddr.toString(16)} ${str} @ ${chalk.yellow(`${bar}.${beat}`)}`);
    }

    const debugYamaInst = (inst, str) => {
      debug(`${chalk.green(`YAM_${inst.toString(16).padStart(2, '0')}`)} ${str || ''}`);
    }

    while (run) {
      instaddr = posn;
      const instruction = tuneRom.readUInt8(posn);
      posn++;

      if (instruction >= 0x20) {
        const duration = durations[((instruction & 0xe0) >> 5) - 1];
        const note = (instruction & 0x1f) + noteOffset;
        const octave = Math.trunc(note / 12) - 2;

        if ((instruction & 0x1f) == 0) {
          restTime.push(duration);
          debug(`⌘     ${duration}`);
        } else {
          const noteString = `${notes[note % 12]}${octave}`
          debug(`♩ ${chalk.red(noteString.padEnd(3, ' '))} ${duration}` );
          var noteEvent = new MidiWriter.NoteEvent({
            pitch: note,
            duration: duration,
            wait: restTime,
          });
          midiTrack.addEvent(noteEvent);
          restTime = [];
        }
        elapsed += 1 / duration;
        beat += 1 / (duration / timeLower);
        while (beat > timeUpper) {
          bar += 1;
          beat -= timeUpper;
          debug(chalk.yellow('---------------------'));
        }
      } else {
        //console.log(`Instruction ${instruction.toString(16)} @ ${elapsed}`);
        // midiTrack.addMarker(`Instruction ${instruction.toString(16)}`);
        switch (instruction) {
          case 0x00:
            debugYamaInst(instruction);
            // flip 0x2, bit 0x20
            break;
          case 0x01:
            debugYamaInst(instruction);
            // flip 0x2, bit 0x40
            break;
          case 0x02:
            debugYamaInst(instruction);
            increaseByHalf  = true;
            break;
          case 0x03:
            debugYamaInst(instruction);
            break;
          case 0x04:
            debugYamaInst(instruction, tuneRom.readUInt8(posn));
            posn += 1;
            break;
          case 0x05:  // GOTO?
            debugYamaInst(instruction, tuneRom.readUInt16BE(posn));
            posn += 2;
            break;
          case 0x06:
            debugYamaInst(instruction, tuneRom.readUInt8(posn));
            posn += 1;
            break;
          case 0x07:
            noteOffset = 192 - tuneRom.readUInt8(posn);  
            posn += 1;
            debugYamaInst(instruction, `note offset is ${noteOffset}`);
            break;
          case 0x08:
            var instrument = tuneRom.readUInt8(posn);
            posn += 1;
            debugYamaInst(instruction, `Instrument is ${instrument}`);
            midiTrack.addEvent(new MidiWriter.ProgramChangeEvent({instrument: 1})); // todo
            break;
          case 0x09:
            debugYamaInst(instruction, tuneRom.readUInt8(posn));
            posn += 1;
            break;

          case 0x0a:
            debugYamaInst(instruction, tuneRom.readUInt8(posn));
            posn += 1;
            break;
          case 0x0b:
            debugYamaInst(instruction, tuneRom.readUInt8(posn)); // guessed
            posn += 1;
            break;
          case 0x0c:
            debugYamaInst(instruction, tuneRom.readUInt8(posn)); // guessed
            posn += 1;
            break;

          case 0x0d:
            debugYamaInst(instruction, tuneRom.readUInt8(posn));
            var oki_d = tuneRom.readUInt8(posn);
            posn += 1;
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
            

            var p = tuneRom.readUInt8(posn);
            posn += 1;
            var addr = tuneRom.readUInt16BE(posn);
            posn += 2;
            debug(`${chalk.green("YAM_JUMP")} ${instruction.toString(16)} ${p} jump ${addr.toString(16)} reg ${repeats[repRegIndex]}`);

            if (instruction > 0x11) {
              if (repeats[repRegIndex] == 1) {
                repeats[repRegIndex] -= 1
                // do YAMA_CMD_04 for p
                if (takeJumps)
                  posn = addr;
              } 
            } else {
              if (repeats[repRegIndex]) {
                repeats[repRegIndex] -= 1;
                if (repeats[repRegIndex]) {
                  if (takeJumps)
                  posn = addr;
                }
              } else {
                repeats[repRegIndex] = p;
                if (takeJumps)
                  posn = addr;
              }
            }

            break;

          case 0x16:
            const loop = tuneRom.readUInt16BE(posn);
            posn += 2;
            debug(`Loop back to 0x${loop.toString(16)}`);
            break;

          case 0x17:
            run = false;
            debug("End of track");
            break;

          case 0x18:
            debugYamaInst(instruction, tuneRom.readUInt8(posn)); // saves the byte in struct_d200.0x14
            posn += 1;
            break;

          case 0x19:
            debugYamaInst(instruction, tuneRom.readUInt8(posn)); // saves the byte in struct_d200.0x14
            posn += 1;
            break;

          case 0x1a:
            debugYamaInst(instruction, tuneRom.readUInt8(posn)); // guessed
            posn += 1;
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
    console.log(err.stack)
  }
}

program.version('0.0.1')
  .arguments('<game> <song>')
  .option('-m, --save-midi [filename]', 'save MIDI output to `filename` (defaults to track-`number`.mid)')
  .option('-d, --dump', 'dump instructions', false)
  .option('-t, --track <track>', 'process only <track>')
  .option('-s, --time-signature <signature>', 'set the time signature (default 4/4)', '4/4')
  .action((game, songString, options) => {
    const layout = require(`../games/${game}.json`);
    const song = parseInt(songString);

    convertSong(layout, song);
  });

program.parse(process.argv);



