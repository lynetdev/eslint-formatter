"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/workers/push-build.ts
var push_build_exports = {};
__export(push_build_exports, {
  pushBuild: () => pushBuild
});
module.exports = __toCommonJS(push_build_exports);
var import_node_crypto = require("crypto");
var import_synckit = require("synckit");
var LYNET_URL = process.env["LYNET_URL"] ?? "https://app.lynet.dev";
var makeResultFromResponse = async (response, errorPrefix, payload) => {
  if (!response.ok) {
    throw new Error(`${errorPrefix}`);
  }
  return {
    ok: response.ok,
    status: response.status,
    payload
  };
};
var makeResultFromJsonResponse = async (response, errorPrefix) => {
  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error(`${errorPrefix}: ${error == null ? void 0 : error.toString()}`);
  }
  if (payload && typeof payload === "object" && "error" in payload) {
    throw new Error(`${errorPrefix}`);
  }
  return makeResultFromResponse(response, errorPrefix, payload);
};
var getUploadUrl = async (projectToken, { payloadMD5, payloadLength }) => {
  const response = await fetch(`${LYNET_URL}/api/builds/upload-url`, {
    method: "get",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Build-Content-MD5": payloadMD5,
      "X-Build-Content-Length": payloadLength.toString(),
      "X-Project-Token": projectToken
    }
  });
  return makeResultFromJsonResponse(
    response,
    "Error while getting the upload URL"
  );
};
var upload = async (url, { payload, payloadMD5 }) => {
  const response = await fetch(url, {
    method: "put",
    headers: {
      "Content-MD5": payloadMD5
    },
    body: payload
  });
  return makeResultFromResponse(
    response,
    "Error while uploading the payload to S3",
    void 0
  );
};
var triggerProcessing = async ({
  projectToken,
  buildId
}) => {
  const response = await fetch(`${LYNET_URL}/api/builds/process`, {
    method: "post",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Project-Token": projectToken
    },
    body: JSON.stringify({ buildId })
  });
  return makeResultFromJsonResponse(
    response,
    "Error while triggering build processing"
  );
};
var pushBuild = (0, import_synckit.runAsWorker)(
  async (projectToken, payload) => {
    const payloadMD5 = (0, import_node_crypto.createHash)("md5").update(payload).digest("base64");
    const payloadLength = Buffer.byteLength(payload, "utf-8");
    const {
      payload: { uploadUrl, buildId }
    } = await getUploadUrl(projectToken, {
      payloadMD5,
      payloadLength
    });
    await upload(uploadUrl, { payload, payloadMD5 });
    return triggerProcessing({ projectToken, buildId });
  }
);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  pushBuild
});
