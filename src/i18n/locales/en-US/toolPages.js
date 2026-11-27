/**
 * Tool catalog metadata (English).
 *
 * Only the card-level fields are translated here. Tool form labels live in
 * each page and still fall back to Chinese until translated individually.
 */
export default {
  toolPages: {
    '/video/downloader': {
      eyebrow: 'Video',
      title: 'Video info & frame grab',
      description: 'Read a local video’s duration, resolution and size, then export a PNG frame at any timestamp.',
      inputTitle: 'Choose a local video',
      resultTitle: 'File analysis',
      submit: 'Read metadata',
      reset: 'Clear',
      emptyTitle: 'Choose a video to analyse',
      emptyDesc: 'Pick a local video to read its real duration, resolution and size, and export a PNG frame at any timestamp.',
    },
    '/image/compressor': {
      eyebrow: 'Image',
      title: 'Image compressor',
      description: 'Compress images locally in your browser, then download the smaller file.',
      inputTitle: 'Choose an image',
      resultTitle: 'Compression result',
      submit: 'Compress now',
      reset: 'Clear',
      dropTitle: 'Click to choose an image, or drop it here',
      dropHint: 'Supports JPG / PNG / WebP, up to 5 MB each.',
      formatLabel: 'Output format',
      emptyTitle: 'Choose an image to start',
      emptyDesc: 'Compression runs locally in your browser; nothing is uploaded.',
      invalidType: 'Use a JPG, PNG or WebP image.',
      invalidSize: 'The image exceeds 5 MB. Choose a smaller file.',
    },
    '/dev/json-formatter': {
      eyebrow: 'Developer',
      title: 'JSON formatter',
      description: 'Format and validate JSON online. Everything runs locally in your browser.',
    },
    '/other/2fa': {
      eyebrow: 'Other',
      title: '2FA key verifier',
      description: 'Verify a TOTP code, or generate the current code from a secret key.',
      submit: 'Start verification',
      reset: 'Start over',
      emptyTitle: 'Enter a secret or a code',
      emptyDesc: 'Verify a 6-digit one-time code, or derive the current code from a secret key.',
      resultNote: 'TOTP rolls in 30-second windows; the time left is shown in the result area.',
      asideNotice: 'Verification runs locally in your browser; the secret never leaves this device.',
    },
    '/other/appleId': {
      eyebrow: 'Other',
      title: 'Shared Apple ID',
      description: 'Pick an account, copy it, then sign in at the App Store. App Store only — never iCloud.',
    },
    '/text/kit': {
      eyebrow: 'Text',
      title: 'Text toolbox',
      description: 'One place to format, convert, clean and count text.',
    },
    '/text/encoding-kit': {
      eyebrow: 'Encoding',
      title: 'Character encoding toolbox',
      description: 'Convert between text encodings, Base64, URL, Hex and other common formats.',
    },
    '/text/number-base': {
      eyebrow: 'Base',
      title: 'Number base converter',
      description: 'Convert between binary, octal, decimal and hexadecimal.',
    },
    '/text/regex-kit': {
      eyebrow: 'Regex',
      title: 'Regex toolbox',
      description: 'Test, match and replace with regular expressions, plus a quick reference.',
    },
    '/code/kit': {
      eyebrow: 'Code',
      title: 'Code toolbox',
      description: 'Format, minify, escape and unescape code.',
    },
    '/code/highlight': {
      eyebrow: 'Code',
      title: 'Syntax highlighter',
      description: 'Add syntax highlighting to code in a range of languages.',
    },
    '/media/image': {
      eyebrow: 'Image',
      title: 'Image toolbox',
      description: 'Compress images, convert formats, encode as Base64 and more.',
    },
    '/media/av': {
      eyebrow: 'Media',
      title: 'Audio & video toolbox',
      description: 'Convert audio and video formats and inspect media details.',
    },
    '/media/pdf': {
      eyebrow: 'PDF',
      title: 'PDF toolbox',
      description: 'Merge, split, compress and inspect PDF files.',
    },
    '/office/convert': {
      eyebrow: 'Documents',
      title: 'Document converter',
      description: 'Convert between Office document formats.',
    },
    '/office/sheet': {
      eyebrow: 'Sheets',
      title: 'Spreadsheet toolbox',
      description: 'Work with CSV, Excel and other spreadsheet files.',
    },
    '/office/slides': {
      eyebrow: 'Slides',
      title: 'Presentation tools',
      description: 'Convert and process presentation files.',
    },
    '/design/color': {
      eyebrow: 'Design',
      title: 'Color toolbox',
      description: 'Convert color formats and generate palettes.',
    },
    '/design/shape': {
      eyebrow: 'Design',
      title: 'Shadow & radius generator',
      description: 'Generate CSS shadows, radii and border styles.',
    },
    '/design/layout': {
      eyebrow: 'Design',
      title: 'Layout sandbox',
      description: 'Debug Flexbox and Grid layouts visually.',
    },
    '/convert/unit': {
      eyebrow: 'Convert',
      title: 'Unit converter',
      description: 'Convert length, weight, area, volume, temperature and more.',
    },
    '/convert/time': {
      eyebrow: 'Time',
      title: 'Time & date toolbox',
      description: 'Convert timestamps, calculate dates and run countdowns.',
    },
    '/convert/calc': {
      eyebrow: 'Calculate',
      title: 'Calculator toolbox',
      description: 'Evaluate expressions, calculate BMI and run statistics.',
    },
    '/dev/crypto': {
      eyebrow: 'Crypto',
      title: 'Encryption toolbox',
      description: 'Base64, URL and Hex encoding, plus AES encryption and decryption.',
    },
    '/dev/hash': {
      eyebrow: 'Hash',
      title: 'Hash & checksum tools',
      description: 'Compute MD5, SHA-1, SHA-256 and SHA-512 hashes.',
    },
    '/dev/jwt': {
      eyebrow: 'JWT',
      title: 'JWT decoder',
      description: 'Decode a JWT and inspect its header, payload and signature.',
    },
    '/dev/cron': {
      eyebrow: 'Cron',
      title: 'Cron expression tool',
      description: 'Parse and generate cron expressions.',
    },
    '/data/format': {
      eyebrow: 'Data',
      title: 'Data format converter',
      description: 'Convert between JSON, CSV, YAML, XML and other formats.',
    },
    '/data/sql': {
      eyebrow: 'SQL',
      title: 'SQL toolbox',
      description: 'Format, minify and lint SQL.',
    },
    '/data/mock': {
      eyebrow: 'Data',
      title: 'Mock data generator',
      description: 'Generate fake data for testing.',
    },
    '/utility/generate': {
      eyebrow: 'Generate',
      title: 'Generator toolbox',
      description: 'Generate UUIDs, passwords, random numbers, names and more.',
    },
    '/net/kit': {
      eyebrow: 'Network',
      title: 'Network toolbox',
      description: 'Look up IPs and DNS records, and parse URLs.',
    },
    '/net/qrcode': {
      eyebrow: 'QR',
      title: 'QR code toolbox',
      description: 'Generate and scan QR codes.',
    },
    '/net/share': {
      eyebrow: 'Share',
      title: 'Short links & sharing',
      description: 'Clean URLs, create short links and preview Open Graph metadata.',
    },
    '/life/daily': {
      eyebrow: 'Life',
      title: 'Everyday toolbox',
      description: 'BMI, countdowns, zodiac signs and other small everyday tools.',
    },
    '/fun/box': {
      eyebrow: 'Fun',
      title: 'Fun toolbox',
      description: 'Dice, coin flips, random draws and other small games.',
    },
  },
}
