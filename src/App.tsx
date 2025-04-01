import React, { useState, useRef } from "react";
import {
  encodeMessage,
  decodeMessage,
  encodeAudioMessage,
  decodeAudioMessage,
  encodeVideoMessage,
  decodeVideoMessage,
} from "./utils/steganography";
import {
  Download,
  FileImage,
  Lock,
  Unlock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Music,
  Video,
} from "lucide-react";

type MediaType = "image" | "audio" | "video";

const SUPPORTED_EXTENSIONS = {
  image: [".png", ".jpg", ".jpeg", ".webp"],
  audio: [".mp3", ".wav", ".ogg", ".m4a"],
  video: [".mp4", ".webm"],
};

const StealthyEncoder = () => {
  const [activeTab, setActiveTab] = useState<string>("encode");
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [message, setMessage] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileExtension, setSelectedFileExtension] = useState<
    | "png"
    | "jpg"
    | "jpeg"
    | "webp"
    | "mp3"
    | "m4a"
    | "ogg"
    | "wav"
    | "mp4"
    | "webm"
    | null
  >(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [encodedMediaUrl, setEncodedMediaUrl] = useState<string | null>(null);
  const [decodedMessage, setDecodedMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const encodeFileInputRef = useRef<HTMLInputElement>(null);
  const decodeFileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleMediaSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
    mode: "encode" | "decode"
  ) => {
    setError(null);
    const file = event.target.files?.[0];

    if (!file) return;

    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();

    let type: MediaType;

    if (SUPPORTED_EXTENSIONS.image.includes(fileExtension)) {
      type = "image";
      setSelectedFileExtension(
        fileExtension.substring(1) as "png" | "jpg" | "jpeg" | "webp"
      );
    } else if (SUPPORTED_EXTENSIONS.audio.includes(fileExtension)) {
      type = "audio";
      setSelectedFileExtension(
        fileExtension.substring(1) as "mp3" | "ogg" | "wav" | "m4a"
      );
    } else if (SUPPORTED_EXTENSIONS.video.includes(fileExtension)) {
      type = "video";
      setSelectedFileExtension(fileExtension.substring(1) as "mp4" | "webm");
    } else {
      setError(
        `Unsupported file format. Please use: ${Object.values(
          SUPPORTED_EXTENSIONS
        )
          .flat()
          .join(", ")}`
      );
      return;
    }

    setMediaType(type);

    if (mode === "encode") {
      setSelectedFile(file);
      setEncodedMediaUrl(null);
      createMediaPreview(file);
    } else {
      setDecodedMessage(null);
      createMediaPreview(file);
    }
  };

  const createMediaPreview = (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  };

  const handleEncode = async () => {
    if (!selectedFile || !message.trim()) {
      setError("Please select a file and enter a message.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      let encodedUrl: string | null = null;

      if (mediaType === "image") {
        const img = new Image();

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Failed to load image"));
          img.src = previewUrl!;
        });

        const format = `image/${selectedFileExtension}`;
        encodedUrl = await encodeMessage(img, message, format);
        if (!encodedUrl) {
          console.error("Encoding failed: No output URL");
          return;
        }
      } else if (mediaType === "audio") {
        if (audioRef.current) {
          await new Promise<void>((resolve) => {
            const audio = audioRef.current!;
            if (audio.readyState >= 2) resolve();
            else {
              audio.onloadeddata = () => resolve();
              audio.load();
            }
          });
          encodedUrl = await encodeAudioMessage(
            audioRef.current,
            message,
            selectedFileExtension!
          );
          if (!encodedUrl) {
            console.error("Encoding failed: No output URL");
            return;
          }
        } else {
          throw new Error("Audio element not ready");
        }
      } else if (mediaType === "video") {
        if (videoRef.current) {
          await new Promise<void>((resolve) => {
            const video = videoRef.current!;
            if (video.readyState >= 2) resolve();
            else {
              video.onloadeddata = () => resolve();
              video.load();
            }
          });
          encodedUrl = await encodeVideoMessage(videoRef.current, message);
          if (!encodedUrl) {
            console.error("Encoding failed: No output URL");
            return;
          }
        } else {
          throw new Error("Video element not ready");
        }
      }

      setEncodedMediaUrl(encodedUrl);
    } catch (err) {
      setError(
        (err as Error).message || `Failed to encode message in ${mediaType}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecode = async () => {
    if (!previewUrl) {
      setError("Please select a file to decode.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setDecodedMessage(null);

    try {
      let message: string | null = null;

      if (mediaType === "image") {
        const img = new Image();

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Failed to load image"));
          img.src = previewUrl;
        });

        message = await decodeMessage(img);
      } else if (mediaType === "audio") {
        if (audioRef.current) {
          await new Promise<void>((resolve) => {
            const audio = audioRef.current!;
            if (audio.readyState >= 2) resolve();
            else {
              audio.onloadeddata = () => resolve();
              audio.load();
            }
          });

          message = await decodeAudioMessage(audioRef.current);
        } else {
          throw new Error("Audio element not ready");
        }
      } else if (mediaType === "video") {
        if (videoRef.current) {
          await new Promise<void>((resolve) => {
            const video = videoRef.current!;
            if (video.readyState >= 2) resolve();
            else {
              video.onloadeddata = () => resolve();
              video.load();
            }
          });

          message = await decodeVideoMessage(videoRef.current);
        } else {
          throw new Error("Video element not ready");
        }
      }

      if (message) {
        setDecodedMessage(message);
      } else {
        setError(`No hidden message found in this ${mediaType}.`);
      }
    } catch (err) {
      setError(
        (err as Error).message || `Failed to decode message from ${mediaType}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!encodedMediaUrl) return;

    const link = document.createElement("a");
    link.href = encodedMediaUrl;

    link.download = `stealthy_encoded_${mediaType}.${selectedFileExtension}`;
    link.click();
  };

  const renderMediaPreview = (
    url: string | null,
    type: MediaType,
    isEncoded: boolean = false
  ) => {
    if (!url) {
      return (
        <div className="relative aspect-square bg-gray-200 rounded-md flex items-center justify-center overflow-hidden">
          {type === "image" && (
            <FileImage className="w-16 h-16 text-gray-400" />
          )}
          {type === "audio" && <Music className="w-16 h-16 text-gray-400" />}
          {type === "video" && <Video className="w-16 h-16 text-gray-400" />}
        </div>
      );
    }

    return (
      <div className="relative aspect-square bg-gray-200 rounded-md flex items-center justify-center overflow-hidden">
        {type === "image" && (
          <img
            src={url}
            alt={isEncoded ? "Encoded" : "Original"}
            className="max-w-full max-h-full object-contain"
          />
        )}
        {type === "audio" && (
          <div className="w-full p-4">
            <audio
              ref={!isEncoded ? audioRef : undefined}
              src={url}
              controls
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-2 text-center">
              Audio file with hidden message
            </p>
          </div>
        )}
        {type === "video" && (
          <video
            ref={!isEncoded ? videoRef : undefined}
            src={url}
            controls
            className="max-w-full max-h-full"
            preload="metadata"
          />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="text-center border-b p-4">
          <h1 className="text-2xl font-bold">Stealthy Communicator</h1>
          <p className="text-gray-600">Hide your messages in plain sight</p>
        </div>

        <div className="p-6">
          <div className="flex border-b mb-6">
            <button
              className={`py-2 px-4 ${
                activeTab === "encode"
                  ? "border-b-2 border-blue-500 text-blue-500"
                  : "text-gray-500"
              }`}
              onClick={() => setActiveTab("encode")}
            >
              <Lock className="w-4 h-4 inline mr-1" /> Encode Message
            </button>
            <button
              className={`py-2 px-4 ${
                activeTab === "decode"
                  ? "border-b-2 border-blue-500 text-blue-500"
                  : "text-gray-500"
              }`}
              onClick={() => setActiveTab("decode")}
            >
              <Unlock className="w-4 h-4 inline mr-1" /> Decode Message
            </button>
          </div>

          {activeTab === "encode" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Secret Message
                  </label>
                  <textarea
                    placeholder="Enter your secret message here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full h-32 resize-none border rounded-md p-2"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium ">
                    Select File
                  </label>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center cursor-pointer hover:border-blue-400"
                    onClick={() => encodeFileInputRef.current?.click()}
                  >
                    <div className="flex justify-center space-x-2">
                      <FileImage className="w-5 h-5 text-gray-400" />
                      <Music className="w-5 h-5 text-gray-400" />
                      <Video className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Click to upload a file
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Supported formats:{" "}
                      {Object.entries(SUPPORTED_EXTENSIONS)
                        .map(
                          ([type, exts]) =>
                            `${
                              type.charAt(0).toUpperCase() + type.slice(1)
                            }: ${exts
                              .map((ext) => ext.substring(1).toUpperCase())
                              .join(", ")}`
                        )
                        .join(" | ")}
                    </p>
                    <input
                      type="file"
                      ref={encodeFileInputRef}
                      accept={Object.values(SUPPORTED_EXTENSIONS)
                        .flat()
                        .join(",")}
                      className="hidden"
                      onChange={(e) => handleMediaSelect(e, "encode")}
                    />
                  </div>
                </div>

                <button
                  onClick={handleEncode}
                  disabled={isProcessing || !selectedFile || !message.trim()}
                  className="w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isProcessing
                    ? "Processing..."
                    : `Hide Message In ${
                        mediaType.charAt(0).toUpperCase() + mediaType.slice(1)
                      }`}
                  {!isProcessing && (
                    <ArrowRight className="w-4 h-4 inline ml-2" />
                  )}
                </button>
              </div>

              <div className="space-y-4">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  {previewUrl ? `Original ${mediaType}` : "No file selected"}
                </div>

                {renderMediaPreview(previewUrl, mediaType)}

                {encodedMediaUrl && (
                  <>
                    <div className="text-sm font-medium text-gray-700 flex items-center">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mr-1" />
                      {`Encoded ${mediaType}`}
                    </div>

                    {renderMediaPreview(encodedMediaUrl, mediaType, true)}

                    <button
                      onClick={handleDownload}
                      className="w-full py-2 px-4 border border-blue-500 text-blue-500 rounded-md hover:bg-blue-50"
                    >
                      <Download className="w-4 h-4 inline mr-2" />
                      Download{" "}
                      {`Encoded ${
                        mediaType.charAt(0).toUpperCase() + mediaType.slice(1)
                      }`}
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Select File to Decode
                  </label>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center cursor-pointer hover:border-blue-400"
                    onClick={() => decodeFileInputRef.current?.click()}
                  >
                    <div className="flex justify-center space-x-2">
                      <FileImage className="w-5 h-5 text-gray-400" />
                      <Music className="w-5 h-5 text-gray-400" />
                      <Video className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Click to upload a file with a hidden message
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Supported formats:{" "}
                      {Object.entries(SUPPORTED_EXTENSIONS)
                        .map(
                          ([type, exts]) =>
                            `${
                              type.charAt(0).toUpperCase() + type.slice(1)
                            }: ${exts
                              .map((ext) => ext.substring(1).toUpperCase())
                              .join(", ")}`
                        )
                        .join(" | ")}
                    </p>
                    <input
                      type="file"
                      ref={decodeFileInputRef}
                      accept={Object.values(SUPPORTED_EXTENSIONS)
                        .flat()
                        .join(",")}
                      className="hidden"
                      onChange={(e) => handleMediaSelect(e, "decode")}
                    />
                  </div>
                </div>

                <button
                  onClick={handleDecode}
                  disabled={isProcessing || !previewUrl}
                  className="w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isProcessing ? "Decoding..." : "Reveal Hidden Message"}
                  {!isProcessing && <Unlock className="w-4 h-4 inline ml-2" />}
                </button>

                {decodedMessage && (
                  <div className="bg-gray-100 border border-gray-200 rounded-md p-4">
                    <h3 className="text-sm font-medium text-gray-700">
                      Hidden Message Found
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap break-words">
                      {decodedMessage}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  {previewUrl
                    ? `${
                        mediaType.charAt(0).toUpperCase() + mediaType.slice(1)
                      } to Decode`
                    : "No file selected"}
                </div>
                {renderMediaPreview(previewUrl, mediaType)}
              </div>
            </div>
          )}

          {error && (
            <div
              className={`mt-4 p-3 ${
                error.includes("For videos,")
                  ? "bg-yellow-100 border border-yellow-400 text-yellow-800"
                  : "bg-red-100 border border-red-400 text-red-700"
              } rounded-md`}
            >
              <div className="flex">
                <AlertCircle className="h-5 w-5 mr-2" />
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t p-4 flex justify-center">
          <p className="text-xs text-gray-500 flex gap-2 items-center">
            Stealthy Communicator
            <a
              href="https://github.com/MohamedMouloudj"
              target="_blank"
              className="border-l pl-2"
            >
              <img
                src="github.svg"
                alt="github"
                className="w-6 h-6 object-contain cursor-pointer fill-gray-500"
              />
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default StealthyEncoder;
