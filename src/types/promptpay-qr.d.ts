declare module 'promptpay-qr' {
  interface PromptPayOptions {
    amount?: number;
  }

  function generatePayload(
    target: string,
    options?: PromptPayOptions
  ): string;

  export default generatePayload;
}
