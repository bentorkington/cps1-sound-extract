# CPS1-sound-extract

Tools for extracting MIDI files and samples from CPS1 based arcade games

## CPS1 sound

The sound section of a CPS1 game is made up of

* Yamaha YM1217 OPL3 FM Synthesizer for melodies
* Oki MSM6295 for game samples and percussion instruments
* A Z80 CPU to drive these chips.

The game CPU (m68k) sends 2-byte commands to the sound CPU. The first byte determines whether the commanded sound (or silence) will fade in/out. Some of these commands start songs such as stage music, others will play samples during gameplay.

## Oki MSM6295

The MSM6295 can play four channels of samples simultaneously. During a game, some channels are reserved for percussion instruments for the stage tune, other channels are kept free for game sound effects.

### Sample ROM layout

The MSM6295 can map up to 256kiB of sample data.

| Start  | End  | Description |
|---|---|---|
| 0x0 | 0x7 | Empty |
| 0x8 | 0x3ff (max) | Address table, 8 bytes each sample for up to 127 samples |
| 0x400 | 0x3ffff | ADPCM data |

The address table can end (and the ADPCM data begin) before address `0x400`. However, in SF2 the unused samples are all set to address `0xffffff`.

Each 8-byte address entry consists of:

* a 3-byte start address
* a 3-byte end address
* 2 empty bytes

### ADPCM sample format

Two 4-bit samples are stored per-byte. The codec used is Dialogic ADPCM, and the sample rate is 8kHz (the MSM6295 also supports a 6kHz sample rate). This codec was also used in telephony equipment.
