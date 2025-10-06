// Test file for TypeScript enums and advanced types

// Numeric enum
enum NumericEnum {
  First,      // 0
  Second,     // 1
  Third = 10, // 10
  Fourth      // 11
}

// String enum
enum StringEnum {
  Red = 'RED',
  Green = 'GREEN',
  Blue = 'BLUE'
}

// Heterogeneous enum (mixed)
enum MixedEnum {
  No = 0,
  Yes = 'YES'
}

// Const enum (inlined at compile time)
const enum ConstEnum {
  A = 1,
  B = 2,
  C = 3
}

// Computed enum members
enum ComputedEnum {
  Base = 10,
  Double = Base * 2,
  Triple = Base * 3,
  Expression = 1 << 2
}

// Enum with methods (using namespace merging)
enum ColorEnum {
  Red = '#FF0000',
  Green = '#00FF00',
  Blue = '#0000FF'
}

namespace ColorEnum {
  export function toRGB(color: ColorEnum): [number, number, number] {
    const hex = color.substring(1);
    return [
      parseInt(hex.substring(0, 2), 16),
      parseInt(hex.substring(2, 4), 16),
      parseInt(hex.substring(4, 6), 16)
    ];
  }
  
  export function random(): ColorEnum {
    const values = Object.values(ColorEnum).filter(v => typeof v === 'string');
    return values[Math.floor(Math.random() * values.length)] as ColorEnum;
  }
}

// Reverse mapping (numeric enums only)
enum ReverseEnum {
  A = 1,
  B,
  C
}

// Usage: ReverseEnum[1] === 'A'

// Ambient enum (declaration only)
declare enum AmbientEnum {
  A = 1,
  B,
  C
}

// String literal union (enum alternative)
type Direction = 'North' | 'South' | 'East' | 'West';

// Using const assertion for enum-like object
const Colors = {
  Red: '#FF0000',
  Green: '#00FF00',
  Blue: '#0000FF'
} as const;

type ColorKeys = keyof typeof Colors;
type ColorValues = typeof Colors[ColorKeys];

// Discriminated union with literal types
type SuccessResponse = {
  status: 'success';
  data: any;
};

type ErrorResponse = {
  status: 'error';
  error: string;
  code: number;
};

type LoadingResponse = {
  status: 'loading';
  progress?: number;
};

type ApiResponse = SuccessResponse | ErrorResponse | LoadingResponse;

// Type predicates with enums
function isSuccess(response: ApiResponse): response is SuccessResponse {
  return response.status === 'success';
}

// Enum-like pattern with class
class StatusCode {
  static readonly OK = new StatusCode(200, 'OK');
  static readonly NOT_FOUND = new StatusCode(404, 'Not Found');
  static readonly SERVER_ERROR = new StatusCode(500, 'Internal Server Error');
  
  private constructor(
    public readonly code: number,
    public readonly message: string
  ) {}
  
  toString(): string {
    return `${this.code}: ${this.message}`;
  }
}

// Bitwise flag enum
enum Permission {
  None = 0,
  Read = 1 << 0,    // 1
  Write = 1 << 1,   // 2
  Execute = 1 << 2, // 4
  All = Read | Write | Execute // 7
}

// Check permissions
function hasPermission(userPerms: Permission, required: Permission): boolean {
  return (userPerms & required) === required;
}

// Advanced enum patterns
namespace AdvancedEnum {
  // Enum with metadata
  export enum FileType {
    Text = 'text',
    Image = 'image',
    Video = 'video',
    Audio = 'audio'
  }
  
  export const FileTypeMetadata = {
    [FileType.Text]: {
      extensions: ['.txt', '.md', '.log'],
      mimeTypes: ['text/plain', 'text/markdown']
    },
    [FileType.Image]: {
      extensions: ['.jpg', '.png', '.gif'],
      mimeTypes: ['image/jpeg', 'image/png', 'image/gif']
    },
    [FileType.Video]: {
      extensions: ['.mp4', '.avi', '.mov'],
      mimeTypes: ['video/mp4', 'video/x-msvideo']
    },
    [FileType.Audio]: {
      extensions: ['.mp3', '.wav', '.ogg'],
      mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg']
    }
  };
  
  export function getExtensions(type: FileType): string[] {
    return FileTypeMetadata[type].extensions;
  }
}

// Enum iteration
function* iterateEnum<T extends object>(enumObj: T): Generator<T[keyof T]> {
  for (const key in enumObj) {
    if (isNaN(Number(key))) {
      yield enumObj[key];
    }
  }
}

// Type-safe enum keys
type EnumKeys<T> = keyof T;
type NumericEnumKeys = EnumKeys<typeof NumericEnum>;

// Export enums and types
export {
  NumericEnum,
  StringEnum,
  MixedEnum,
  ConstEnum,
  ComputedEnum,
  ColorEnum,
  Direction,
  ApiResponse,
  Permission,
  StatusCode,
  AdvancedEnum
};

export type { SuccessResponse, ErrorResponse, LoadingResponse };