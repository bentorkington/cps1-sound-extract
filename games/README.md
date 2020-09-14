# Structure of a game info file

```js
{
    "songs": "0x1106", // the start of the melody table
    "instruments": "0x121e",  // the start of the instruments table
    "samples": "0x221e", // the start of the samples table
    "audioRom": "sf2_09.bin", // name of the audio code ROM (which includes melodies)
    "sampleRoms": ["sf2_18.bin", "sf2_19.bin"] // name of the sample ROM files
    "instrumentMapping": {
      "41": 33,   // Map the instrument #41 (game ROM) to MIDI instrument #33
    }
}
```
