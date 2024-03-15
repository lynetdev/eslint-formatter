import { createHash } from "node:crypto";
import { runAsWorker } from "synckit";

const LYNET_URL = process.env["LYNET_URL"] ?? "https://app.lynet.dev";

type Result<T> = {
  ok: boolean;
  status: number; // true if status code is in the range 200-299
  payload: T;
};

const makeResultFromResponse = async <T>(
  response: Response,
  errorPrefix: string,
  payload: T,
): Promise<Result<T>> => {
  if (!response.ok) {
    throw new Error(`${errorPrefix}`);
  }

  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
};

const makeResultFromJsonResponse = async <T>(
  response: Response,
  errorPrefix: string,
): Promise<Result<T>> => {
  let payload;

  try {
    payload = await response.json();
  } catch (error) {
    throw new Error(`${errorPrefix}: ${error?.toString()}`);
  }

  if (payload && typeof payload === "object" && "error" in payload) {
    throw new Error(`${errorPrefix}`);
  }

  return makeResultFromResponse(response, errorPrefix, payload);
};

const getUploadUrl = async (
  projectToken: string,
  { payloadMD5, payloadLength }: { payloadMD5: string; payloadLength: number },
): Promise<Result<{ uploadUrl: string; buildId: string }>> => {
  const response = await fetch(`${LYNET_URL}/api/builds/upload-url`, {
    method: "get",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Build-Content-MD5": payloadMD5,
      "X-Build-Content-Length": payloadLength.toString(),
      "X-Project-Token": projectToken,
    },
  });

  return makeResultFromJsonResponse<{ uploadUrl: string; buildId: string }>(
    response,
    "Error while getting the upload URL",
  );
};

const upload = async (
  url: string,
  { payload, payloadMD5 }: { payload: Buffer; payloadMD5: string },
) => {
  const response = await fetch(url, {
    method: "put",
    headers: {
      "Content-MD5": payloadMD5,
    },
    body: payload,
  });

  return makeResultFromResponse(
    response,
    "Error while uploading the payload to S3",
    undefined,
  );
};

const triggerProcessing = async ({
  projectToken,
  buildId,
}: {
  projectToken: string;
  buildId: string;
}) => {
  const response = await fetch(`${LYNET_URL}/api/builds/process`, {
    method: "post",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Project-Token": projectToken,
    },
    body: JSON.stringify({ buildId }),
  });

  return makeResultFromJsonResponse<{ traceId: string; buildId: string }>(
    response,
    "Error while triggering build processing",
  );
};

export const pushBuild = runAsWorker(
  async (projectToken: string, payload: Buffer) => {
    const payloadMD5 = createHash("md5").update(payload).digest("base64");
    const payloadLength = Buffer.byteLength(payload, "utf-8");

    const {
      payload: { uploadUrl, buildId },
    } = await getUploadUrl(projectToken, {
      payloadMD5,
      payloadLength,
    });

    await upload(uploadUrl, { payload, payloadMD5 });

    return triggerProcessing({ projectToken, buildId });
  },
);
