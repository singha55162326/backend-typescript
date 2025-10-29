declare module 'html-pdf' {
  interface CreateOptions {
    format?: string;
    orientation?: string;
    width?: string | number;
    height?: string | number;
    border?: string | object;
    header?: object;
    footer?: object;
    zoomFactor?: number;
    type?: string;
    quality?: number;
    timeout?: number;
    httpHeaders?: object;
    cookies?: Array<object> | object;
  }

  interface FileOptions {
    filename?: string;
    format?: string;
    orientation?: string;
    width?: string | number;
    height?: string | number;
    border?: string | object;
    header?: object;
    footer?: object;
    zoomFactor?: number;
    type?: string;
    quality?: number;
    timeout?: number;
  }

  interface ServerOptions {
    port?: number;
    address?: string;
    host?: string;
  }

  interface HtmlPdf {
    create(html: string, options?: CreateOptions): HtmlPdfInstance;
  }

  interface HtmlPdfInstance {
    toBuffer(callback: (err: Error, buffer: Buffer) => void): void;
    toFile(filename: string, callback: (err: Error, res: FileResult) => void): void;
    toStream(callback: (err: Error, stream: NodeJS.ReadableStream) => void): void;
  }

  interface FileResult {
    filename: string;
  }

  const pdf: HtmlPdf;
  export = pdf;
}