declare module 'web-push' {
  interface VapidKeys {
    publicKey: string;
    privateKey: string;
  }

  interface PushSubscription {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }

  interface SendResult {
    statusCode: number;
    body: string;
    headers: Record<string, string>;
  }

  class WebPushError extends Error {
    constructor(message: string, statusCode: number, headers: Record<string, string>, body: string, endpoint: string);
    statusCode: number;
    headers: Record<string, string>;
    body: string;
    endpoint: string;
  }

  function setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  function sendNotification(subscription: PushSubscription, payload?: string): Promise<SendResult>;
  function generateVAPIDKeys(): VapidKeys;

  export {
    setVapidDetails,
    sendNotification,
    generateVAPIDKeys,
    WebPushError,
    PushSubscription,
    VapidKeys,
    SendResult
  };
}