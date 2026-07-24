import { createHash, createSign, createVerify } from "node:crypto";

export function buildDigest(body) {
  return `SHA-256=${createHash("sha256").update(body).digest("base64")}`;
}

export function buildSigningString({ path, host, date, digest }) {
  return [`(request-target): post ${path}`, `host: ${host}`, `date: ${date}`, `digest: ${digest}`].join("\n");
}

export function signRequest({ privateKeyPem, url, body, keyId }) {
  const { pathname, search, host } = new URL(url);
  const date = new Date().toUTCString();
  const digest = buildDigest(body);
  const signingString = buildSigningString({
    path: `${pathname}${search}`,
    host,
    date,
    digest
  });
  const signer = createSign("RSA-SHA256");
  signer.update(signingString);
  signer.end();
  const signature = signer.sign(privateKeyPem).toString("base64");
  return {
    Host: host,
    Date: date,
    Digest: digest,
    Signature: `keyId="${keyId}",algorithm="rsa-sha256",headers="(request-target) host date digest",signature="${signature}"`,
    Accept: "application/activity+json",
    "Content-Type": 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
  };
}

export function parseSignatureHeader(value) {
  if (!value) {
    return null;
  }

  return Object.fromEntries(
    value.split(",").map((part) => {
      const [key, raw] = part.split("=");
      return [key.trim(), raw?.trim()?.replace(/^"|"$/g, "")];
    })
  );
}

export function verifySignature({ publicKeyPem, signatureHeader, signingString }) {
  const parsed = parseSignatureHeader(signatureHeader);
  if (!parsed?.signature || !publicKeyPem) {
    return false;
  }

  const verifier = createVerify("RSA-SHA256");
  verifier.update(signingString);
  verifier.end();
  return verifier.verify(publicKeyPem, Buffer.from(parsed.signature, "base64"));
}
