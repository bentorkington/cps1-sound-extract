# CPS1-sound-extract

**This is a work in progress.** Suggestions & pull requests are welcomed. Talk to me at @sf2platinum on Twitter.

Tools for extracting MIDI files and samples from CPS1 based arcade games.

* `cps1-extract-samples`: Extract ADPCM samples for a game
* `cps1-extract-tune`: Dump/extract stage melodies

I'm currently testing this against Street Fighter II (sf2ua) ROMs. I plan for these tools to be expanded to any CPS1 games that use a similar sound ROM, and ultimately an even wider range of arcade platforms.

I suspect most CPS1 sound ROMs will differ only in the tunes and samples, and the overall format of the stage tunes will be the same or similar. Please try different ROMs and let me know!

## Installation

### Requirements

* Node.js
* ROMs of games you want to work with

### To install

1. Download or clone this repo, and `cd` to it
2. `npm install` # to get the dependencies
3. `npm link` # (optional - installs symlinks for the tools in your `/usr/local/bin`)

## Examples

Run these commands from a directory containing the game ROMs

Dump Sagat's stage tune (number 11) from Street Fighter II World Warrior (sf2ua) to the terminal:

`cps1-extract-tune sf2ua 11 -d`

Export that tune to a MIDI file named `track-11.mid`:

`cps1-extract-tune sf2ua 11 -m`

## Adding your own game

You'll need to figure out the addresses where songs, instruments and samples are stored. Have fun!

To get started, copy the `games/sf2ua.json` file, naming the same as the MAME romset name. Edit the hexadecimal values to whatever addresses you've discovered, and the names of the Z80 code ROM, and Oki sample ROMs. Put ROM names in a JSON array and they will be concatenated when read.

The format is documented in `games/README.md`

## Digging around a CPS1 Sound ROM

The CPS1 uses a dedicated Z80 CPU for sound processing. Aside from sending commands to the Z80, the main m68k CPU doesn't interact with it at all. The Z80 intefaces with the Yamaha, Oki and m68k CPU with addresses beginning `0xf000`.

The Z80 address map is:

| Start | End |  |
|---|---|---|
| `0x0000` | `0x7fff`  | Z80 Code ROM |
| `0x8000` | `0xbfff`  | Bank-switched access to bytes `0x8000-0xffff` of the above code ROM |
| `0xd000` | `0xd7ff`  | RAM |
| `0xf000` | `0xf001`  | Yamaha YM2151 |
| `0xf002` | `0xf002`  | Oki MSM6295 |
| `0xf004` | `0xf004`  | Bank switch register |
| `0xf006` | `0xf006`  | Controls pin 7 of the Oki |
| `0xf008` | `0xf008`  | Sound command register from m68k CPU |
| `0xf00a` | `0xf00a`  | Sound fade timer from m68k CPU |

While the Z80 is a little-endian CPU, addresses of tracks and instruments are in **big-endian** format, requring byte-swapping when being read into Z80 register pairs. My guess is the tune programs were dumped from tools running on a big-endian Sharp X68000, and Capcom decided to do the endian swapping at run time.

## CPS1 sound

The sound section of a CPS1 game is made up of

* Yamaha YM2151 OPM FM Synthesizer for melodies
* Oki MSM6295 for game samples and percussion instruments
* A Z80 CPU to drive these chips.

The game CPU (m68k) sends 2-byte commands to the sound CPU. The first byte determines whether the commanded sound (or silence) will fade in/out. Some of these commands start songs such as stage tunes, others will play samples during gameplay.

## YM2151

A very popular FM synthesis chip found in a range of arcade games, the Sharp X68000 computer Capcom used developing SF2, and some Yamaha Sythesizers. The YM2151 can play 8 channels of audio. Each channel consists of four *operators* which can be arranged in various ways to produce a variety of instrument sounds.

FM synth programming is quite involved, and the YM2151 is a complex chip. I plan to add more information here some day.

## Oki MSM6295

The MSM6295 can play four channels of samples simultaneously. During a game, some channels are reserved for percussion instruments for the stage tune, other channels are kept free for game sound effects.

### Sample ROM layout

The MSM6295 can map up to 256kiB of sample data.

| Start  | End  | Description |
|---|---|---|
| `0x0` | `0x7` | Empty |
| `0x8` | `0x3ff` (max) | Address table, 8 bytes each sample for up to 127 samples |
| `0x400` | `0x3ffff` | ADPCM data |

The address table can end (and the ADPCM data begin) before address `0x400`. However, in SF2 the unused samples are all set to address `0xffffff`.

Each 8-byte address entry consists of:

* a 3-byte start address
* a 3-byte end address
* 2 empty bytes

Look for the MSM6295 datasheet for more info.

### ADPCM sample format

Two 4-bit samples are stored per-byte. The codec used is Dialogic ADPCM, and the sample rate is 8kHz (the MSM6295 also supports a 6kHz sample rate). This codec was also used in telephony equipment. The `cps1-extract-samples` tool can extract all of the samples in the Oki ROM automatically.

## Helpful MAME breakpoints

### Solo Yamaha channel

Mutes all yamaha channels except 0

`temp0 = 0; bpset 2d3,b@d007 != temp0, {printf "muting channel %d", b@d007; a = 0x17; g;}`

### Conditional traces

Prints the loop counter each time a conditional branch instruction is encountered

`bpset e8b, 1, {printf "branch type %02x voice counter %02x", b, b@hl; g;}`

### Yamaha register traces

Careful! It spews a lot of data!

`bpset 69c, 1, {printf "Yama write reg %02x data %02x", d, e; g;}`

Only Key commands:

`bpset 69c, d >= 0x28 && d < 0x30, {printf "Yama KEY  reg %02x data %02x", d, e; g;}`

`
`

## Percussion instruments in SF2UA

Some sample percussion instruments in the SF2UA ROM

| ID  | Name  |
|---|---|
| 1  | Bass drum  |
| 2  | Mid tom |
| 3  | E Honda thing |
| 4  | Closed high hat |
| 5  | High tom |
| 6  | Low tom |
| 15  | Cymbal |
| 16 | Snare |
| 17 | Hi snare |
| 18 |  |
