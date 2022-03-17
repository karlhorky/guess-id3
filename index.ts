import fs from 'node:fs';
import path from 'node:path';
import ID3Writer from 'browser-id3-writer';
import glob from 'glob';
import guessMetadata from 'guess-metadata';
import parseArgs from 'minimist';

const defaultOpts = {
  dry: false,
  verbose: false,
};

function guessId3(
  filenamePattern: string,
  options: Partial<typeof defaultOpts>,
) {
  const mergedOpts = Object.assign(defaultOpts, options);
  const files = glob.sync(filenamePattern);

  if (mergedOpts.verbose === true) {
    console.log('Matched files:', files);
  }

  return Promise.all(
    files.map((filePath) => {
      return new Promise<void>((resolve) => {
        const filename = path.basename(filePath);
        const { artist, title } = guessMetadata(filename);

        if (mergedOpts.dry === true) {
          console.log(filename, '->', { artist, title });
        } else {
          const fileContents = fs.readFileSync(filename);

          if (mergedOpts.verbose === true) {
            console.log('Writing follow tag to', filename, ':');
            console.log('  TIT2 (song title):', title);
            console.log('  TPE2 (artist name):', artist);
          }

          const writer = new ID3Writer(fileContents);
          writer.setFrame('TIT2', title);
          writer.setFrame('TPE2', artist);
          writer.setFrame('TPE1', [artist]);
          writer.addTag();

          const taggedSongBuffer = Buffer.from(writer.arrayBuffer);
          fs.writeFileSync(filename, taggedSongBuffer);
        }

        resolve();
      });
    }),
  );
}

const args = parseArgs(process.argv.slice(2), {
  boolean: ['dry', 'verbose'],
});
const globs = args._[0];

if (args.help || args.h) {
  console.log('guess-id3 [--dry] [--verbose] <pattern> [<pattern> ...]');
  process.exit(0);
}

const options = {
  dry: args.dry === true,
  verbose: args.verbose === true,
};

guessId3(globs, options)
  .then(() => console.log('Done.'))
  .catch((err) => console.error(err));
