import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

const ffmpeg = new FFmpeg();

/**
 * Encodes a text message within an image using LSB steganography
 * @param image - The image element to encode the message into
 * @param message - The message to hide in the image
 * @returns A Promise that resolves to the data URL of the image with the hidden message
 */
export const encodeMessage = (
  image: HTMLImageElement,
  message: string,
  format: string = "image/png"
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Canvas to work with the image data
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Could not create canvas context"));
        return;
      }

      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0);

      // The image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Converting the message to binary
      // Distinctive marker at the beginning and end of the message
      const messageWithMarker = `<<START>>${message}<<END>>`;
      let binaryMessage = "";

      for (let i = 0; i < messageWithMarker.length; i++) {
        const binary = messageWithMarker
          .charCodeAt(i)
          .toString(2)
          .padStart(8, "0");
        binaryMessage += binary;
      }

      // Check if the message can fit in the image
      const totalPixels = image.width * image.height;
      const usableChannelsPerPixel = 3; // RGB (no Alpha)
      const totalUsableBits = totalPixels * usableChannelsPerPixel;

      if (binaryMessage.length > totalUsableBits) {
        reject(new Error("Message is too large for this image"));
        return;
      }

      // Hide the binary message in the least significant bit of each color channel
      let messageBitIndex = 0;

      for (let pixelIndex = 0; pixelIndex < data.length / 4; pixelIndex++) {
        // Process each RGB channel (skip alpha channel)
        for (let channel = 0; channel < 3; channel++) {
          if (messageBitIndex < binaryMessage.length) {
            const dataIndex = pixelIndex * 4 + channel;
            const bit = parseInt(binaryMessage[messageBitIndex], 10);

            // Clear the least significant bit and set it to the message bit
            data[dataIndex] = (data[dataIndex] & 0xfe) | bit;

            messageBitIndex++;
          } else {
            break;
          }
        }

        if (messageBitIndex >= binaryMessage.length) {
          break;
        }
      }

      // Update the canvas
      ctx.putImageData(imageData, 0, 0);
      const dataURL = canvas.toDataURL(format);

      resolve(dataURL);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Decodes a hidden message from an image
 * @param image - The image element that potentially contains a hidden message
 * @returns A Promise that resolves to the decoded message, or null if no message was found
 */
export const decodeMessage = (
  image: HTMLImageElement
): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    try {
      // Create a canvas to work with the image data
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Could not create canvas context"));
        return;
      }

      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Extract the binary message from the least significant bits
      let binaryMessage = "";
      const maxPixels = Math.min(data.length / 4, 100000); // Limit extraction to prevent slow processing

      for (let pixelIndex = 0; pixelIndex < maxPixels; pixelIndex++) {
        // Extract LSB from each RGB channel (skip alpha)
        for (let channel = 0; channel < 3; channel++) {
          const dataIndex = pixelIndex * 4 + channel;
          const bit = data[dataIndex] & 0x01;
          binaryMessage += bit;

          // Check for our marker every 8 bits (1 byte/character)
          if (binaryMessage.length % 8 === 0 && binaryMessage.length >= 8 * 9) {
            // At least "<<START>>"
            const extractedText = extractTextFromBinary(binaryMessage);

            // Look for our markers
            if (
              extractedText.includes("<<START>>") &&
              extractedText.includes("<<END>>")
            ) {
              const startIndex = extractedText.indexOf("<<START>>") + 9; // 9 is the length of '<<START>>'
              const endIndex = extractedText.indexOf("<<END>>");

              if (endIndex > startIndex) {
                const message = extractedText.substring(startIndex, endIndex);
                resolve(message);
                return;
              }
            }
          }
        }
      }

      // No valid message was found
      resolve(null);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Converts a binary string to text
 * @param binary - The binary string to convert
 * @returns The text represented by the binary string
 */
const extractTextFromBinary = (binary: string): string => {
  let text = "";

  for (let i = 0; i < binary.length; i += 8) {
    const byte = binary.substring(i, i + 8);
    if (byte.length === 8) {
      const charCode = parseInt(byte, 2);
      text += String.fromCharCode(charCode);
    }
  }

  return text;
};

// ---------------- VIDEO -----------------

/**
 * Encodes a message into a video file by embedding it as metadata.
 * @param videoElement - The HTMLVideoElement containing the source video.
 * @param message - The message to encode into the video file's metadata.
 * @returns A Promise that resolves to a Blob containing the modified video file.
 * @remarks
 * - The function supports video files with extensions `.mp4` and `.webm`.
 *
 * @throws Will throw an error if the video source cannot be fetched or processed.
 */

export const encodeVideoMessage = async (
  videoElement: HTMLVideoElement,
  message: string
): Promise<string> => {
  if (!ffmpeg.loaded) await ffmpeg.load();

  const videoSrc = videoElement.src;
  const videoBlob = await fetch(videoSrc).then((res) => res.blob());
  const fileType = videoSrc.endsWith(".webm") ? "webm" : "mp4";

  await ffmpeg.writeFile(`input.${fileType}`, await fetchFile(videoBlob));

  const command =
    fileType === "mp4"
      ? [
          "-i",
          `input.${fileType}`,
          "-metadata",
          `title=${message}`,
          "-metadata",
          `comment=${message}`,
          "-c:v",
          "copy",
          "-c:a",
          "copy",
          `output.${fileType}`,
        ]
      : [
          "-i",
          `input.${fileType}`,
          "-metadata",
          `title=${message}`,
          "-metadata",
          `comment=${message}`,
          "-c:v",
          "libvpx-vp9",
          "-c:a",
          "libopus",
          `output.${fileType}`,
        ];

  await ffmpeg.exec(command);
  const outputData = await ffmpeg.readFile(`output.${fileType}`);

  await ffmpeg.deleteFile(`input.${fileType}`);
  await ffmpeg.deleteFile(`output.${fileType}`);

  return URL.createObjectURL(
    new Blob([outputData], { type: `video/${fileType}` })
  );
};

