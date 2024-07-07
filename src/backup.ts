import 'dotenv/config';
import { exec } from 'child_process';
import { PutObjectCommand, S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import { createReadStream, unlink } from 'fs';

if (!process.env.BACKUP_MONGO_URI) {
  throw new Error('Mongo URI is not defined.');
}
if (!process.env.AWS_S3_BUCKET) {
  throw new Error('AWS S3 bucket is not defined.');
}
if (!process.env.AWS_S3_REGION) {
  throw new Error('AWS S3 region is not defined.');
}

const isDebug = () => {
  return process.env.DEBUG && process.env.DEBUG === '1';
};

const uploadToS3 = async (file: {
  name: string;
  path: string;
}): Promise<void> => {
  const bucket = process.env.AWS_S3_BUCKET;
  const clientOptions: S3ClientConfig = {
    region: process.env.AWS_S3_REGION,
  };

  console.log(`Uploading backup to S3 at ${bucket}/${file.name}...`);

  if (process.env.AWS_S3_ENDPOINT) {
    console.log(`Using custom endpoint: ${process.env.AWS_S3_ENDPOINT}`);

    clientOptions['endpoint'] = process.env.AWS_S3_ENDPOINT;
  }

  const client = new S3Client(clientOptions);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: file.name,
      Body: createReadStream(file.path),
    })
  );
};

const dumpToFile = async (path: string): Promise<void> => {
  console.log(`Creating dump at ${path}...`);

  await new Promise((resolve, reject) => {
    const command = `mongodump --uri "${process.env.BACKUP_MONGO_URI}" --gzip --archive=${path}`;

    if (isDebug()) {
      console.log(`Debug: Mongo command: ${command}`);
    }

    exec(command, (error, _, stderr) => {
      if (error) {
        reject({ error: JSON.stringify(error), stderr });

        if (isDebug()) {
          console.log(`Debug: could not create local dump file. ${error}`);
        }

        return;
      }

      resolve(undefined);
    });
  });
};

const deleteFile = async (path: string): Promise<void> => {
  console.log(`Deleting local dump file at ${path}...`);

  await new Promise((resolve, reject) => {
    unlink(path, (error) => {
      reject({ error: JSON.stringify(error) });

      if (error && isDebug()) {
        console.log(`Debug: could not remove local dump file. ${error}`);
      }

      return;
    });
    resolve(undefined);
  });
};

export const backup = async (): Promise<void> => {
  const timestamp = new Date().toISOString().replace(/[:.]+/g, '-');

  const filename = `backup-${timestamp}.gz`;
  const filepath = `/tmp/${filename}`;

  await dumpToFile(filepath);
  await uploadToS3({ name: filename, path: filepath });
  await deleteFile(filepath);

  console.log('Backup successfully created.');
};
