/**
 * Streamer class for handling and verifying CESR streams.
 * CESR refers to Composable Event Streaming Representation,
 * a specification used in systems like KERI.
 *
 * This class allows creating instances of streams that can be verified
 * and managed according to the CESR specification.
 */
import {Texter} from "./texter";
import {Bexter} from "./bexter";
import {encodeBase64Url} from "./base64";

export class Streamer {
    private _stream: Uint8Array;

    /**
     * Initializes an instance of the Streamer class.
     * It accepts a CESR stream as either a string or Uint8Array and stores it internally
     * as Uint8Array to ensure uniformity in data handling.
     *
     * @param streamInput The input stream which can be either a string or Uint8Array.
     * @throws Error if the input stream type is not valid.
     */
    constructor(streamInput: string | Uint8Array) {
        if (typeof streamInput === 'string') {
            // Converts string input to Uint8Array using Buffer.from
            this._stream = new Uint8Array(Buffer.from(streamInput));
        } else if (streamInput instanceof Uint8Array) {
            // Directly uses the Uint8Array if the input is already of this type
            this._stream = streamInput;
        } else {
            throw new Error("Invalid stream type: Input must be a string or Uint8Array.");
        }
    }

    /**
     * @returns {boolean} Returns True if .stream is sniffable, False otherwise
     */
    public verify(): boolean {

        if (!this._stream || this._stream.length === 0) {
            return false;
        }

        // TODO: check if sniffable
        return false;
    }

    /**
     * Gets the CESR stream in its current format.
     *
     * @returns {Uint8Array} The stream as a Uint8Array.
     */
    get stream(): Uint8Array {
        return this._stream;
    }

    /**
     * Returns the stream where all primitives and groups are expanded to qb64.
     * This property requires parsing the full depth of the stream to ensure consistent expansion.
     *
     * @returns {string} The expanded text qb64 version of the stream.
     */
    get text(): string {
        return Buffer.from(this._stream).toString('base64');
    }

    /**
     * Returns the stream where all primitives and groups are compacted to qb2.
     * This property requires parsing the full depth of the stream to ensure consistent compaction.
     *
     * @returns {Uint8Array} The compacted binary qb2 version of the stream.
     */
    get binary(): Uint8Array {
        return this._stream; // This should actually compact the data.
    }

    /**
     * Represents the stream as a Texter instance.
     * A Texter is a hypothetical class used for handling textual representations of streams.
     *
     * @returns {Texter} A Texter primitive of the stream suitable for wrapping.
     */
    get texter(): Texter {
        if (!this._stream) {
            throw new Error("Stream data is not available.");
        }
        // Create a Texter instance using the raw binary data
        return new Texter({
            raw: this._stream
        });
    }

    /**
     * Gets a Bexter instance representing the stream.
     * Encodes the internal stream data to a Bexter instance, handling the CESR format correctly
     * and ensuring the text does not start with 'A' to prevent length ambiguity.
     *
     * @returns {Bexter} A Bexter instance initialized with the encoded stream.
     * @throws Error if the stream data is not available.
     */
    get bexter(): Bexter {
        if (!this._stream) {
            throw new Error("Stream data is not available.");
        }

        const encodedText = encodeBase64Url(this._stream); // Convert the raw stream to base64 URL-safe format.

        // Ensure not to start with 'A' which could be a padding character in base64 indicating a certain byte length.
        if (encodedText.startsWith('A')) {
            throw new Error("Base64 representation of the stream starts with 'A', leading to length ambiguity.");
        }

        return new Bexter({
            qb64: encodedText
        });
    }
}