/**
 * Decodes a hidden message embedded in the metadata of a video file.
 * @param videoElement - The HTMLVideoElement containing the video source to decode.
 * @returns A promise that resolves to the decoded message as a string, or `null` if no message is found.
 * @remarks
 * Supported video file types include `.mp4` and `.webm`.
 */
export const decodeVideoMessage = async (
  videoElement: HTMLVideoElement
): Promise<string | null> => {
  if (!ffmpeg.loaded) await ffmpeg.load();

  const videoSrc = videoElement.src;
  const videoBlob = await fetch(videoSrc).then((res) => res.blob());
  const fileType = videoSrc.endsWith(".webm") ? "webm" : "mp4";

  await ffmpeg.writeFile(`input.${fileType}`, await fetchFile(videoBlob));
  await ffmpeg.exec([
    "-i",
    `input.${fileType}`,
    "-f",
    "ffmetadata",
    "metadata.txt",
  ]);

  const metadataData = await ffmpeg.readFile("metadata.txt");
  const metadataText =
    typeof metadataData === "string"
      ? metadataData
      : new TextDecoder().decode(metadataData as Uint8Array);

  const match = metadataText.match(/(title|comment)=(.*)/);

  await ffmpeg.deleteFile(`input.${fileType}`);
  await ffmpeg.deleteFile("metadata.txt");

  return match ? match[2].trim() : null;
};

// ---------------- AUDIO -----------------

/**
 * Encodes a message into an audio file by embedding it as metadata.
 *
 * @param audioElement - The HTMLAudioElement containing the source audio.
 * @param message - The message to encode into the audio file's metadata.
 * @returns A Promise that resolves to a Blob containing the modified audio file.
 *
 * @remarks
 * The function supports audio files with extensions `.mp3`, `.wav`, `.ogg`, and `.m4a`.
 *
 * @throws Will throw an error if the audio source cannot be fetched or processed.
 *
 */
export const encodeAudioMessage = async (
  audioElement: HTMLAudioElement,
  message: string,
  type: string
): Promise<string> => {
  if (!ffmpeg.loaded) await ffmpeg.load();

  const audioSrc = audioElement.src;
  const audioBlob = await fetch(audioSrc).then((res) => res.blob());
  if (!audioBlob.size) {
    console.error("Failed to fetch audio data, the blob is empty.");
    return "";
  }
  const fileType = type;

  await ffmpeg.writeFile(`input.${fileType}`, await fetchFile(audioBlob));
  const command = [
    "-i",
    `input.${fileType}`,
    "-metadata",
    `title=${message}`,
    "-metadata",
    `comment=${message}`,
    "-c:a",
    fileType === "mp3" || fileType === "m4a" ? "aac" : "libopus",
    "-y",
    `output.${fileType}`,
  ];
  await ffmpeg.exec(command).catch((err) => {
    console.error("Error executing FFmpeg command:", err);
  });

  const outputData = await ffmpeg.readFile(`output.${fileType}`);

  await ffmpeg.deleteFile(`input.${fileType}`);
  await ffmpeg.deleteFile(`output.${fileType}`);
  const url = URL.createObjectURL(
    new Blob([outputData], { type: `audio/${fileType}` })
  );
  return url;
};

/**
 * Decodes a hidden message embedded in the metadata of an audio file.
 *
 * @param audioElement - The HTMLAudioElement containing the audio source to decode.
 * @returns A promise that resolves to the decoded message as a string, or `null` if no message is found.
 *
 * @remarks
 * - Supported audio file types include `.mp3`, `.wav`, `.ogg`, and `.m4a`.
 */
export const decodeAudioMessage = async (
  audioElement: HTMLAudioElement
): Promise<string | null> => {
  if (!ffmpeg.loaded) await ffmpeg.load();

  const audioSrc = audioElement.src;
  const audioBlob = await fetch(audioSrc).then((res) => res.blob());
  const fileType =
    audioSrc.match(/\.mp3|\.wav|\.ogg|\.m4a/i)?.[0].substring(1) || "mp3";

  await ffmpeg.writeFile(`input.${fileType}`, await fetchFile(audioBlob));
  await ffmpeg.exec([
    "-i",
    `input.${fileType}`,
    "-f",
    "ffmetadata",
    "metadata.txt",
  ]);

  const metadataData = await ffmpeg.readFile("metadata.txt");
  const metadataText =
    typeof metadataData === "string"
      ? metadataData
      : new TextDecoder().decode(metadataData as Uint8Array);

  const match = metadataText.match(/(title|comment)=(.*)/);

  await ffmpeg.deleteFile(`input.${fileType}`);
  await ffmpeg.deleteFile("metadata.txt");

  return match ? match[2].trim() : null;
};
