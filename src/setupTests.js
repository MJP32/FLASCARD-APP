// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Polyfill TextEncoder/TextDecoder for Jest (required by Firebase/undici)
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill Web Streams API for Jest (required by Firebase/undici)
import { ReadableStream, TransformStream } from 'stream/web';
global.ReadableStream = ReadableStream;
global.TransformStream = TransformStream;
