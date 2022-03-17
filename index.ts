import path from 'node:path';
import glob from 'glob';
import guessMetadata from 'guess-metadata';
import parseArgs from 'minimist';
import id3 from 'node-id3';

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
        const { artist, title } = guessMetadata(path.basename(filePath));

        if (mergedOpts.dry === true) {
          console.log(filePath, '->', { artist, title });
          resolve();
          return;
        }

        if (mergedOpts.verbose === true) {
          console.log('Writing follow tag to', filePath, ':');
          console.log('  TIT2 (song title):', title);
          console.log('  TPE2 (artist name):', artist);
        }

        id3.write(
          {
            title,
            artist,
          },
          filePath,
        );

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
  console.log('guess-id3 [--dry] [--verbose] <pattern>');
  process.exit(0);
}

const options = {
  dry: args.dry === true,
  verbose: args.verbose === true,
};

guessId3(globs, options)
  .then(() => console.log('Done.'))
  .catch((err) => console.error(err));
