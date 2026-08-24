// TextEncoder only supports UTF-8. These are the Windows-1252 characters outside
// Latin-1 whose original byte cannot be recovered directly from the code point.
const WINDOWS_1252_EXTENSION_BYTES: Record<string, number> = {
  '€': 0x80,
  '‚': 0x82,
  ƒ: 0x83,
  '„': 0x84,
  '…': 0x85,
  '†': 0x86,
  '‡': 0x87,
  ˆ: 0x88,
  '‰': 0x89,
  Š: 0x8a,
  '‹': 0x8b,
  Œ: 0x8c,
  Ž: 0x8e,
  '‘': 0x91,
  '’': 0x92,
  '“': 0x93,
  '”': 0x94,
  '•': 0x95,
  '–': 0x96,
  '—': 0x97,
  '˜': 0x98,
  '™': 0x99,
  š: 0x9a,
  '›': 0x9b,
  œ: 0x9c,
  ž: 0x9e,
  Ÿ: 0x9f,
};

const utf8Decoder = new TextDecoder('utf-8', { fatal: true });

function getWindows1252Byte(character: string): number | undefined {
  const mappedByte = WINDOWS_1252_EXTENSION_BYTES[character];
  if (mappedByte !== undefined) {
    return mappedByte;
  }

  const codePoint = character.codePointAt(0);
  return codePoint !== undefined && codePoint <= 0xff ? codePoint : undefined;
}

function getUtf8SequenceLength(firstByte: number): number | undefined {
  if (firstByte >= 0xc2 && firstByte <= 0xdf) {
    return 2;
  }
  if (firstByte >= 0xe0 && firstByte <= 0xef) {
    return 3;
  }
  if (firstByte >= 0xf0 && firstByte <= 0xf4) {
    return 4;
  }
  return undefined;
}

export function repairUtf8Mojibake(value: string): string {
  let repaired = '';

  for (let index = 0; index < value.length; index += 1) {
    const firstByte = getWindows1252Byte(value[index]);
    const sequenceLength = firstByte === undefined ? undefined : getUtf8SequenceLength(firstByte);

    if (firstByte === undefined || sequenceLength === undefined || index + sequenceLength > value.length) {
      repaired += value[index];
      continue;
    }

    const bytes = [firstByte];
    for (let offset = 1; offset < sequenceLength; offset += 1) {
      const byte = getWindows1252Byte(value[index + offset]);
      if (byte === undefined || byte < 0x80 || byte > 0xbf) {
        break;
      }
      bytes.push(byte);
    }

    if (bytes.length !== sequenceLength) {
      repaired += value[index];
      continue;
    }

    try {
      repaired += utf8Decoder.decode(Uint8Array.from(bytes));
      index += sequenceLength - 1;
    } catch {
      repaired += value[index];
    }
  }

  return repaired;
}

export function formatHtmlAsPlainText(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n')
    .replace(/<p(?:\s[^>]*)?>/gi, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
