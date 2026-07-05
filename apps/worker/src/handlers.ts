/**
 * Simulated job handlers for demo/testing.
 *
 * Each handler takes a payload and returns a result or throws an error.
 * Random failures are built in so retry and DLQ flows can be demonstrated.
 */

export interface HandlerResult {
  success: boolean;
  result?: any;
  error?: string;
}

type JobHandler = (payload: any) => Promise<HandlerResult>;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * send_email: ~2s execution, ~10% random failure rate
 */
async function sendEmailHandler(payload: any): Promise<HandlerResult> {
  console.log(`  [send_email] Sending email to: ${payload.to || 'unknown'}`);
  await sleep(2000);

  if (Math.random() < 0.1) {
    throw new Error('SMTP connection timeout: failed to send email');
  }

  return {
    success: true,
    result: {
      messageId: `msg_${Date.now()}`,
      to: payload.to || 'user@example.com',
      sentAt: new Date().toISOString(),
    },
  };
}

/**
 * process_image: ~5s execution, ~15% random failure rate
 */
async function processImageHandler(payload: any): Promise<HandlerResult> {
  console.log(`  [process_image] Processing image: ${payload.filename || 'unknown'}`);
  await sleep(5000);

  if (Math.random() < 0.15) {
    throw new Error('Image processing failed: corrupt file or out of memory');
  }

  return {
    success: true,
    result: {
      originalFile: payload.filename || 'image.png',
      processedFile: `processed_${payload.filename || 'image.png'}`,
      dimensions: '1920x1080',
      sizeKb: Math.floor(Math.random() * 5000) + 500,
    },
  };
}

/**
 * generate_report: ~3s execution, always succeeds
 */
async function generateReportHandler(payload: any): Promise<HandlerResult> {
  console.log(`  [generate_report] Generating report: ${payload.reportType || 'summary'}`);
  await sleep(3000);

  return {
    success: true,
    result: {
      reportType: payload.reportType || 'summary',
      generatedAt: new Date().toISOString(),
      pageCount: Math.floor(Math.random() * 50) + 5,
      format: payload.format || 'pdf',
    },
  };
}

/**
 * Default handler for unknown job types — simulates 1s execution, always succeeds
 */
async function defaultHandler(payload: any): Promise<HandlerResult> {
  console.log(`  [default] Executing generic job`);
  await sleep(1000);

  return {
    success: true,
    result: { payload, executedAt: new Date().toISOString() },
  };
}

// ─── Handler registry ───────────────────────────────────────────────────────────

const handlers: Record<string, JobHandler> = {
  send_email: sendEmailHandler,
  process_image: processImageHandler,
  generate_report: generateReportHandler,
};

/**
 * Get the handler for a given job type. Falls back to defaultHandler.
 */
export function getHandler(jobType: string): JobHandler {
  return handlers[jobType] || defaultHandler;
}
