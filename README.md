# Stealthy-Communicator

This project allows you to hide messages inside media files such as images, audio, and video. It is a part of the **DevClash** event, held by the **Nexus Club**. The goal of this project is to demonstrate the use of steganography for hiding messages within different types of media files.

[live-demo](https://stealthy-communicator.netlify.app/)

## Supported Media Types

This application supports the following media types for message encoding and decoding:

- **Images**: `.png`, `.jpg`, `.jpeg`, `.webp`
- **Audio**: `.mp3`, `.wav`, `.ogg`, `.m4a`
- **Video**: `.mp4`, `.webm`

## Features

### Encode a Message

You can encode a hidden message into an image, audio, or video file. The hidden message is embedded into the file, making it invisible to the human eye or ear but recoverable by decoding the file.

### Decode a Message

You can extract the hidden message from the supported media files, whether it's an image, audio, or video.

## How It Works

The process consists of two main steps:

1. **Encoding**: Embedding a secret message into a file.
2. **Decoding**: Extracting the hidden message from the file.

- For the images, I did not use any external packages. However for videos and audios I had to use FFmpeg.wasm to manipulate the files and encode/decode the messages. This is because the browser does not allow direct manipulation of video/audio files like it does with images.
- `FFmpeg.wasm` is a WebAssembly port of `FFmpeg`, which allows you to run FFmpeg in the browser. It provides a way to process video and audio files in the browser without needing a server-side component.
I tried to not use any external packages for the video/audio manipulation, but it was not possible, with FFmpeg.wasm it was much easier and cleaner since it made me able to just change in the metadata of the video/audio files directly.

### Example of Encoding an Audio Message

The message can be encoded into the metadata of audio files like `.mp3`, `.m4a`, etc. The encoding process will keep the file playable, but the hidden message can be retrieved later.

```javascript
const encodedAudioUrl = encodeAudioMessage(audioElement, "Your secret message");
````
### Example of Decoding an Audio Message
To extract the hidden message from an encoded audio file, the process looks like:
```javascript
const hiddenMessage = decodeAudioMessage(audioElement);
```

### Example of Encoding an Image
For images, the message is hidden in the pixel data, making it undetectable visually.
```javascript
const encodedImageUrl = encodeMessage(imageElement, "Secret Message");
```

### Example of Decoding an Image
To retrieve the hidden message from an image:
```javascript
const hiddenMessage = decodeMessage(imageElement);
```

## Setup

### Prerequisites
To run this project locally, make sure you have the following tools installed:
- Node.js (version 14 or later)
- FFmpeg (for audio and video encoding/decoding)

You can install Node.js from [here](https://nodejs.org/). FFmpeg can be downloaded from [FFmpeg's official website](https://ffmpeg.org/download.html).

### Installation
Clone the repository:
```bash
git clone https://github.com/yourusername/Stealthy-Communicator.git
```

Navigate to the project directory:
```bash
cd Stealthy-Communicator
```

Install dependencies:
```bash
npm install
```

### Running the Project
To start the application, run the following command:
```bash
npm start
```

The application should now be running locally. Open your browser and navigate to http://localhost:8080 to use the functionality.

## Contributing
Feel free to fork this project, create an issue, or submit a pull request with your enhancements.

## License
This project is licensed under the MIT License - see the LICENSE file for details.
